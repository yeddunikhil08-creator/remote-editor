import json
import os
import time
import socket
import urllib.request
import urllib.parse
import subprocess
import sys

CONFIG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config")
CONFIG_PATH = os.path.join(CONFIG_DIR, "client_config.json")

# Global JWT token cache
token = None

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def api_post(url, data, auth_token=None):
    try:
        headers = {'Content-Type': 'application/json'}
        if auth_token:
            headers['Authorization'] = f"Bearer {auth_token}"
            
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"[!] HTTP POST failed to {url}: {e}")
        return None

def api_get(url, auth_token=None):
    try:
        headers = {}
        if auth_token:
            headers['Authorization'] = f"Bearer {auth_token}"
            
        req = urllib.request.Request(url, headers=headers, method='GET')
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"[!] HTTP GET failed to {url}: {e}")
        return None

def download_file(url, dest, auth_token=None):
    try:
        print(f"[*] Downloading {url} -> {dest}...")
        headers = {}
        if auth_token:
            headers['Authorization'] = f"Bearer {auth_token}"
            
        req = urllib.request.Request(url, headers=headers, method='GET')
        with urllib.request.urlopen(req) as response:
            with open(dest, 'wb') as out_file:
                out_file.write(response.read())
        return True
    except Exception as e:
        print(f"[!] Download failed: {e}")
        return False

def run_sync_cycle():
    global token
    
    # 1. Load config
    if not os.path.exists(CONFIG_PATH):
        print(f"[!] Configuration file not found at {CONFIG_PATH}. Exiting.")
        sys.exit(1)
        
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)

    server_url = config.get("server_url", "http://127.0.0.1:8000")
    client_id = config.get("client_id", "RADAR-01")
    hostname = config.get("hostname", socket.gethostname())
    username = config.get("username", "viewer")
    password = config.get("password", "viewer123")
    target_xml = config.get("target_xml_filename", "config.xml")
    current_xml_version = config.get("current_xml_version", 0)
    current_sw_version = config.get("current_software_version", "1.0")
    
    print("\n--- Synchronizing Client Agent ---")
    print(f"Client ID: {client_id} | IP: {get_local_ip()} | SW Version: {current_sw_version}")

    # 2. Ensure JWT Authentication is active
    if not token:
        print("[*] Contacting authorization gateway for JWT token...")
        login_url = f"{server_url}/auth/login"
        res = api_post(login_url, {"username": username, "password": password})
        if res and "access_token" in res:
            token = res["access_token"]
            print("[+] Token obtained and cached successfully.")
        else:
            print("[!] Authentication gateway rejected credentials. Retrying in next cycle...")
            return

    # 3. Send Heartbeat
    heartbeat_url = f"{server_url}/clients/heartbeat"
    heartbeat_data = {
        "client_id": client_id,
        "version": current_sw_version,
        "status": "Healthy",
        "ip": get_local_ip(),
        "hostname": hostname
    }
    print("[*] Transmitting system heartbeat...")
    api_post(heartbeat_url, heartbeat_data, auth_token=token)

    # 4. Check and Sync XML Configurations
    list_url = f"{server_url}/xml/list-xml"
    print(f"[*] Checking XML repository for file: {target_xml}...")
    files_list = api_get(list_url, auth_token=token)
    
    if files_list:
        target_file_meta = None
        for f_meta in files_list:
            if f_meta.get("filename") == target_xml:
                target_file_meta = f_meta
                break
                
        if target_file_meta:
            server_version = target_file_meta.get("current_version", 1)
            print(f"[*] Server Version: {server_version} | Local Version: {current_xml_version}")
            
            if server_version > current_xml_version:
                read_url = f"{server_url}/xml/read-xml/{target_xml}?version={server_version}"
                local_xml_path = os.path.join(CONFIG_DIR, target_xml)
                
                try:
                    req = urllib.request.Request(read_url, headers={'Authorization': f'Bearer {token}'}, method='GET')
                    with urllib.request.urlopen(req) as resp:
                        xml_text = resp.read().decode('utf-8')
                    
                    with open(local_xml_path, "w", encoding="utf-8") as f:
                        f.write(xml_text)
                        
                    print(f"[+] Synced configuration file successfully to version {server_version}!")
                    
                    config["current_xml_version"] = server_version
                    with open(CONFIG_PATH, "w") as f:
                        json.dump(config, f, indent=2)
                except Exception as e:
                    print(f"[!] Error downloading XML configuration: {e}")
            else:
                print(f"[+] XML Configuration is up to date.")
        else:
            print(f"[!] Target file '{target_xml}' not found on the server.")
    else:
        # If the token is invalid (expired), clear token to re-login on next cycle
        print("[!] Could not fetch XML file list from server (possibly unauthorized). Clearing token cache.")
        token = None

    # 5. Check for Software Updates
    check_update_url = f"{server_url}/updates/check-update?client_version={current_sw_version}"
    print("[*] Checking for software update package availability...")
    update_info = api_get(check_update_url, auth_token=token)
    
    if update_info and update_info.get("update_available"):
        latest_version = update_info.get("latest_version")
        download_route = update_info.get("download_url")
        print(f"[!] NEW SOFTWARE VERSION AVAILABLE: v{latest_version}")
        
        download_url = f"{server_url}{download_route}"
        zip_dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"update_{latest_version}.zip")
        
        if download_file(download_url, zip_dest, auth_token=token):
            print(f"[*] Invoking local system updater for v{latest_version}...")
            updater_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "updater.py")
            
            try:
                proc = subprocess.Popen(
                    [sys.executable, updater_script, zip_dest, latest_version, CONFIG_PATH],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                stdout, stderr = proc.communicate()
                print(stdout)
                
                if proc.returncode == 0:
                    print(f"[+] Software version {latest_version} installed successfully.")
                    if os.path.exists(zip_dest):
                        os.remove(zip_dest)
                        
                    print("[*] Sending updated heartbeat...")
                    new_heartbeat_data = heartbeat_data.copy()
                    new_heartbeat_data["version"] = latest_version
                    api_post(heartbeat_url, new_heartbeat_data, auth_token=token)
                else:
                    print(f"[!] Updater failed: {stderr}")
            except Exception as e:
                print(f"[!] Failed to run updater script: {e}")
    else:
        print("[+] Software application is up to date.")

def main():
    if not os.path.exists(CONFIG_DIR):
        os.makedirs(CONFIG_DIR)
            
    print("=========================================")
    print("   RCSUMS CLIENT SYNCHRONIZATION AGENT   ")
    print("=========================================")
    print(f"Loading configurations from: {CONFIG_PATH}")
    
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)
        
    interval = config.get("sync_interval_seconds", 10)
    print(f"Agent initialized. Poll interval: {interval} seconds.")
    print("Press Ctrl+C to terminate...")
    
    try:
        while True:
            run_sync_cycle()
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[+] Synchronization agent stopped.")

if __name__ == "__main__":
    main()
