import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("Testing GET /health")
    res = requests.get(f"{BASE_URL}/health")
    print("Status:", res.status_code, res.text[:200])
    print("-" * 40)

    print("Testing GET /api/disaster/status")
    res = requests.get(f"{BASE_URL}/api/disaster/status")
    print("Status:", res.status_code, res.text[:200])
    print("-" * 40)

    print("Testing GET /api/disaster/start (type=flood)")
    res = requests.get(f"{BASE_URL}/api/disaster/start", params={"type": "flood", "city": "Kochi"})
    print("Status:", res.status_code, res.text[:200])
    print("-" * 40)

    print("Testing GET /api/disaster/status (after start)")
    res = requests.get(f"{BASE_URL}/api/disaster/status")
    print("Status:", res.status_code, res.text[:200])
    print("-" * 40)

    print("Testing POST /disaster/start")
    res = requests.post(f"{BASE_URL}/disaster/start", params={"type": "wildfire"})
    print("Status:", res.status_code, res.text[:200])
    print("-" * 40)

    print("Testing POST /api/reroute/start_tracking")
    res = requests.post(f"{BASE_URL}/api/reroute/start_tracking")
    print("Status:", res.status_code, res.text[:200])
    print("-" * 40)

    print("Testing POST /api/reroute/tick")
    res = requests.post(f"{BASE_URL}/api/reroute/tick")
    print("Status:", res.status_code, res.text[:200])
    print("-" * 40)

    # For block_road, we need node_u and node_v
    print("Testing POST /api/reroute/block_road")
    res = requests.post(f"{BASE_URL}/api/reroute/block_road", params={"node_u": 1, "node_v": 2})
    print("Status:", res.status_code, res.text[:200])
    print("-" * 40)

if __name__ == '__main__':
    test_endpoints()
