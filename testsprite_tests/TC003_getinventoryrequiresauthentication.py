import requests

BASE_URL = "http://localhost:5173"
INVENTORY_URL = f"{BASE_URL}/inventory"
TIMEOUT = 30

def test_get_inventory_requires_authentication():
    # Test access to /inventory without authentication
    resp_inventory_noauth = requests.get(INVENTORY_URL, timeout=TIMEOUT, allow_redirects=False)
    # Should be blocked or redirected (401/403 or 3xx redirect)
    assert resp_inventory_noauth.status_code in (301, 302, 303, 307, 308, 401, 403)
    # If redirect, Location should be /login or similar
    if resp_inventory_noauth.status_code in (301, 302, 303, 307, 308):
        location = resp_inventory_noauth.headers.get("Location", "")
        assert "/login" in location

test_get_inventory_requires_authentication()
