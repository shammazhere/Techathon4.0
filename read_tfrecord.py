"""
read_tfrecord.py
────────────────────────────────────────────────────────────────────
Reads the Next-Day Wildfire Spread TFRecord files WITHOUT needing
TensorFlow installed.

TFRecord format:
  Each record = uint64 length  (8 bytes)
               + uint32 masked CRC of length (4 bytes)
               + <data bytes>
               + uint32 masked CRC of data  (4 bytes)

The <data bytes> is a serialised tf.train.Example protobuf,
which we parse with the `protobuf` library (already installed).
────────────────────────────────────────────────────────────────────
"""

import struct
import struct
import numpy as np
from google.protobuf import descriptor_pb2

# ── protobuf: parse tf.train.Example manually ─────────────────────
# We reconstruct the proto message on-the-fly using a minimal proto
# descriptor instead of depending on tensorflow.

# The tf.train.Example proto is:
#   message BytesList   { repeated bytes  value = 1; }
#   message FloatList   { repeated float  value = 1 [packed=true]; }
#   message Int64List   { repeated int64  value = 1 [packed=true]; }
#   message Feature {
#     oneof kind {
#       BytesList  bytes_list  = 1;
#       FloatList  float_list  = 2;
#       Int64List  int64_list  = 3;
#     }
#   }
#   message Features { map<string, Feature> feature = 1; }
#   message Example  { Features features = 1; }

# Rather than pulling in tensorflow just for the proto, we use the
# pure-python protobuf decoder below.

# ── lightweight TFRecord reader ────────────────────────────────────

def _masked_crc32c(data: bytes) -> int:
    """CRC32C with the TFRecord masking applied."""
    import struct
    # Python's binascii.crc32 is CRC32 (not CRC32C), but TFRecords
    # use a masked CRC.  We skip CRC verification for simplicity.
    return 0  # placeholder — no verification needed for reading


def read_tfrecords(path: str):
    """
    Generator that yields raw bytes for each record in a TFRecord file.
    Format per record:
        uint64  data_length
        uint32  masked_crc32_of_length
        bytes   data  (data_length bytes)
        uint32  masked_crc32_of_data
    """
    with open(path, "rb") as f:
        while True:
            # Read length header
            len_bytes = f.read(8)
            if not len_bytes:
                break          # EOF
            if len(len_bytes) < 8:
                break
            data_length = struct.unpack("<Q", len_bytes)[0]

            # Skip CRC of length (4 bytes)
            f.read(4)

            # Read data
            data = f.read(data_length)
            if len(data) < data_length:
                break

            # Skip CRC of data (4 bytes)
            f.read(4)

            yield data


# ── minimal tf.train.Example protobuf decoder ──────────────────────
# We use google.protobuf's internal wire-format parser.

from google.protobuf import descriptor as descriptor_mod
from google.protobuf import descriptor_pool
from google.protobuf import message_factory
from google.protobuf import symbol_database
from google.protobuf import text_format
from google.protobuf.internal import decoder as proto_decoder
from google.protobuf.internal import wire_format


def _decode_varint(buffer, pos):
    """Decode a base-128 varint from buffer at position pos."""
    result = 0
    shift = 0
    while True:
        b = buffer[pos]
        pos += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            break
        shift += 7
    return result, pos


def _decode_len_delimited(buffer, pos):
    length, pos = _decode_varint(buffer, pos)
    return buffer[pos:pos+length], pos + length


def _parse_float_list(data):
    """Decode a packed repeated float."""
    n = len(data) // 4
    return list(struct.unpack(f"<{n}f", data[:n*4]))


def _parse_int64_list(data):
    """Decode a packed repeated int64 (zigzag-encoded varint)."""
    values = []
    pos = 0
    while pos < len(data):
        v, pos = _decode_varint(data, pos)
        values.append(v)
    return values


