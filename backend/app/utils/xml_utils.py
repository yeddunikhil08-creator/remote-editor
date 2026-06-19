import xml.etree.ElementTree as ET
import os

def validate_xml(content_or_path: str) -> bool:
    try:
        if isinstance(content_or_path, str) and len(content_or_path) < 300 and os.path.exists(content_or_path):
            with open(content_or_path, "r", encoding="utf-8") as f:
                content = f.read()
        else:
            content = content_or_path
        ET.fromstring(content)
        return True
    except (ET.ParseError, Exception):
        return False