import os
import re
import ipaddress
import pandas as pd
from urllib.parse import urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(
    BASE_DIR, "dataset", "PhiUSIIL_Phishing_URL_Dataset.csv"
)

FEATURES = [
    "URLLength", "DomainLength", "IsDomainIP",
    "NoOfSubDomain", "HasObfuscation",
    "NoOfObfuscatedChar", "ObfuscationRatio",
    "NoOfLettersInURL", "LetterRatioInURL",
    "NoOfDegitsInURL", "DegitRatioInURL",
    "NoOfEqualsInURL", "NoOfQMarkInURL",
    "NoOfAmpersandInURL", "NoOfOtherSpecialCharsInURL",
    "SpacialCharRatioInURL", "IsHTTPS"
]


def extract_features(url):
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    length = len(url)

    try:
        ipaddress.ip_address(hostname)
        is_ip = 1
    except ValueError:
        is_ip = 0

    encoded = re.findall(r"%[0-9A-Fa-f]{2}", url)
    letters = sum(c.isalpha() for c in url)
    digits = sum(c.isdigit() for c in url)
    allowed = set("/:?&=#%._-")

    other_special = sum(
        1 for c in url
        if not c.isalnum() and c not in allowed
    )

    return {
        "URLLength": length,
        "DomainLength": len(hostname),
        "IsDomainIP": is_ip,
        "NoOfSubDomain": max(0, len(hostname.split(".")) - 2),
        "HasObfuscation": int(len(encoded) > 0),
        "NoOfObfuscatedChar": len(encoded),
        "ObfuscationRatio": len(encoded) / length if length else 0,
        "NoOfLettersInURL": letters,
        "LetterRatioInURL": letters / length if length else 0,
        "NoOfDegitsInURL": digits,
        "DegitRatioInURL": digits / length if length else 0,
        "NoOfEqualsInURL": url.count("="),
        "NoOfQMarkInURL": url.count("?"),
        "NoOfAmpersandInURL": url.count("&"),
        "NoOfOtherSpecialCharsInURL": other_special,
        "SpacialCharRatioInURL": other_special / length if length else 0,
        "IsHTTPS": int(parsed.scheme.lower() == "https")
    }


print("Loading dataset...")
df = pd.read_csv(DATASET_PATH)

for label, category in [(0, "PHISHING"), (1, "LEGITIMATE")]:
    print(f"\n{'=' * 60}\n{category} — label {label}\n{'=' * 60}")

    sample = df[df["label"] == label].sample(
        n=3, random_state=42
    )

    for _, row in sample.iterrows():
        url = str(row["URL"])
        calculated = extract_features(url)
        parsed = urlparse(url)

        print("Scheme:", repr(parsed.scheme))
        print("Netloc:", repr(parsed.netloc))
        print("Hostname:", repr(parsed.hostname))
        print("Path:", repr(parsed.path))
        print("URL without scheme:", repr(url.split("://", 1)[-1]))
        mismatches = []

        for feature in FEATURES:
            original = float(row[feature])
            generated = float(calculated[feature])

            if abs(original - generated) > 0.0001:
                mismatches.append(
                    f"{feature}: dataset={original}, "
                    f"generated={generated}"
                )

                print("\nURL:", url)
        print("Raw URL:", repr(url))
        print("Character positions:")

        for index, char in enumerate(url):
            print(index, repr(char))

        print("Alphabetic characters:", [c for c in url if c.isalpha()])
        print("Python alphabetic count:", sum(c.isalpha() for c in url))
        print("Python URL length:", len(url))
        print("Actual URL length:", len(url))
        print("Dataset URL length:", row["URLLength"])
        print("Dataset letter count:", row["NoOfLettersInURL"])
        print("Dataset special character count:", row["NoOfOtherSpecialCharsInURL"])
        print("Dataset special character ratio:", row["SpacialCharRatioInURL"])
        print("Dataset letter ratio:", row["LetterRatioInURL"])

        print(f"Mismatched features: {len(mismatches)}/{len(FEATURES)}")

        for mismatch in mismatches[:10]:
            print(" -", mismatch)

        if not mismatches:
            print("All 17 features match.")

print("\nComparison complete.")