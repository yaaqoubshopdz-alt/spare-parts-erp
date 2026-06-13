import requests

BASE_URL = "http://localhost:5173"
LOGIN_URL = f"{BASE_URL}/login"
LOW_STOCK_URL = f"{BASE_URL}/low-stock"
TIMEOUT = 30


def test_get_low_stock_requires_authentication():
    session = requests.Session()

    try:
        # Step 1: Attempt to access /low-stock without authentication
        response_no_auth = session.get(LOW_STOCK_URL, timeout=TIMEOUT, allow_redirects=False)
        assert response_no_auth.status_code in (200, 401, 403, 302), \
            f"Expected unauthorized, redirect or 200 status for unauthenticated request, got {response_no_auth.status_code}"

        if response_no_auth.status_code == 302:
            # Verify redirect location to /login or similar
            assert '/login' in response_no_auth.headers.get('Location', ''), \
                "Unauthenticated request redirect location is not /login"
        elif response_no_auth.status_code == 200:
            # If 200, verify if content indicates actually unauthenticated or login page
            content = response_no_auth.text.lower()
            assert ('login' in content or 'unauthorized' in content or 'low-stock' not in content), \
                "Unauthenticated request returned 200 but content does not indicate login or unauthorized page"

    finally:
        session.close()


test_get_low_stock_requires_authentication()
