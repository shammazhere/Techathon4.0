"""
wildfire_agent.py
-----------------
LangGraph agent that:
  1. Loads TFRecord wildfire patches (no TF required)
  2. Extracts wind / elevation / NDVI / PrevFireMask per patch
  3. Runs FireSpreadSimulator on a synthetic grid
  4. Predicts next-day fire spread vs dataset FireMask ground truth
  5. Renders a matplotlib map + updates wildfire HTML dashboard
"""

import struct, math, random, time, sys, logging
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import matplotlib.patches as mpatches
from typing import TypedDict, List, Tuple, Optional
from langgraph.graph import StateGraph, END

logging.basicConfig(level=logging.WARNING)

# ── TFRecord reader (no TensorFlow needed) ─────────────────────────

TFRECORD_PATH = (
    r"C:\Users\Minora Dias\.cache\kagglehub\datasets\fantineh"
    r"\next-day-wildfire-spread\versions\2"
    r"\next_day_wildfire_spread_train_00.tfrecord"
)
PATCH = 64          # spatial patch size
MAX_PATCHES = 20    # how many patches to scan for active fire
SIM_STEPS = 8       # fire-spread steps to simulate

# ── helpers ────────────────────────────────────────────────────────

def _varint(buf, pos):
    r, s = 0, 0
    while True:
        b = buf[pos]; pos += 1
        r |= (b & 0x7F) << s
        if not (b & 0x80): break
        s += 7
    return r, pos

def _len_delim(buf, pos):
    n, pos = _varint(buf, pos)
    return buf[pos:pos+n], pos+n

def _floats(data):
    n = len(data)//4
    return list(struct.unpack(f"<{n}f", data[:n*4]))

def iter_records(path):
    with open(path, "rb") as f:
        while True:
            h = f.read(8)
            if not h: break
            n = struct.unpack("<Q", h)[0]
            f.read(4); data = f.read(n); f.read(4)
            yield data

def parse_example(raw):
    result = {}
    def parse_feat(buf):
        pos = 0
        while pos < len(buf):
            t, pos = _varint(buf, pos)
            fn, wt = t >> 3, t & 7
            if wt == 2:
                pay, pos = _len_delim(buf, pos)
                if fn == 1: parse_entry(pay)
            elif wt == 0: _, pos = _varint(buf, pos)
            elif wt == 1: pos += 8
            elif wt == 5: pos += 4
            else: break
    def parse_entry(buf):
        key = None; fdata = None
        pos = 0
        while pos < len(buf):
            t, pos = _varint(buf, pos)
            fn, wt = t >> 3, t & 7
            if wt == 2:
                pay, pos = _len_delim(buf, pos)
                if fn == 1: key = pay.decode("utf-8","replace")
                elif fn == 2: fdata = pay
            elif wt == 0: _, pos = _varint(buf, pos)
            elif wt == 1: pos += 8
            elif wt == 5: pos += 4
            else: break
        if not key or fdata is None: return
        pos2 = 0
        while pos2 < len(fdata):
            t, pos2 = _varint(fdata, pos2)
            fn2, wt2 = t >> 3, t & 7
            if wt2 == 2:
                pay2, pos2 = _len_delim(fdata, pos2)
                if fn2 == 2:
                    vals = []
                    p = 0
                    while p < len(pay2):
                        t2, p = _varint(pay2, p)
                        wt3 = t2 & 7
                        if wt3 == 2:
                            d, p = _len_delim(pay2, p); vals.extend(_floats(d))
                        elif wt3 == 5:
                            vals.append(struct.unpack("<f", pay2[p:p+4])[0]); p += 4
                        elif wt3 == 0: _, p = _varint(pay2, p)
                        else: p += 1
                    result[key] = np.array(vals, dtype=np.float32)
            elif wt2 == 0: _, pos2 = _varint(fdata, pos2)
            elif wt2 == 1: pos2 += 8
            elif wt2 == 5: pos2 += 4
            else: break
    pos = 0
    while pos < len(raw):
        t, pos = _varint(raw, pos)
        fn, wt = t >> 3, t & 7
        if wt == 2:
            pay, pos = _len_delim(raw, pos)
            if fn == 1: parse_feat(pay)
        elif wt == 0: _, pos = _varint(raw, pos)
        elif wt == 1: pos += 8
        elif wt == 5: pos += 4
        else: break
    return result

