
import os
import pandas as pd
from urllib.parse import urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(
    BASE_DIR,
    "dataset",
    "PhiUSIIL_Phishing_URL_Dataset.csv"
)

df = pd.read_csv(DATASET_PATH)

# Use the same subdomain calculation as train_model.py
def calculate_subdomains(url):
    parsed = urlparse(str(url))
    hostname = parsed.hostname or ""

    return max(0, len(hostname.split(".")) - 2)


df["CalculatedSubdomains"] = df["URL"].apply(
    calculate_subdomains
)

print("=" * 70)
print("PHISHKAVACH RAW URL SUBDOMAIN DISTRIBUTION")
print("=" * 70)

for label, name in [(0, "PHISHING"), (1, "LEGITIMATE")]:

    subset = df[df["label"] == label]

    print(f"\n{name}")
    print("-" * 70)

    print(
        "Calculated subdomain distribution:"
    )

    print(
        subset["CalculatedSubdomains"].value_counts()
        .sort_index()
        .to_string()
    )

    for count in [0, 1]:

        examples = subset[
            subset["CalculatedSubdomains"] == count
        ]["URL"].head(20)

        print(
            f"\n{name} URLs with {count} subdomains:"
        )

        if examples.empty:
            print("No examples found.")
        else:
            for url in examples:
                print(url)

print("\nDiagnostic complete.")