def parse_tf_example(raw_bytes: bytes) -> dict:
    """
    Parse a serialised tf.train.Example into a plain Python dict.
    Returns:  { feature_key: {"type": ..., "values": [...]} }

    Wire structure of tf.train.Example:
        field 1 (Features):
            field 1 (map entry, len-delimited):
                field 1 (key,   string)
                field 2 (value, Feature)
                    field 1 (bytes_list) | field 2 (float_list) | field 3 (int64_list)
    """
    result = {}

    def parse_features(buf):
        pos = 0
        while pos < len(buf):
            tag_and_type, pos = _decode_varint(buf, pos)
            field_num = tag_and_type >> 3
            wire_type = tag_and_type & 0x7

            if wire_type == 2:   # length-delimited
                payload, pos = _decode_len_delimited(buf, pos)
                if field_num == 1:     # map<string, Feature>
                    parse_map_entry(payload)
            else:
                # Skip unknown wire types
                if wire_type == 0:
                    _, pos = _decode_varint(buf, pos)
                elif wire_type == 1:
                    pos += 8
                elif wire_type == 5:
                    pos += 4
                else:
                    break

    def parse_map_entry(buf):
        key = None
        feature_data = None
        feature_field = None

        pos = 0
        while pos < len(buf):
            tag_and_type, pos = _decode_varint(buf, pos)
            fn = tag_and_type >> 3
            wt = tag_and_type & 0x7

            if wt == 2:
                payload, pos = _decode_len_delimited(buf, pos)
                if fn == 1:   # key (string)
                    key = payload.decode("utf-8", errors="replace")
                elif fn == 2: # value (Feature message)
                    feature_data = payload
            elif wt == 0:
                _, pos = _decode_varint(buf, pos)
            elif wt == 1:
                pos += 8
            elif wt == 5:
                pos += 4
            else:
                break

        if key is None or feature_data is None:
            return

        # Parse Feature message: field 1=BytesList, 2=FloatList, 3=Int64List
        pos2 = 0
        buf2 = feature_data
        while pos2 < len(buf2):
            tag_and_type, pos2 = _decode_varint(buf2, pos2)
            fn2 = tag_and_type >> 3
            wt2 = tag_and_type & 0x7

            if wt2 == 2:
                payload2, pos2 = _decode_len_delimited(buf2, pos2)
                if fn2 == 1:   # BytesList: field 1=bytes repeated
                    # parse inner repeated bytes
                    bvals = []
                    p3 = 0
                    while p3 < len(payload2):
                        tag3, p3 = _decode_varint(payload2, p3)
                        fn3 = tag3 >> 3
                        wt3 = tag3 & 0x7
                        if wt3 == 2:
                            bv, p3 = _decode_len_delimited(payload2, p3)
                            bvals.append(bv)
                        elif wt3 == 0:
                            _, p3 = _decode_varint(payload2, p3)
                        else:
                            p3 += 1
                    result[key] = {"type": "bytes_list", "values": bvals}

                elif fn2 == 2:  # FloatList
                    # inner field 1 = packed repeated float
                    floats = []
                    p3 = 0
                    while p3 < len(payload2):
                        tag3, p3 = _decode_varint(payload2, p3)
                        wt3 = tag3 & 0x7
                        if wt3 == 2:
                            fdata, p3 = _decode_len_delimited(payload2, p3)
                            floats.extend(_parse_float_list(fdata))
                        elif wt3 == 5:
                            v = struct.unpack("<f", payload2[p3:p3+4])[0]
                            floats.append(v)
                            p3 += 4
                        elif wt3 == 0:
                            _, p3 = _decode_varint(payload2, p3)
                        else:
                            p3 += 1
                    result[key] = {"type": "float_list", "values": floats}

                elif fn2 == 3:  # Int64List
                    ints = []
                    p3 = 0
                    while p3 < len(payload2):
                        tag3, p3 = _decode_varint(payload2, p3)
                        wt3 = tag3 & 0x7
                        if wt3 == 2:
                            idata, p3 = _decode_len_delimited(payload2, p3)
                            ints.extend(_parse_int64_list(idata))
                        elif wt3 == 0:
                            v, p3 = _decode_varint(payload2, p3)
                            ints.append(v)
                        else:
                            p3 += 1
                    result[key] = {"type": "int64_list", "values": ints}
            elif wt2 == 0:
                _, pos2 = _decode_varint(buf2, pos2)
            elif wt2 == 1:
                pos2 += 8
            elif wt2 == 5:
                pos2 += 4
            else:
                break

    # Top-level: Example.features = field 1
    pos = 0
    while pos < len(raw_bytes):
        tag_and_type, pos = _decode_varint(raw_bytes, pos)
        fn = tag_and_type >> 3
        wt = tag_and_type & 0x7
        if wt == 2:
            payload, pos = _decode_len_delimited(raw_bytes, pos)
            if fn == 1:   # Features message
                parse_features(payload)
        elif wt == 0:
            _, pos = _decode_varint(raw_bytes, pos)
        elif wt == 1:
            pos += 8
        elif wt == 5:
            pos += 4
        else:
            break

    return result