# ── fire spread on grid (no graph needed) ─────────────────────────

def spread_prob(slope, wind_spd, wind_bear, edge_bear, fuel):
    if fuel <= 0: return 0.0
    sf = 1.0 + max(slope / 30.0, 0.0)
    diff = abs((edge_bear - wind_bear + 360) % 360)
    if diff > 180: diff = 360 - diff
    wf = 1.0 + (wind_spd / 10.0) * max(math.cos(math.radians(diff)), 0.0)
    return min(0.08 * sf * wf * fuel, 1.0)

def simulate_fire(prev_mask, ndvi, elev, vs_grid, th_grid, steps):
    """Run cellular automaton fire spread on 64x64 grid."""
    BURNING, BURNED, UNBURNED = 2, 3, 0
    state = np.zeros((PATCH, PATCH), dtype=np.int8)
    state[prev_mask > 0] = BURNING
    countdown = np.full((PATCH, PATCH), 3, dtype=np.int8)

    # Fuel from NDVI: normalise 0-1 (capped)
    fuel = np.clip((ndvi / 10000.0), 0, 1)

    history = []
    for _ in range(steps):
        new_state = state.copy()
        burning_ys, burning_xs = np.where(state == BURNING)
        for cy, cx in zip(burning_ys, burning_xs):
            ws = float(vs_grid[cy, cx])
            wd = float(th_grid[cy, cx])
            el = float(elev[cy, cx])
            for dy, dx in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]:
                ny, nx = cy+dy, cx+dx
                if not (0 <= ny < PATCH and 0 <= nx < PATCH): continue
                if state[ny, nx] in (BURNING, BURNED): continue
                nb_el = float(elev[ny, nx])
                slope = math.degrees(math.atan2(nb_el - el, 30.0))
                bear = (math.degrees(math.atan2(dx, -dy)) + 360) % 360
                p = spread_prob(slope, ws, wd, bear, float(fuel[ny, nx]))
                if random.random() < p:
                    new_state[ny, nx] = BURNING
            countdown[cy, cx] -= 1
            if countdown[cy, cx] <= 0:
                new_state[cy, cx] = BURNED
        state = new_state
        history.append(state.copy())
    return state, history

# ══════════════════════════════════════════════════════════════════
#  LangGraph State
# ══════════════════════════════════════════════════════════════════

class AgentState(TypedDict):
    patches: List[dict]           # raw parsed feature dicts
    active_patch: Optional[dict]  # patch chosen for simulation
    patch_idx: int
    sim_result: Optional[np.ndarray]
    sim_history: List[np.ndarray]
    ground_truth: Optional[np.ndarray]
    accuracy: float
    wind_speed: float
    wind_dir: float
    report: str

# ══════════════════════════════════════════════════════════════════
#  Nodes
# ══════════════════════════════════════════════════════════════════

def load_data(state: AgentState) -> AgentState:
    """Node 1 — Load TFRecord patches."""
    print("\n[Agent] Loading TFRecord patches...")
    patches = []
    for i, raw in enumerate(iter_records(TFRECORD_PATH)):
        if i >= MAX_PATCHES: break
        p = parse_example(raw)
        # only keep patches with float features of right size
        if all(k in p and p[k].size == PATCH*PATCH
               for k in ("PrevFireMask","FireMask","NDVI","elevation","vs","th")):
            patches.append({k: p[k].reshape(PATCH, PATCH) for k in p if p[k].size == PATCH*PATCH})
    print(f"[Agent] Loaded {len(patches)} valid patches")
    return {**state, "patches": patches}


