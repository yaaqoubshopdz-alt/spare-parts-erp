import requests

def test_get_login_renders_login_screen():
    base_url = "http://localhost:5173"
    url = f"{base_url}/login"
    headers = {
        "Accept": "text/html",
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        content_type = response.headers.get("Content-Type", "")
        assert "text/html" in content_type, f"Expected 'text/html' in Content-Type header, got {content_type}"
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {str(e)}"

test_get_login_renders_login_screen()