import requests

BASE_URL = "http://localhost:5173"
TIMEOUT = 30

def test_get_purchases_requires_authentication():
    session = requests.Session()
    try:
        # Step 1: Retrieve login page (GET /login)
        login_page = session.get(f"{BASE_URL}/login", timeout=TIMEOUT)
        assert login_page.status_code == 200

        # Step 2: Attempt to access /purchases without authentication
        unauth_response = requests.get(f"{BASE_URL}/purchases", timeout=TIMEOUT, allow_redirects=False)
        # Expected: redirect to /login (302) or unauthorized (401/403)
        assert unauth_response.status_code in (302, 401, 403), f"Unexpected unauthenticated status: {unauth_response.status_code}"
        if unauth_response.status_code == 302:
            location = unauth_response.headers.get("Location", "")
            assert "/login" in location or location == "/login"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_purchases_requires_authentication()
