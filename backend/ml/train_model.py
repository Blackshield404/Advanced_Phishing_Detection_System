import os
import re
import ipaddress
import pandas as pd
import joblib

from urllib.parse import urlparse

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)


# --------------------------------------------------
# 1. File paths
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(
    BASE_DIR,
    "dataset",
    "PhiUSIIL_Phishing_URL_Dataset.csv"
)

MODEL_DIR = os.path.join(BASE_DIR, "model")

os.makedirs(MODEL_DIR, exist_ok=True)


# --------------------------------------------------
# 2. Same feature list used by live detection
# --------------------------------------------------

FEATURES = [
    "URLLength",
    "DomainLength",
    "IsDomainIP",
    "NoOfSubDomain",
    "HasObfuscation",
    "NoOfObfuscatedChar",
    "ObfuscationRatio",
    "NoOfLettersInURL",
    "LetterRatioInURL",
    "NoOfDegitsInURL",
    "DegitRatioInURL",
    "NoOfEqualsInURL",
    "NoOfQMarkInURL",
    "NoOfAmpersandInURL",
    "NoOfOtherSpecialCharsInURL",
    "SpacialCharRatioInURL",
    "IsHTTPS"
]


# --------------------------------------------------
# 3. IP address checker
# --------------------------------------------------

def is_ip_address(hostname):
    if not hostname:
        return False

    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False


# --------------------------------------------------
# 4. Extract features from URL
# --------------------------------------------------

def extract_ml_features(url):

    parsed = urlparse(url)

    hostname = parsed.hostname or ""

    url_length = len(url)

    domain_length = len(hostname)

    is_domain_ip = int(
        is_ip_address(hostname)
    )

    no_of_subdomain = max(
        0,
        len(hostname.split(".")) - 2
    )

    # URL encoding / obfuscation
    obfuscated_matches = re.findall(
        r"%[0-9A-Fa-f]{2}",
        url
    )

    no_of_obfuscated_char = len(
        obfuscated_matches
    )

    has_obfuscation = int(
        no_of_obfuscated_char > 0
    )

    obfuscation_ratio = (
        no_of_obfuscated_char / url_length
        if url_length > 0
        else 0
    )

    # Letters
    no_of_letters = sum(
        char.isalpha()
        for char in url
    )

    letter_ratio = (
        no_of_letters / url_length
        if url_length > 0
        else 0
    )

    # Digits
    no_of_digits = sum(
        char.isdigit()
        for char in url
    )

    digit_ratio = (
        no_of_digits / url_length
        if url_length > 0
        else 0
    )

    # URL symbols
    no_of_equals = url.count("=")

    no_of_qmark = url.count("?")

    no_of_ampersand = url.count("&")

    allowed_special = set(
        "/:?&=#%._-"
    )

    no_of_other_special = sum(
        1
        for char in url
        if not char.isalnum()
        and char not in allowed_special
    )

    special_ratio = (
        no_of_other_special / url_length
        if url_length > 0
        else 0
    )

    # HTTPS
    is_https = int(
        parsed.scheme.lower() == "https"
    )

    return {
        "URLLength": url_length,
        "DomainLength": domain_length,
        "IsDomainIP": is_domain_ip,
        "NoOfSubDomain": no_of_subdomain,
        "HasObfuscation": has_obfuscation,
        "NoOfObfuscatedChar": no_of_obfuscated_char,
        "ObfuscationRatio": obfuscation_ratio,
        "NoOfLettersInURL": no_of_letters,
        "LetterRatioInURL": letter_ratio,
        "NoOfDegitsInURL": no_of_digits,
        "DegitRatioInURL": digit_ratio,
        "NoOfEqualsInURL": no_of_equals,
        "NoOfQMarkInURL": no_of_qmark,
        "NoOfAmpersandInURL": no_of_ampersand,
        "NoOfOtherSpecialCharsInURL": no_of_other_special,
        "SpacialCharRatioInURL": special_ratio,
        "IsHTTPS": is_https
    }


# --------------------------------------------------
# 5. Load dataset
# --------------------------------------------------

print("Loading dataset...")

df = pd.read_csv(DATASET_PATH)

print(
    f"Dataset loaded: {len(df):,} rows"
)


# --------------------------------------------------
# 6. Check required columns
# --------------------------------------------------

required_columns = [
    "URL",
    "label"
]

missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing_columns:

    print("Missing columns:")
    print(missing_columns)

    raise SystemExit(1)


# --------------------------------------------------
# 7. Generate OUR features from raw URLs
# --------------------------------------------------

print()
print("Generating URL features...")
print("This may take a little while for 235k URLs.")

feature_rows = []

for index, url in enumerate(
    df["URL"].astype(str)
):

    feature_rows.append(
        extract_ml_features(url)
    )

    if (index + 1) % 25000 == 0:

        print(
            f"Processed {index + 1:,} / "
            f"{len(df):,} URLs"
        )


X = pd.DataFrame(
    feature_rows,
    columns=FEATURES
)

y = df["label"].copy()


# --------------------------------------------------
# 8. Handle missing values
# --------------------------------------------------

X = X.fillna(0)


print()
print("Feature generation complete.")

print()
print("Feature shape:")
print(X.shape)


# --------------------------------------------------
# 9. Train/Test split
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print()
print(
    f"Training samples: {len(X_train):,}"
)

print(
    f"Testing samples:  {len(X_test):,}"
)


# --------------------------------------------------
# 10. Train Random Forest
# --------------------------------------------------

print()
print("Training Random Forest model...")

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    n_jobs=-1,
    class_weight="balanced"
)

model.fit(
    X_train,
    y_train
)


# --------------------------------------------------
# 11. Predictions
# --------------------------------------------------

y_pred = model.predict(X_test)


# --------------------------------------------------
# 12. Evaluation
# --------------------------------------------------

accuracy = accuracy_score(
    y_test,
    y_pred
)

precision = precision_score(
    y_test,
    y_pred,
    pos_label=0
)

recall = recall_score(
    y_test,
    y_pred,
    pos_label=0
)

f1 = f1_score(
    y_test,
    y_pred,
    pos_label=0
)


print()
print("=" * 60)
print("PHISHKAVACH ML MODEL RESULTS")
print("=" * 60)

print(
    f"Accuracy : {accuracy:.4f}"
)

print(
    f"Precision: {precision:.4f}"
)

print(
    f"Recall   : {recall:.4f}"
)

print(
    f"F1 Score : {f1:.4f}"
)


print()
print("Classification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=[
            "Phishing (0)",
            "Legitimate (1)"
        ]
    )
)


print("Confusion Matrix:")

print(
    confusion_matrix(
        y_test,
        y_pred
    )
)


# --------------------------------------------------
# 13. Feature importance
# --------------------------------------------------

importance = pd.DataFrame({
    "feature": FEATURES,
    "importance": model.feature_importances_
})

importance = importance.sort_values(
    by="importance",
    ascending=False
)


print()
print("Feature Importance:")

print(
    importance.to_string(
        index=False
    )
)


# --------------------------------------------------
# 14. Save model
# --------------------------------------------------

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "phishing_model.pkl"
)

joblib.dump(
    {
        "model": model,
        "features": FEATURES
    },
    MODEL_PATH
)


print()
print("=" * 60)

print("Model saved to:")

print(MODEL_PATH)

print("=" * 60)