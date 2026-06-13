import requests

BASE_URL = "http://localhost:5173"
TIMEOUT = 30

def test_tc010_get_settings_requires_authentication():
    session = requests.Session()

    # Step 1: Attempt to access /settings without authentication
    unauth_response = session.get(f"{BASE_URL}/settings", timeout=TIMEOUT, allow_redirects=False)
    # The response should either be 401 Unauthorized or a redirect (3xx) to /login or similar
    assert (unauth_response.status_code == 401 or (300 <= unauth_response.status_code < 400)), \
        f"Expected 401 or 3xx redirect without auth, got {unauth_response.status_code}"
    if 300 <= unauth_response.status_code < 400:
        location = unauth_response.headers.get("Location", "")
        assert "/login" in location.lower(), f"Redirect location without auth should be to /login, got {location}"

    # Step 2: Authenticate successfully
    # First, get the login page to acquire cookies if needed
    login_page_response = session.get(f"{BASE_URL}/login", timeout=TIMEOUT)
    assert login_page_response.status_code == 200, f"Login page GET failed with status {login_page_response.status_code}"

    # Post valid admin credentials - using default test credentials
    login_payload = {
        "username": "admin",
        "password": "admin"
    }
    login_response = session.post(f"{BASE_URL}/login", data=login_payload, timeout=TIMEOUT, allow_redirects=False)
    # Expecting either:
    # - 302 redirect on successful login (usual behavior for form login)
    # - Or 200 with some indicator of successful login
    assert login_response.status_code in (200, 302), f"Login POST unexpected status {login_response.status_code}"
    if login_response.status_code == 302:
        location = login_response.headers.get("Location", "")
        assert location and location != "/login", f"Login redirect location invalid: {location}"

    # Step 3: Access /settings with authenticated session
    settings_response = session.get(f"{BASE_URL}/settings", timeout=TIMEOUT)
    assert settings_response.status_code == 200, f"Authenticated /settings request failed with status {settings_response.status_code}"
    content = settings_response.text.lower()
    # Check that returned page likely contains settings sections keywords
    assert ("global settings" in content or
            "user preferences" in content or
            "printer options" in content), "Settings page content missing expected text"

test_tc010_get_settings_requires_authentication()