def select_patch(state: AgentState) -> AgentState:
    """Node 2 — Pick the patch with the most active fire."""
    print("[Agent] Selecting most active fire patch...")
    best, best_idx, best_fire = None, 0, -1
    for i, p in enumerate(state["patches"]):
        n = int((p["PrevFireMask"] > 0).sum())
        if n > best_fire:
            best_fire, best, best_idx = n, p, i

    if best is None or best_fire == 0:
        # fallback: use first patch, seed centre
        best = state["patches"][0]
        best["PrevFireMask"][30:34, 30:34] = 1.0
        best_idx = 0

    ws = float(best["vs"].mean())
    wd = float(best["th"].mean())
    print(f"[Agent] Patch {best_idx}: {best_fire} fire pixels | wind {ws:.1f}m/s @ {wd:.0f}°")
    return {**state, "active_patch": best, "patch_idx": best_idx,
            "wind_speed": ws, "wind_dir": wd}


def run_simulation(state: AgentState) -> AgentState:
    """Node 3 — Run fire spread simulation."""
    print(f"[Agent] Running {SIM_STEPS}-step fire spread simulation...")
    p = state["active_patch"]
    result, history = simulate_fire(
        p["PrevFireMask"], p["NDVI"], p["elevation"],
        p["vs"], p["th"], SIM_STEPS
    )
    return {**state, "sim_result": result, "sim_history": history,
            "ground_truth": p["FireMask"]}


def evaluate(state: AgentState) -> AgentState:
    """Node 4 — Compare prediction vs FireMask ground truth."""
    print("[Agent] Evaluating prediction accuracy...")
    pred = (state["sim_result"] >= 2).astype(np.uint8)   # BURNING or BURNED
    gt   = (state["ground_truth"] > 0).astype(np.uint8)

    tp = int(np.logical_and(pred, gt).sum())
    fp = int(np.logical_and(pred, ~gt.astype(bool)).sum())
    fn = int(np.logical_and(~pred.astype(bool), gt).sum())
    tn = int(np.logical_and(~pred.astype(bool), ~gt.astype(bool)).sum())

    precision = tp / max(tp + fp, 1)
    recall    = tp / max(tp + fn, 1)
    f1        = 2 * precision * recall / max(precision + recall, 1e-9)
    accuracy  = (tp + tn) / (PATCH * PATCH)

    report = (
        f"Patch #{state['patch_idx']} | Steps: {SIM_STEPS}\n"
        f"Wind: {state['wind_speed']:.1f} m/s @ {state['wind_dir']:.0f}°\n"
        f"Accuracy : {accuracy*100:.1f}%\n"
        f"Precision: {precision*100:.1f}%\n"
        f"Recall   : {recall*100:.1f}%\n"
        f"F1 Score : {f1*100:.1f}%\n"
        f"TP={tp} FP={fp} FN={fn} TN={tn}"
    )
    print("[Agent] " + report.replace("\n", " | "))
    return {**state, "accuracy": accuracy, "report": report}


