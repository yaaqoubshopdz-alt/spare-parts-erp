import requests

BASE_URL = "http://localhost:5173"
LOGIN_ENDPOINT = "/login"
SALES_ENDPOINT = "/sales"
TIMEOUT = 30

def test_getsalesrequiresauthentication():
    session = requests.Session()
    try:
        # Step 1: Access the login page to get any cookies or tokens if needed
        login_resp = session.get(BASE_URL + LOGIN_ENDPOINT, timeout=TIMEOUT)
        assert login_resp.status_code == 200
        assert "text/html" in login_resp.headers.get("Content-Type", "").lower()
        
        # Assume form-based login requires POST to /login with form data 'username' and 'password'.
        login_payload = {
            "username": "admin",
            "password": "admin"  # Assuming default admin/admin credentials for test
        }
        login_post_resp = session.post(BASE_URL + LOGIN_ENDPOINT, data=login_payload, timeout=TIMEOUT, allow_redirects=True)
        # After successful login, expect to remain in session, possibly redirected
        
        # Check login success by accessing /sales endpoint (authenticated check)
        sales_auth_resp = session.get(BASE_URL + SALES_ENDPOINT, timeout=TIMEOUT)
        assert sales_auth_resp.status_code == 200
        content_type = sales_auth_resp.headers.get("Content-Type", "")
        assert "text/html" in content_type.lower()
        
        # Step 2: Check accessing /sales without authentication
        # Create a new session without authentication
        unauth_session = requests.Session()
        sales_unauth_resp = unauth_session.get(BASE_URL + SALES_ENDPOINT, timeout=TIMEOUT, allow_redirects=False)
        
        # Should be unauthorized or redirected to /login
        if sales_unauth_resp.status_code == 401 or sales_unauth_resp.status_code == 403:
            # Access blocked properly
            pass
        elif sales_unauth_resp.status_code in (301, 302, 303, 307, 308):
            redirected_location = sales_unauth_resp.headers.get("Location", "")
            assert redirected_location.endswith("/login") or "/login" in redirected_location
        else:
            # Sometimes a frontend redirect might return 200 but content is a login page
            # Check content for login presence
            unauth_content = sales_unauth_resp.text.lower()
            assert "login" in unauth_content or "unauthorized" in unauth_content
    finally:
        session.close()

test_getsalesrequiresauthentication()