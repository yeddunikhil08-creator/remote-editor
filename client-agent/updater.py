import json
import os
import time
import zipfile
import sys

def install_update(zip_path: str, target_version: str, config_path: str) -> bool:
    print(f"[*] STARTING INSTALLATION: Software Version {target_version}")
    print(f"[*] Package: {zip_path}")
    
    if not os.path.exists(zip_path):
        print(f"[!] FAILED: Package not found on client.")
        return False
        
    try:
        # Simulate extraction and replacement steps
        print("[*] Stage 1/4: Extracting patch files...")
        time.sleep(2)
        
        # Simulate folder structure unpacking
        extract_dir = os.path.join(os.path.dirname(zip_path), f"patch_v{target_version}")
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
            
        print("[*] Stage 2/4: Checking file system permissions...")
        time.sleep(1)
        
        print("[*] Stage 3/4: Executing configuration migrators...")
        time.sleep(1.5)
        
        print("[*] Stage 4/4: Re-linking system libraries...")
        time.sleep(1)
        
        # Update client config version
        with open(config_path, "r") as f:
            config = json.load(f)
            
        old_version = config.get("current_software_version", "1.0")
        config["current_software_version"] = target_version
        
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)
            
        print(f"[+] COMPLETED: Successfully updated from v{old_version} to v{target_version}!")
        return True
    except Exception as e:
        print(f"[!] CRITICAL FAILURE: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python updater.py <zip_path> <version> <config_path>")
        sys.exit(1)
    
    success = install_update(sys.argv[1], sys.argv[2], sys.argv[3])
    sys.exit(0 if success else 1)