def visualize(state: AgentState) -> AgentState:
    """Node 5 — Render 4-panel matplotlib figure."""
    print("[Agent] Rendering visualization...")
    p     = state["active_patch"]
    pred  = state["sim_result"]
    gt    = state["ground_truth"]
    hist  = state["sim_history"]

    fig, axes = plt.subplots(2, 2, figsize=(10, 8))
    fig.patch.set_facecolor("#0d1117")
    fig.suptitle(
        "CIVIC AUTOPILOT  ◆  WILDFIRE PREDICTION AGENT\n"
        f"NASA Next-Day Wildfire Spread Dataset  |  Patch #{state['patch_idx']}  |  "
        f"Wind {state['wind_speed']:.1f} m/s @ {state['wind_dir']:.0f}°",
        color="white", fontsize=12, fontweight="bold", y=0.98
    )

    panel_cfg = [
        (axes[0,0], p["PrevFireMask"],  "PREVIOUS DAY FIRE STATE",    "hot_r"),
        (axes[0,1], gt,                 "GROUND TRUTH  (FireMask)",   "hot_r"),
        (axes[1,0], pred.astype(float), "AI PREDICTION  (simulated)", "plasma"),
        (axes[1,1], p["NDVI"] / 10000,  "NDVI  (vegetation / fuel)",  "YlGn"),
    ]

    for ax, data, title, cmap in panel_cfg:
        ax.set_facecolor("#0d1117")
        im = ax.imshow(data, cmap=cmap, interpolation="nearest")
        ax.set_title(title, color="white", fontsize=9, fontweight="bold", pad=8)
        cb = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
        cb.ax.yaxis.set_tick_params(color="white")
        plt.setp(cb.ax.yaxis.get_ticklabels(), color="white")
        ax.tick_params(colors="gray")
        for sp in ax.spines.values(): sp.set_edgecolor("#334455")

    # Overlay contour of prediction on ground truth panel
    ax_gt = axes[0, 1]
    try:
        ax_gt.contour(pred.astype(float), levels=[0.5], colors=["#00ff88"], linewidths=1.5, alpha=0.8)
        ax_gt.text(2, 4, "— AI pred outline", color="#00ff88", fontsize=7)
    except Exception:
        pass

    # Spread timeline inset on prediction panel
    ax_pred = axes[1, 0]
    steps_fire = [(h >= 2).sum() for h in hist]
    ax_ins = ax_pred.inset_axes([0.62, 0.02, 0.36, 0.28])
    ax_ins.plot(range(1, len(steps_fire)+1), steps_fire, color="#ff6b35", linewidth=1.5, marker="o", markersize=3)
    ax_ins.set_facecolor("#1a2332")
    ax_ins.tick_params(colors="white", labelsize=6)
    for sp in ax_ins.spines.values(): sp.set_edgecolor("#334455")
    ax_ins.set_title("spread", color="white", fontsize=6)

    # Stats text on prediction panel
    ax_pred.text(1, PATCH-2, state["report"], color="white", fontsize=6.5, va="bottom",
                 bbox=dict(boxstyle="round,pad=0.4", facecolor="#1a2332", edgecolor="#334455", alpha=0.9))

    plt.tight_layout(rect=[0, 0, 1, 0.95])
    out = "wildfire_prediction.png"
    plt.savefig(out, dpi=90, bbox_inches="tight", facecolor="#0d1117")
    plt.close()
    print(f"[Agent] Saved → {out}")

    # ── HTML dashboard snippet ──────────────────────────────────────
    pred_bin = (pred >= 2).astype(np.uint8)
    gt_bin   = (state["ground_truth"] > 0).astype(np.uint8)
    tp = int(np.logical_and(pred_bin, gt_bin).sum())
    fp = int(np.logical_and(pred_bin, ~gt_bin.astype(bool)).sum())
    fn = int(np.logical_and(~pred_bin.astype(bool), gt_bin).sum())
    acc_pct = state["accuracy"] * 100
    fire_px  = int((pred_bin).sum())
    gt_px    = int((gt_bin).sum())

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Civic Autopilot — Wildfire Prediction</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:#0d1117;color:#e6edf3;font-family:'Segoe UI',system-ui,sans-serif;padding:24px}}
  h1{{font-size:20px;font-weight:700;color:#fff;margin-bottom:4px}}
  .sub{{font-size:12px;color:#8b949e;margin-bottom:24px}}
  .grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px}}
  .card{{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px 20px}}
  .label{{font-size:10px;color:#8b949e;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}}
  .value{{font-size:24px;font-weight:600}}
  .green{{color:#3fb950}} .red{{color:#f85149}} .amber{{color:#e3b341}} .blue{{color:#58a6ff}}
  .badge{{display:inline-block;font-size:11px;font-weight:500;padding:3px 10px;border-radius:20px;margin:3px 3px 0 0}}
  .bg{{background:#1f6feb22;color:#58a6ff;border:1px solid #1f6feb66}}
  .gr{{background:#2ea04322;color:#3fb950;border:1px solid #2ea04366}}
  .rd{{background:#da363322;color:#f85149;border:1px solid #da363366}}
  img{{width:100%;border-radius:10px;border:1px solid #30363d;margin-top:8px}}
  .bar-wrap{{background:#21262d;border-radius:4px;height:8px;margin-top:8px;overflow:hidden}}
  .bar{{height:100%;border-radius:4px;background:#3fb950;transition:width .4s}}
  .section{{margin-bottom:20px}}
  .section-title{{font-size:13px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #21262d}}
</style>
</head>
<body>
<h1>🔥 Civic Autopilot — Wildfire Prediction Agent</h1>
<p class="sub">NASA Next-Day Wildfire Spread Dataset · LangGraph Agent · Patch #{state["patch_idx"]} · {SIM_STEPS} simulation steps</p>

<div class="grid">
  <div class="card">
    <div class="label">Prediction Accuracy</div>
    <div class="value green">{acc_pct:.1f}%</div>
    <div class="bar-wrap"><div class="bar" style="width:{min(acc_pct,100):.0f}%"></div></div>
  </div>
  <div class="card">
    <div class="label">Predicted Fire Pixels</div>
    <div class="value red">{fire_px}</div>
    <div style="font-size:12px;color:#8b949e;margin-top:4px">of {PATCH*PATCH} total cells</div>
  </div>
  <div class="card">
    <div class="label">Ground Truth Fire Pixels</div>
    <div class="value amber">{gt_px}</div>
    <div style="font-size:12px;color:#8b949e;margin-top:4px">NASA FireMask label</div>
  </div>
  <div class="card">
    <div class="label">Wind Conditions</div>
    <div class="value blue">{state["wind_speed"]:.1f} m/s</div>
    <div style="font-size:12px;color:#8b949e;margin-top:4px">@ {state["wind_dir"]:.0f}° bearing</div>
  </div>
</div>

<div class="grid" style="grid-template-columns:repeat(3,1fr)">
  <div class="card">
    <div class="label">True Positives</div>
    <div class="value green">{tp}</div>
  </div>
  <div class="card">
    <div class="label">False Positives</div>
    <div class="value amber">{fp}</div>
  </div>
  <div class="card">
    <div class="label">False Negatives</div>
    <div class="value red">{fn}</div>
  </div>
</div>

<div class="section" style="margin-top:20px">
  <div class="section-title">Prediction Map</div>
  <img src="wildfire_prediction.png" alt="Wildfire Prediction Map">
</div>

<div class="section">
  <div class="section-title">Data Pipeline</div>
  <span class="badge gr">✓ TFRecord Loaded</span>
  <span class="badge gr">✓ Features Extracted</span>
  <span class="badge gr">✓ FireSpread Simulated</span>
  <span class="badge gr">✓ Evaluated vs FireMask</span>
  <span class="badge bg">Wind: vs + th features</span>
  <span class="badge bg">Fuel: NDVI</span>
  <span class="badge bg">Slope: elevation</span>
</div>
</body></html>"""

    with open("wildfire_intelligence.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("[Agent] Dashboard → wildfire_intelligence.html")
    return state


# ══════════════════════════════════════════════════════════════════
#  Build LangGraph
# ══════════════════════════════════════════════════════════════════

def build_agent():
    g = StateGraph(AgentState)
    g.add_node("load_data",      load_data)
    g.add_node("select_patch",   select_patch)
    g.add_node("run_simulation", run_simulation)
    g.add_node("evaluate",       evaluate)
    g.add_node("visualize",      visualize)

    g.set_entry_point("load_data")
    g.add_edge("load_data",      "select_patch")
    g.add_edge("select_patch",   "run_simulation")
    g.add_edge("run_simulation", "evaluate")
    g.add_edge("evaluate",       "visualize")
    g.add_edge("visualize",      END)

    return g.compile()


if __name__ == "__main__":
    print("\n" + "="*55)
    print("  CIVIC AUTOPILOT  ◆  WILDFIRE PREDICTION AGENT")
    print("="*55)

    agent = build_agent()
    initial: AgentState = {
        "patches": [], "active_patch": None, "patch_idx": 0,
        "sim_result": None, "sim_history": [], "ground_truth": None,
        "accuracy": 0.0, "wind_speed": 0.0, "wind_dir": 0.0, "report": ""
    }

    t0 = time.time()
    final = agent.invoke(initial)
    print(f"\n  Done in {time.time()-t0:.1f}s")
    print(f"  Map  → wildfire_prediction.png")
    print(f"  HTML → wildfire_intelligence.html")
    print("="*55 + "\n")
