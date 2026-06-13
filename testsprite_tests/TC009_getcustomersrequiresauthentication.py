import requests

BASE_URL = "http://localhost:5173"
LOGIN_URL = f"{BASE_URL}/login"
CUSTOMERS_URL = f"{BASE_URL}/customers"
TIMEOUT = 30
ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": "admin"  # Adjust if needed
}

def test_getcustomersrequiresauthentication():
    session = requests.Session()
    try:
        # Step 1: Perform GET /login to get the login page and any cookies
        login_get_resp = session.get(LOGIN_URL, timeout=TIMEOUT)
        assert login_get_resp.status_code == 200, f"Expected 200 from GET /login, got {login_get_resp.status_code}"
        assert "html" in login_get_resp.headers.get("Content-Type", "").lower(), "GET /login did not return HTML content"

        # Step 2: Submit valid admin credentials - assuming form data login
        login_post_resp = session.post(
            LOGIN_URL,
            data={"username": ADMIN_CREDENTIALS["username"], "password": ADMIN_CREDENTIALS["password"]},
            timeout=TIMEOUT,
            allow_redirects=True,
        )
        assert login_post_resp.status_code in (200, 302), f"Login POST expected 200 or 302, got {login_post_resp.status_code}"

        # Step 3: Access /customers with authenticated session
        customers_resp = session.get(CUSTOMERS_URL, timeout=TIMEOUT)
        assert customers_resp.status_code == 200, f"Expected 200 from /customers, got {customers_resp.status_code}"
        content_type = customers_resp.headers.get("Content-Type", "").lower()
        assert "html" in content_type, "Response from /customers is not HTML"

        body_text = customers_resp.text.lower()
        assert any(word in body_text for word in ("customer", "statement", "directory")), "Response body from /customers missing expected terms"

        # Step 4: Access /customers without authentication using new session to verify blocking/redirect
        unauth_session = requests.Session()
        unauth_resp = unauth_session.get(CUSTOMERS_URL, timeout=TIMEOUT, allow_redirects=False)
        assert (
            unauth_resp.status_code in (401, 403)
            or (300 <= unauth_resp.status_code < 400 and "/login" in unauth_resp.headers.get("Location", ""))
        ), f"Unauthenticated access to /customers should be 401/403 or redirect to /login, got {unauth_resp.status_code}"

    finally:
        session.close()


test_getcustomersrequiresauthentication()