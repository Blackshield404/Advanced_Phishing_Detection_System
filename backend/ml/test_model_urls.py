import sys
import os

sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

from urllib.parse import urlparse
from app import extract_ml_features, predict_with_ml


test_urls = [
    "https://example.com",
    "https://www.example.com",
    "https://www.google.com",
    "https://www.google.com/",
    "https://www.youtube.com",
    "https://www.youtube.com/",
    "https://www.diemon.com",
]
print("=" * 70)
print("PHISHKAVACH ML SANITY TEST")
print("=" * 70)

for url in test_urls:

    parsed = urlparse(url)

    features = extract_ml_features(
        url,
        parsed,
        parsed.hostname
    )

    result = predict_with_ml(features)

    print()
    print("-" * 70)
    print("URL:", url)
    print("Prediction:", result["prediction"])
    print(
        "Phishing Probability:",
        f'{result["phishing_probability"]:.4f}'
    )
    print(
        "Legitimate Probability:",
        f'{result["legitimate_probability"]:.4f}'
    )