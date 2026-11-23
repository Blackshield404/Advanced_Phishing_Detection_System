import os
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(
    BASE_DIR,
    "dataset",
    "PhiUSIIL_Phishing_URL_Dataset.csv"
)

df = pd.read_csv(DATASET_PATH)

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

X = df[FEATURES].fillna(0)
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


def evaluate(name, features):

    model = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced"
    )

    model.fit(X_train[features], y_train)

    predictions = model.predict(X_test[features])

    print()
    print("=" * 55)
    print(name)
    print("=" * 55)

    print(f"Accuracy : {accuracy_score(y_test, predictions):.4f}")
    print(
        f"Precision: "
        f"{precision_score(y_test, predictions, pos_label=0):.4f}"
    )
    print(
        f"Recall   : "
        f"{recall_score(y_test, predictions, pos_label=0):.4f}"
    )
    print(
        f"F1 Score : "
        f"{f1_score(y_test, predictions, pos_label=0):.4f}"
    )


# Full model
evaluate(
    "MODEL WITH HTTPS",
    FEATURES
)

# Remove HTTPS
features_without_https = [
    feature for feature in FEATURES
    if feature != "IsHTTPS"
]

evaluate(
    "MODEL WITHOUT HTTPS",
    features_without_https
)