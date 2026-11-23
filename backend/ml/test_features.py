import sys
import os

# Allow importing from backend
sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

from urllib.parse import urlparse
from app import extract_ml_features


url = "https://example.com"

parsed = urlparse(url)

features = extract_ml_features(
    url,
    parsed,
    parsed.hostname
)

print("=" * 60)
print("PHISHKAVACH LIVE ML FEATURES")
print("=" * 60)

for name, value in features.items():
    print(f"{name:30} : {value}")