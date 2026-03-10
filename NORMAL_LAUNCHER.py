import requests
import subprocess
import time
from urllib.parse import urlparse

# ------------------ CONFIG ------------------

DEBUG_PORT = 9222
BRAVE_PATH = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
BRAVE_PROFILE = r"C:\brave-debug-profile"

BACKEND_PATH = r"D:\__GC_PROJECTS\____MVGC_FINAL_YEAR_PROJECT\SMART-TASK-SYSTEM\backend"
FRONTEND_PATH = r"D:\__GC_PROJECTS\____MVGC_FINAL_YEAR_PROJECT\SMART-TASK-SYSTEM\frontend-react-app"

BACKEND_URL = "http://localhost:8081"
FRONTEND_URL = "http://localhost:3000"

# --------------------------------------------


def is_port_running(url):
    try:
        requests.get(url, timeout=2)
        return True
    except:
        return False


def is_debug_brave_running():
    try:
        requests.get(f"http://localhost:{DEBUG_PORT}/json", timeout=2)
        return True
    except:
        return False


def start_debug_brave():
    print("Starting Brave in debug mode...")
    subprocess.Popen([
        BRAVE_PATH,
        f"--remote-debugging-port={DEBUG_PORT}",
        f"--user-data-dir={BRAVE_PROFILE}"
    ])
    time.sleep(5)


def get_open_tabs():
    """Return list of URLs currently opened in debug Brave."""
    try:
        response = requests.get(f"http://localhost:{DEBUG_PORT}/json")
        tabs = response.json()
        return [tab.get("url") for tab in tabs]
    except:
        return []

def open_tab(url):
    """Open a new tab in debug Brave if not already opened."""
    open_tabs = get_open_tabs()

    # Normalize URLs: compare only scheme + netloc
    target_netloc = urlparse(url).netloc
    target_scheme = urlparse(url).scheme

    already_open = False
    for tab_url in open_tabs:
        parsed = urlparse(tab_url)
        if parsed.scheme == target_scheme and parsed.netloc == target_netloc:
            already_open = True
            break

    if already_open:
        print(f"{url} is already open in Brave.")
    else:
        print(f"Opening {url} in Brave debug browser...")
        requests.put(f"http://localhost:{DEBUG_PORT}/json/new?{url}")

def start_backend():
    print("Starting Backend (Spring Boot)...")
    subprocess.Popen(
        'start cmd /k "mvn spring-boot:run -e"',
        cwd=BACKEND_PATH,
        shell=True
    )


def start_frontend():
    print("Starting Frontend (React)...")
    subprocess.Popen(
        'start cmd /k "npm start"',
        cwd=FRONTEND_PATH,
        shell=True
    )


# ------------------ MAIN ------------------

if __name__ == "__main__":

    # Ensure Debug Brave running
    if not is_debug_brave_running():
        start_debug_brave()
    else:
        print("Debug Brave already running.")

    # ---------------- BACKEND ----------------
    if not is_port_running(BACKEND_URL):
        start_backend()
        print("Waiting for backend to initialize...")
        time.sleep(15)
    else:
        print("Backend already running.")

    # Open backend tab if not already opened
    open_tab(BACKEND_URL)

    # ---------------- FRONTEND ----------------
    if not is_port_running(FRONTEND_URL):
        start_frontend()
        print("Waiting for frontend to initialize...")
        time.sleep(10)
    else:
        print("Frontend already running.")

    # Open frontend tab if not already opened
    open_tab(FRONTEND_URL)