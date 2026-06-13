import requests

BASE_URL = "http://localhost:5173"
TIMEOUT = 30

def test_getposrequiresauthentication():
    login_url = f"{BASE_URL}/login"
    pos_url = f"{BASE_URL}/pos"
    session = requests.Session()

    try:
        # Step 1: Get login page to retrieve any cookies or authenticity token if needed
        login_resp = session.get(login_url, timeout=TIMEOUT)
        assert login_resp.status_code == 200, "Login page did not return 200 OK"

        # Step 2: Perform login with valid admin credentials using form data
        login_payload = {
            "username": "admin",
            "password": "admin123"
        }
        login_post_resp = session.post(login_url, data=login_payload, timeout=TIMEOUT)
        assert login_post_resp.status_code in [200, 302], "Login POST failed"

        # Step 3: Access /pos with authenticated session
        pos_auth_resp = session.get(pos_url, timeout=TIMEOUT)
        assert pos_auth_resp.status_code == 200, f"Authenticated GET /pos failed with status {pos_auth_resp.status_code}"
        content = pos_auth_resp.text.lower()
        assert "customer" in content, "POS page missing customer selection text"
        assert "product" in content, "POS page missing product addition text"
        assert "discount" in content, "POS page missing discount text"
        assert "tax" in content, "POS page missing tax text"
        assert "payment" in content, "POS page missing payment confirmation text"

        # Step 4: Access /pos without authentication to verify access blocked or redirect
        no_auth_session = requests.Session()
        pos_no_auth_resp = no_auth_session.get(pos_url, timeout=TIMEOUT, allow_redirects=False)
        assert pos_no_auth_resp.status_code in [401, 403, 302], f"Unauthorized GET /pos returned unexpected status {pos_no_auth_resp.status_code}"
        if pos_no_auth_resp.status_code == 302:
            redirect_location = pos_no_auth_resp.headers.get("Location", "").lower()
            assert "/login" in redirect_location, f"Redirect location is unexpected: {redirect_location}"

    finally:
        session.close()

test_getposrequiresauthentication()
