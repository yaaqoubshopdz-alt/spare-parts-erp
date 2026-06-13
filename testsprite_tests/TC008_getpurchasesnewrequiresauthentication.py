import requests

BASE_URL = "http://localhost:5173"
TIMEOUT = 30

def test_get_purchases_new_requires_authentication():
    session = requests.Session()
    login_url = f"{BASE_URL}/login"
    purchases_new_url = f"{BASE_URL}/purchases/new"

    # Attempt to access /purchases/new without authentication
    try:
        response_unauth = session.get(purchases_new_url, timeout=TIMEOUT, allow_redirects=False)
    except requests.RequestException as e:
        assert False, f"Request to /purchases/new without auth failed: {e}"

    # Check that unauthenticated response is redirect or unauthorized (401/403)
    assert response_unauth.status_code in (301, 302, 303, 307, 308, 401, 403), \
        f"Expected redirect or unauthorized when unauthenticated, got {response_unauth.status_code}"

    # Perform login with valid credentials
    # First GET /login to get login page (and possibly cookies)
    try:
        login_page_resp = session.get(login_url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Failed to GET /login page: {e}"
    assert login_page_resp.status_code == 200, f"Expected 200 on GET /login page, got {login_page_resp.status_code}"

    # Prepare dummy valid credentials (as per PRD, assume admin user)
    login_data = {
        "username": "admin",
        "password": "password"  # Assumed default valid password for testing
    }

    try:
        # POST credentials to /login (assuming login endpoint accepts form data here)
        login_response = session.post(login_url, data=login_data, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Login POST request failed: {e}"

    # Verify login success - expecting redirect or 200 with authenticated session set (cookie)
    assert login_response.status_code in (200, 302), f"Login failed or unexpected status code {login_response.status_code}"
    # Check that session cookie is set
    cookies = session.cookies.get_dict()
    assert cookies, "No cookies set after login, authentication likely failed"

    # Now access /purchases/new with authentication
    try:
        auth_response = session.get(purchases_new_url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Authenticated request to /purchases/new failed: {e}"

    assert auth_response.status_code == 200, f"Expected 200 on authenticated GET /purchases/new, got {auth_response.status_code}"
    content_type = auth_response.headers.get("Content-Type", "")
    assert "text/html" in content_type.lower(), f"Expected HTML content, got Content-Type: {content_type}"
    html_text = auth_response.text.lower()
    # Validate presence of keywords indicating purchase form with supplier selection and invoice preparation
    assert "purchase" in html_text and ("supplier" in html_text or "invoice" in html_text), \
        "Purchase form HTML does not appear to include supplier selection or invoice preparation"

test_get_purchases_new_requires_authentication()