# ══════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════

TFRECORD_FILE = (
    r"C:\Users\Minora Dias\.cache\kagglehub\datasets\fantineh"
    r"\next-day-wildfire-spread\versions\2"
    r"\next_day_wildfire_spread_train_00.tfrecord"
)

PATCH_SIZE = 64   # each spatial feature is a 64×64 tile

# ── STEP 2: raw record bytes ───────────────────────────────────────
print("=" * 65)
print("  STEP 2 — RAW RECORDS  (first 3)")
print("=" * 65)

records = list(read_tfrecords(TFRECORD_FILE))
print(f"\n  Total records in file: {len(records):,}")

for i, raw in enumerate(records[:3]):
    print(f"\n  Record {i+1}: {len(raw):,} bytes")
    print(f"  First 80 bytes (hex): {raw[:80].hex()}")

# ── STEP 3: decode and inspect structure ──────────────────────────
print("\n" + "=" * 65)
print("  STEP 3 — DATASET STRUCTURE  (from record 1)")
print("=" * 65)

sample = parse_tf_example(records[0])

print(f"\n  Total feature keys: {len(sample)}\n")
print(f"  {'Key':<35} {'Type':<15} {'# values':<10} {'Sample values'}")
print(f"  {'─'*35} {'─'*15} {'─'*10} {'─'*24}")

for key in sorted(sample.keys()):
    feat = sample[key]
    typ  = feat["type"]
    vals = feat["values"]
    n    = len(vals)

    if typ == "float_list":
        arr = vals[:6]
        s   = f"{[round(v,3) for v in arr]}{'...' if n>6 else ''}"
    elif typ == "int64_list":
        s   = f"{vals[:6]}{'...' if n>6 else ''}"
    else:
        s   = f"<bytes, {n} items>"

    print(f"  {key:<35} {typ:<15} {n:<10} {s}")

# ── STEP 3b: reshape to 64×64 patches and print stats ─────────────
print("\n" + "=" * 65)
print("  STEP 3b — PER-FEATURE STATS  (64×64 patches)")
print("=" * 65)

print(f"\n  {'Key':<35} {'Shape':<15} {'Min':>8} {'Max':>8} {'Mean':>8}")
print(f"  {'─'*35} {'─'*15} {'─'*8} {'─'*8} {'─'*8}")

for key in sorted(sample.keys()):
    feat = sample[key]
    if feat["type"] == "float_list":
        arr = np.array(feat["values"], dtype=np.float32)
        if len(arr) == PATCH_SIZE * PATCH_SIZE:
            arr = arr.reshape(PATCH_SIZE, PATCH_SIZE)
            shape = f"({PATCH_SIZE},{PATCH_SIZE})"
        else:
            shape = f"({len(arr)},)"
        print(f"  {key:<35} {shape:<15} {arr.min():8.3f} {arr.max():8.3f} {arr.mean():8.3f}")
    elif feat["type"] == "int64_list":
        arr = np.array(feat["values"], dtype=np.int64)
        shape = f"({len(arr)},)"
        print(f"  {key:<35} {shape:<15} {int(arr.min()):>8} {int(arr.max()):>8} {arr.mean():8.3f}")

# ── STEP 3c: fire mask ─────────────────────────────────────────────
print("\n" + "=" * 65)
print("  STEP 3c — FIRE MASK  (next-day label)")
print("=" * 65)

LABEL_CANDIDATES = ["FireMask", "fire_mask", "PrevFireMask", "label"]

found = False
for candidate in LABEL_CANDIDATES:
    if candidate in sample:
        vals = np.array(sample[candidate]["values"], dtype=np.float32)
        if len(vals) == PATCH_SIZE * PATCH_SIZE:
            vals = vals.reshape(PATCH_SIZE, PATCH_SIZE)
        unique, counts = np.unique(vals, return_counts=True)
        print(f"\n  Label key  : '{candidate}'")
        print(f"  Shape      : {vals.shape}")
        print(f"  Unique vals: {dict(zip(unique.tolist(), counts.tolist()))}")
        print(f"  Fire pixels: {int((vals > 0).sum())} / {vals.size}")
        found = True
        break

if not found:
    print("\n  Standard label key not found. Available keys:")
    for k in sorted(sample.keys()):
        print(f"    • {k}  ({sample[k]['type']}, {len(sample[k]['values'])} values)")

print("\n  ✓ Done — wildfire dataset structure fully inspected.\n")
