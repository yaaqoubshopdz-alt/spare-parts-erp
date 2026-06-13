import requests

BASE_URL = "http://localhost:5173"
TIMEOUT = 30

def test_get_dashboard_requires_authentication():
    session = requests.Session()
    login_url = f"{BASE_URL}/login"
    dashboard_url = f"{BASE_URL}/dashboard"

    # Attempt to access dashboard without authentication
    try:
        response_unauth = session.get(dashboard_url, timeout=TIMEOUT, allow_redirects=False)
    except requests.RequestException as e:
        assert False, f"Request to dashboard without auth failed: {e}"

    # Validate unauthorized access: expect redirect to /login or 401/403 status
    if response_unauth.status_code in (301, 302, 303, 307, 308):
        location = response_unauth.headers.get("Location", "")
        assert "/login" in location, f"Redirect location expected /login but got: {location}"
    else:
        assert response_unauth.status_code in (401, 403), (
            f"Expected unauthorized status 401/403 or redirect, got: {response_unauth.status_code}"
        )

    # Authenticate: GET /login to get login page and cookies if any
    try:
        login_page_resp = session.get(login_url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to login page failed: {e}"
    assert login_page_resp.status_code == 200, f"Expected 200 on GET /login, got {login_page_resp.status_code}"
    assert "text/html" in login_page_resp.headers.get("Content-Type", ""), "Login page should be HTML"

    # Submit valid credentials (assuming typical form parameters)
    login_payload = {
        "username": "admin",
        "password": "admin"
    }
    # Headers for form submission
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    try:
        login_post_resp = session.post(login_url, data=login_payload, headers=headers, timeout=TIMEOUT, allow_redirects=True)
    except requests.RequestException as e:
        assert False, f"Login POST request failed: {e}"

    # Login success should redirect or deliver a 200 with dashboard access
    # Check login_post_resp for session cookie or being authenticated by attempting /dashboard next

    # Access dashboard with authenticated session
    try:
        dashboard_resp = session.get(dashboard_url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Authenticated request to dashboard failed: {e}"

    assert dashboard_resp.status_code == 200, f"Expected 200 status for dashboard with auth, got {dashboard_resp.status_code}"
    content_type = dashboard_resp.headers.get("Content-Type", "")
    assert "text/html" in content_type, f"Dashboard response should be HTML, got {content_type}"
    dashboard_html = dashboard_resp.text.lower()

    # Validate presence of important dashboard sections based on keywords
    assert "quick stats" in dashboard_html or "quickstat" in dashboard_html, "Dashboard missing quick stats section"
    assert "inventory alerts" in dashboard_html or "inventoryalert" in dashboard_html, "Dashboard missing inventory alerts section"
    assert "recent transactions" in dashboard_html or "recenttransaction" in dashboard_html, "Dashboard missing recent transactions section"


test_get_dashboard_requires_authentication()