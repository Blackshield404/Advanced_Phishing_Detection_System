from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from urllib.parse import urlparse
import requests
import base64
import socket
import re
import ipaddress
import os
import ssl
import joblib
import pandas as pd
import requests

from datetime import datetime, timezone

from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.x509.oid import NameOID

from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# SUPABASE CONFIGURATION
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

print("SUPABASE URL configured:", bool(SUPABASE_URL))
print("SUPABASE KEY configured:", bool(SUPABASE_ANON_KEY))

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("Supabase configuration is missing.")

def get_supabase_client(access_token: str):

    client = create_client(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    )

    

    # Verify the user's Supabase access token
    user_response = client.auth.get_user(access_token)

    # Use this user's token for database operations
    client.postgrest.auth(access_token)

    return client, user_response.user

    



# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "ml",
    "model",
    "phishing_model.pkl"
)


# ============================================================
# LOAD ML MODEL
# ============================================================

try:

    saved_model = joblib.load(MODEL_PATH)

    ML_MODEL = saved_model["model"]
    ML_FEATURES = saved_model["features"]

    MODEL_STATUS = "loaded"

except Exception as error:

    ML_MODEL = None
    ML_FEATURES = []

    MODEL_STATUS = f"error: {error}"


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="PhishKavach API",
    description="Phishing URL Detection Backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class URLRequest(BaseModel):
    url: str


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "status": "online",
        "service": "PhishKavach",
        "ml_model": MODEL_STATUS
    }


# ============================================================
# IP CHECK
# ============================================================

def is_ip_address(hostname):

    try:

        ipaddress.ip_address(hostname)

        return True

    except ValueError:

        return False


# ============================================================
# DOMAIN AGE / RDAP ANALYSIS
# ============================================================

def get_domain_age_info(hostname):

    result = {

        "status": "UNAVAILABLE",

        "registered": None,

        "domain_age_days": None,

        "domain_age": None,

        "error": None

    }

    try:

        # ----------------------------------------------------
        # Clean hostname
        # ----------------------------------------------------

        domain = hostname.lower().strip()

        if domain.startswith("www."):

            domain = domain[4:]

        # ----------------------------------------------------
        # IP addresses do not have domain registration data
        # ----------------------------------------------------

        if is_ip_address(domain):

            result["error"] = (
                "IP addresses do not have domain registration data."
            )

            return result

        # ----------------------------------------------------
        # RDAP lookup
        # ----------------------------------------------------

        rdap_url = (
            f"https://rdap.org/domain/{domain}"
        )

        response = requests.get(

            rdap_url,

            timeout=10,

            headers={
                "Accept": "application/rdap+json"
            }

        )

        if response.status_code != 200:

            result["error"] = (
                f"RDAP returned HTTP "
                f"{response.status_code}."
            )

            return result

        data = response.json()

        # ----------------------------------------------------
        # Find registration event
        # ----------------------------------------------------

        registration_date = None

        for event in data.get("events", []):

            if event.get("eventAction") == "registration":

                registration_date = event.get(
                    "eventDate"
                )

                break

        if not registration_date:

            result["error"] = (
                "Domain registration date "
                "was not provided by RDAP."
            )

            return result

        # ----------------------------------------------------
        # Parse registration date
        # ----------------------------------------------------

        registered_date = datetime.fromisoformat(

            registration_date.replace(
                "Z",
                "+00:00"
            )

        )

        # ----------------------------------------------------
        # Current UTC time
        # ----------------------------------------------------

        now = datetime.now(
            timezone.utc
        )

        # ----------------------------------------------------
        # Domain age
        # ----------------------------------------------------

        age_days = max(

            0,

            (now - registered_date).days

        )

        # ----------------------------------------------------
        # Convert age into years / months / days
        # ----------------------------------------------------

        years = age_days // 365

        remaining_days = age_days % 365

        months = remaining_days // 30

        days = remaining_days % 30

        # ----------------------------------------------------
        # Human-readable age
        # ----------------------------------------------------

        if years > 0:

            if months > 0:

                age_text = (
                    f"{years} Years, "
                    f"{months} Months"
                )

            else:

                age_text = (
                    f"{years} Years"
                )

        elif months > 0:

            if days > 0:

                age_text = (
                    f"{months} Months, "
                    f"{days} Days"
                )

            else:

                age_text = (
                    f"{months} Months"
                )

        else:

            age_text = (
                f"{days} Days"
            )

        # ----------------------------------------------------
        # Final result
        # ----------------------------------------------------

        result.update({

            "status": "AVAILABLE",

            "registered":
                registered_date.strftime(
                    "%d %b %Y"
                ),

            "domain_age_days":
                age_days,

            "domain_age":
                age_text

        })

        return result

    except requests.RequestException as error:

        result["error"] = (
            f"RDAP request failed: {error}"
        )

        return result

    except ValueError as error:

        result["error"] = (
            f"Invalid RDAP date: {error}"
        )

        return result

    except Exception as error:

        result["error"] = str(error)

        return result


# ============================================================
# SSL / TLS CERTIFICATE ANALYSIS
# ============================================================

def get_ssl_certificate_info(hostname):

    result = {

        "status": "UNAVAILABLE",

        "issuer": None,

        "issued": None,

        "expires": None,

        "cert_age_days": None,

        "error": None

    }

    try:

        # ----------------------------------------------------
        # Create SSL context.
        #
        # CERT_NONE is intentionally used only for retrieving
        # the certificate itself. We inspect the certificate
        # separately below.
        # ----------------------------------------------------

        context = ssl.SSLContext(
            ssl.PROTOCOL_TLS_CLIENT
        )

        context.check_hostname = False

        context.verify_mode = ssl.CERT_NONE

        # ----------------------------------------------------
        # Connect to HTTPS port 443
        # ----------------------------------------------------

        with socket.create_connection(

            (hostname, 443),

            timeout=8

        ) as sock:

            with context.wrap_socket(

                sock,

                server_hostname=hostname

            ) as secure_socket:

                certificate_der = (
                    secure_socket.getpeercert(
                        binary_form=True
                    )
                )

        if not certificate_der:

            result["error"] = (
                "The server did not provide "
                "a TLS certificate."
            )

            return result

        # ----------------------------------------------------
        # Parse certificate
        # ----------------------------------------------------

        certificate = (
            x509.load_der_x509_certificate(
                certificate_der,
                default_backend()
            )
        )

        # ----------------------------------------------------
        # ISSUER
        # ----------------------------------------------------

        issuer_attributes = (
            certificate.issuer.get_attributes_for_oid(
                NameOID.ORGANIZATION_NAME
            )
        )

        if issuer_attributes:

            issuer = issuer_attributes[0].value

        else:

            common_name_attributes = (
                certificate.issuer.get_attributes_for_oid(
                    NameOID.COMMON_NAME
                )
            )

            if common_name_attributes:

                issuer = (
                    common_name_attributes[0].value
                )

            else:

                issuer = "Unknown"

        # ----------------------------------------------------
        # CERTIFICATE DATES
        # ----------------------------------------------------

        try:

            issued_date = (
                certificate.not_valid_before_utc
            )

        except AttributeError:

            issued_date = (
                certificate.not_valid_before.replace(
                    tzinfo=timezone.utc
                )
            )

        try:

            expiry_date = (
                certificate.not_valid_after_utc
            )

        except AttributeError:

            expiry_date = (
                certificate.not_valid_after.replace(
                    tzinfo=timezone.utc
                )
            )

        # ----------------------------------------------------
        # CURRENT TIME
        # ----------------------------------------------------

        now = datetime.now(
            timezone.utc
        )

        # ----------------------------------------------------
        # CERTIFICATE AGE
        # ----------------------------------------------------

        cert_age_days = max(

            0,

            (now - issued_date).days

        )

        # ----------------------------------------------------
        # CERTIFICATE VALIDITY
        # ----------------------------------------------------

        if issued_date <= now <= expiry_date:

            certificate_status = "VALID"

        elif now < issued_date:

            certificate_status = "NOT_YET_VALID"

        else:

            certificate_status = "EXPIRED"

        # ----------------------------------------------------
        # FINAL RESULT
        # ----------------------------------------------------

        result.update({

            "status":
                certificate_status,

            "issuer":
                issuer,

            "issued":
                issued_date.strftime(
                    "%d %b %Y"
                ),

            "expires":
                expiry_date.strftime(
                    "%d %b %Y"
                ),

            "cert_age_days":
                cert_age_days

        })

        return result

    except socket.timeout:

        result["error"] = (
            "TLS connection timed out."
        )

        return result

    except ConnectionRefusedError:

        result["error"] = (
            "HTTPS connection was refused."
        )

        return result

    except ssl.SSLError as error:

        result["error"] = (
            f"SSL/TLS error: {error}"
        )

        return result

    except Exception as error:

        result["error"] = str(error)

        return result


# ============================================================
# EXTRACT ML FEATURES
# ============================================================

def extract_ml_features(
    url,
    parsed,
    hostname
):

        # Normalize homepage URLs by removing a single root slash.
    # This ensures equivalent homepage URLs get identical ML features.
    if parsed.path == "/" and not parsed.query and not parsed.fragment:
        url = url.rstrip("/")
        parsed = urlparse(url)
        hostname = parsed.hostname or hostname

    url_length = len(url)

    domain_length = len(hostname)

    is_domain_ip = int(
        is_ip_address(hostname)
    )

    domain_parts = hostname.split(".")

    no_of_subdomain = max(
        0,
        len(domain_parts) - 2
    )

    # --------------------------------------------------------
    # OBFUSCATION
    # --------------------------------------------------------

    encoded_matches = re.findall(
        r"%[0-9A-Fa-f]{2}",
        url
    )

    no_of_obfuscated_char = len(
        encoded_matches
    )

    has_obfuscation = int(
        no_of_obfuscated_char > 0
    )

    obfuscation_ratio = (

        no_of_obfuscated_char / url_length

        if url_length > 0

        else 0

    )

    # --------------------------------------------------------
    # LETTERS
    # --------------------------------------------------------

    no_of_letters = sum(

        char.isalpha()

        for char in url

    )

    letter_ratio = (

        no_of_letters / url_length

        if url_length > 0

        else 0

    )

    # --------------------------------------------------------
    # DIGITS
    # --------------------------------------------------------

    no_of_digits = sum(

        char.isdigit()

        for char in url

    )

    digit_ratio = (

        no_of_digits / url_length

        if url_length > 0

        else 0

    )

    # --------------------------------------------------------
    # SPECIAL CHARACTERS
    # --------------------------------------------------------

    no_of_equals = url.count("=")

    no_of_question_marks = url.count("?")

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

    # --------------------------------------------------------
    # HTTPS
    # --------------------------------------------------------

    is_https = int(

        parsed.scheme.lower() == "https"

    )

    return {

        "URLLength":
            url_length,

        "DomainLength":
            domain_length,

        "IsDomainIP":
            is_domain_ip,

        "NoOfSubDomain":
            no_of_subdomain,

        "HasObfuscation":
            has_obfuscation,

        "NoOfObfuscatedChar":
            no_of_obfuscated_char,

        "ObfuscationRatio":
            obfuscation_ratio,

        "NoOfLettersInURL":
            no_of_letters,

        "LetterRatioInURL":
            letter_ratio,

        "NoOfDegitsInURL":
            no_of_digits,

        "DegitRatioInURL":
            digit_ratio,

        "NoOfEqualsInURL":
            no_of_equals,

        "NoOfQMarkInURL":
            no_of_question_marks,

        "NoOfAmpersandInURL":
            no_of_ampersand,

        "NoOfOtherSpecialCharsInURL":
            no_of_other_special,

        "SpacialCharRatioInURL":
            special_ratio,

        "IsHTTPS":
            is_https

    }


# ============================================================
# RULE-BASED ANALYSIS
# ============================================================

def analyze_url_rules(
    url,
    parsed,
    hostname
):

    findings = []

    score = 0

    # --------------------------------------------------------
    # URL LENGTH
    # --------------------------------------------------------

    if len(url) > 120:

        findings.append(
            "Very long URL"
        )

        score += 10

    elif len(url) > 75:

        findings.append(
            "Long URL"
        )

        score += 5

    # --------------------------------------------------------
    # IP ADDRESS
    # --------------------------------------------------------

    if is_ip_address(hostname):

        findings.append(
            "URL uses an IP address instead of a domain"
        )

        score += 25

    # --------------------------------------------------------
    # @ SYMBOL
    # --------------------------------------------------------

    if "@" in url:

        findings.append(
            "URL contains an @ symbol"
        )

        score += 20

    # --------------------------------------------------------
    # SUBDOMAINS
    # --------------------------------------------------------

    subdomain_count = max(

        0,

        len(hostname.split(".")) - 2

    )

    if subdomain_count >= 3:

        findings.append(
            "Multiple subdomains detected"
        )

        score += 10

    # --------------------------------------------------------
    # HYPHENS
    # --------------------------------------------------------

    hyphen_count = hostname.count("-")

    if hyphen_count >= 3:

        findings.append(
            "Multiple hyphens in domain"
        )

        score += 8

    # --------------------------------------------------------
    # DIGITS
    # --------------------------------------------------------

    digit_count = sum(

        char.isdigit()

        for char in hostname

    )

    if digit_count >= 4:

        findings.append(
            "Several digits detected in domain"
        )

        score += 6

    # --------------------------------------------------------
    # ENCODING
    # --------------------------------------------------------

    encoded_count = len(

        re.findall(

            r"%[0-9A-Fa-f]{2}",

            url

        )

    )

    if encoded_count >= 3:

        findings.append(
            "Multiple encoded characters detected"
        )

        score += 8

    # --------------------------------------------------------
    # SUSPICIOUS KEYWORDS
    # --------------------------------------------------------

    suspicious_words = [

        "login",
        "signin",
        "verify",
        "verification",
        "account",
        "password",
        "secure",
        "update",
        "confirm",
        "payment",
        "wallet",
        "bank",
        "billing",
        "recover",
        "unlock",
        "suspend",
        "security"

    ]

    detected_words = [

        word

        for word in suspicious_words

        if word in url.lower()

    ]

    if len(detected_words) >= 2:

        findings.append(

            "Multiple security-related keywords detected: "

            + ", ".join(detected_words)

        )

        score += 15

    elif len(detected_words) == 1:

        findings.append(

            "Security-related keyword detected: "

            + detected_words[0]

        )

        score += 5

    # --------------------------------------------------------
    # HTTP
    # --------------------------------------------------------

    if parsed.scheme.lower() == "http":

        findings.append(
            "Connection does not use HTTPS"
        )

        score += 15

    # --------------------------------------------------------
    # PUNYCODE
    # --------------------------------------------------------

    if "xn--" in hostname.lower():

        findings.append(
            "Internationalized/Punycode domain detected"
        )

        score += 10

    return {

        "score":
            min(score, 100),

        "findings":
            findings,

        "detected_keywords":
            detected_words

    }


# ============================================================
# ML PREDICTION
# ============================================================

def _class_category(label):
    """Map known model labels to PhishKavach's class names.

    This follows the label convention documented in this project:
    0 = phishing and 1 = legitimate. Recognized text labels are
    accepted as well. Unknown labels are not silently misclassified.
    """
    value = str(label).strip().lower().replace("-", "_").replace(" ", "_")

    if value in {
        "0", "0.0", "phishing", "phish", "malicious",
        "malicious_url", "bad", "fraudulent"
    }:
        return "PHISHING"

    if value in {
        "1", "1.0", "legitimate", "legit", "benign",
        "safe", "clean", "good"
    }:
        return "LEGITIMATE"

    return None


def predict_with_ml(features):
    """Predict phishing risk from the saved model and extracted features."""
    if ML_MODEL is None:
        return {
            "status": "UNAVAILABLE",
            "prediction": None,
            "phishing_probability": None,
            "legitimate_probability": None,
            "error": MODEL_STATUS,
        }

    try:
        if not ML_FEATURES:
            raise ValueError("The saved model has no feature list.")

        missing_features = [name for name in ML_FEATURES if name not in features]
        if missing_features:
            raise ValueError(
                "Live feature extraction does not provide model features: "
                + ", ".join(missing_features)
            )

        # Keep feature order exactly as defined when the model was trained.
        feature_values = {name: features[name] for name in ML_FEATURES}
        X_live = pd.DataFrame([feature_values], columns=ML_FEATURES)

        prediction = ML_MODEL.predict(X_live)[0]
        probabilities = ML_MODEL.predict_proba(X_live)[0]
        classes = list(ML_MODEL.classes_)

        if len(classes) != len(probabilities):
            raise ValueError(
                "The model's class list does not match its probability output."
            )

        categories = [_class_category(label) for label in classes]
        if any(category is None for category in categories):
            raise ValueError(
                "Unsupported model class labels: "
                + repr(classes)
                + ". Check the labels used in the training script."
            )
        if len(set(categories)) != len(categories):
            raise ValueError(
                "The model class labels do not uniquely identify phishing "
                "and legitimate URLs: " + repr(classes)
            )

        category_probabilities = {
            category: float(probability)
            for category, probability in zip(categories, probabilities)
        }

        predicted_category = _class_category(prediction)
        if predicted_category is None:
            raise ValueError(
                "The predicted class label is not recognized: "
                + repr(prediction)
                + ". Check the labels used in the training script."
            )

        phishing_probability = category_probabilities.get("PHISHING")
        legitimate_probability = category_probabilities.get("LEGITIMATE")
        if phishing_probability is None or legitimate_probability is None:
            raise ValueError(
                "The model must provide probability scores for both phishing "
                "and legitimate classes. Classes found: " + repr(classes)
            )

        # Temporary diagnostic output for local development.
        print("\n=== PhishKavach ML DEBUG ===")
        print("Expected features:", ML_FEATURES)
        print("Input features:", feature_values)
        print("Model classes:", [repr(label) for label in classes])
        print("Predicted label:", repr(prediction), "=>", predicted_category)
        print(
            "Class probabilities:",
            {
                category: round(probability, 6)
                for category, probability in category_probabilities.items()
            },
        )
        print("============================\n")

        return {
            "status": "AVAILABLE",
            "prediction": predicted_category,
            "phishing_probability": phishing_probability,
            "legitimate_probability": legitimate_probability,
        }

    except Exception as error:
        print("ML prediction error:", repr(error))
        return {
            "status": "ERROR",
            "prediction": None,
            "phishing_probability": None,
            "legitimate_probability": None,
            "error": str(error),
        }


# ============================================================
# COMBINED RISK
# ============================================================

def calculate_final_risk(
    rule_score,
    ml_result
):

    ml_probability = ml_result.get(
        "phishing_probability"
    )

    ml_prediction = ml_result.get(
        "prediction"
    )

    if ml_probability is None:

        final_score = rule_score

    else:

        ml_score = ml_probability * 100

        # ML = 70%
        # Rules = 30%

        final_score = (

            (ml_score * 0.70)

            +

            (rule_score * 0.30)

        )

    final_score = round(

        min(

            max(
                final_score,
                0
            ),

            100

        ),

        2

    )

    # --------------------------------------------------------
    # HIGH RISK
    # --------------------------------------------------------

    if final_score >= 70:

        level = "HIGH RISK"

        if ml_prediction == "PHISHING":

            title = (
                "Machine Learning Detected High Risk"
            )

            description = (

                "The trained machine-learning model classified "
                "this URL as phishing with a very high phishing "
                "probability. This result should be treated as "
                "a strong warning, but model probability alone "
                "does not establish maliciousness with certainty."

            )

        else:

            title = (
                "Multiple Risk Indicators Detected"
            )

            description = (

                "The combined detection engine identified "
                "multiple risk signals associated with potentially "
                "unsafe URLs."

            )

    # --------------------------------------------------------
    # SUSPICIOUS
    # --------------------------------------------------------

    elif final_score >= 40:

        level = "SUSPICIOUS"

        title = "Suspicious URL"

        description = (

            "The combined detection engine identified signals "
            "that may be associated with phishing. Additional "
            "verification is recommended before interacting "
            "with the URL."

        )

    # --------------------------------------------------------
    # NO STRONG INDICATORS
    # --------------------------------------------------------

    else:

        level = "NO STRONG INDICATORS"

        title = (
            "No Strong Phishing Indicators"
        )

        description = (

            "The current detection engine did not identify "
            "strong phishing signals. This does not guarantee "
            "that the URL is safe."

        )

    return {

        "score":
            final_score,

        "level":
            level,

        "title":
            title,

        "description":
            description

    }

# ============================================================
# VIRUSTOTAL THREAT INTELLIGENCE
# ============================================================

def check_virustotal(url):

    api_key = os.getenv("VIRUSTOTAL_API_KEY")

    if not api_key:
        return {
            "status": "NOT_CONFIGURED",
            "message": "VirusTotal API key is missing."
        }

    url_id = base64.urlsafe_b64encode(
        url.encode()
    ).decode().rstrip("=")

    api_url = f"https://www.virustotal.com/api/v3/urls/{url_id}"

    headers = {
        "x-apikey": api_key,
        "accept": "application/json"
    }

    try:

        response = requests.get(
            api_url,
            headers=headers,
            timeout=10
        )

        if response.status_code == 404:
            return {
                "status": "NO_REPORT",
                "message": "No existing VirusTotal report was found."
            }

        if response.status_code == 429:
            return {
                "status": "RATE_LIMITED",
                "message": "VirusTotal API rate limit reached."
            }

        if response.status_code in (401, 403):
            return {
                "status": "ERROR",
                "message": "VirusTotal API authentication failed."
            }

        response.raise_for_status()

        data = response.json()

        attributes = data.get(
            "data", {}
        ).get(
            "attributes", {}
        )

        stats = attributes.get(
            "last_analysis_stats", {}
        )

        malicious = stats.get("malicious", 0)
        suspicious = stats.get("suspicious", 0)

        if malicious > 0:
            verdict = "MALICIOUS"
        elif suspicious > 0:
            verdict = "SUSPICIOUS"
        else:
            verdict = "NO_DETECTIONS"

        return {
            "status": "AVAILABLE",
            "verdict": verdict,
            "message": "VirusTotal report retrieved successfully.",
            "malicious": malicious,
            "suspicious": suspicious,
            "harmless": stats.get("harmless", 0),
            "undetected": stats.get("undetected", 0),
            "total": sum(stats.values())
        }

    except requests.exceptions.RequestException:
        return {
            "status": "UNAVAILABLE",
            "message": "Could not connect to VirusTotal."
        }

    except (ValueError, TypeError):
        return {
            "status": "ERROR",
            "message": "Could not read the VirusTotal report."
        }


# ============================================================
# GOOGLE SAFE BROWSING THREAT INTELLIGENCE
# ============================================================

def check_google_safe_browsing(url):

    api_key = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")

    if not api_key:
        return {
            "status": "NOT_CONFIGURED",
            "message": "Google Safe Browsing API key is missing."
        }

    api_url = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

    params = {
        "key": api_key
    }

    payload = {
        "client": {
            "clientId": "phishkavach",
            "clientVersion": "1.0"
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION"
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [
                {"url": url}
            ]
        }
    }

    try:

        response = requests.post(
            api_url,
            params=params,
            json=payload,
            timeout=10
        )

        if response.status_code == 429:
            return {
                "status": "RATE_LIMITED",
                "message": "Google Safe Browsing rate limit reached."
            }

        if response.status_code in (400, 401, 403):
            return {
                "status": "ERROR",
                "message": "Google Safe Browsing API request failed. Check API configuration."
            }

        response.raise_for_status()

        if not response.content:
            return {
                "status": "ERROR",
                "http_code": response.status_code,
                "content_type": response.headers.get("Content-Type"),
                "message": "Google returned an empty response."
            }

        try:
            data = response.json()

        except ValueError:
            return {
                "status": "ERROR",
                "http_code": response.status_code,
                "content_type": response.headers.get("Content-Type"),
                "message": "Google returned a non-JSON response.",
                "details": response.text[:300]
            }

        threats = data.get("matches", [])

        if threats:
            threat_types = sorted({
                threat.get("threatType")
                for threat in threats
                if threat.get("threatType")
            })

            return {
                "status": "AVAILABLE",
                "verdict": "UNSAFE",
                "message": "Google Safe Browsing detected a threat.",
                "threat_types": threat_types,
                "matches": len(threats)
            }

        return {
            "status": "AVAILABLE",
            "verdict": "NO_DETECTIONS",
            "message": "Google Safe Browsing found no matching threats.",
            "threat_types": [],
            "matches": 0
        }

    except requests.exceptions.HTTPError as e:
        return {
            "status": "ERROR",
            "http_code": e.response.status_code if e.response is not None else None,
            "message": "Google Safe Browsing HTTP error.",
            "details": e.response.text[:300] if e.response is not None else str(e)
        }

    except requests.exceptions.RequestException as e:
        return {
            "status": "UNAVAILABLE",
            "message": "Google Safe Browsing connection failed.",
            "details": str(e)
        }

    except (ValueError, TypeError):
        return {
            "status": "ERROR",
            "message": "Could not read Google Safe Browsing response."
        }

# ============================================================
# ANALYZE URL
# ============================================================

@app.post("/api/analyze")
def analyze_url(
    request: URLRequest,
    authorization: str = Header(default=None)
):

    # VERIFY USER AUTHENTICATION
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Please log in to continue."
        )

    access_token = authorization.split(" ", 1)[1]

    try:
        client, user = get_supabase_client(access_token)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired login session."
        )

    # CHECK MONTHLY SCAN LIMIT
    try:
        quota_response = client.rpc(
            "use_monthly_scan", {}
        ).execute()

        usage = (
            quota_response.data[0]
            if quota_response.data
            else None
        )

        if not usage or not usage["allowed"]:
            raise HTTPException(
                status_code=429,
                detail="Monthly scanning limit reached."
            )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Could not verify scan limit: " + str(e)
        )

    url = request.url.strip()

    # --------------------------------------------------------
    # ADD HTTPS IF PROTOCOL IS MISSING
    # --------------------------------------------------------

    if not url.startswith(
        ("http://", "https://")
    ):

        url = "https://" + url

    parsed = urlparse(url)

    hostname = parsed.hostname

    if not hostname:

        return {

            "success":
                False,

            "error":
                "Invalid URL"

        }

    # --------------------------------------------------------
    # DNS
    # --------------------------------------------------------

    try:

        ip_address = socket.gethostbyname(
            hostname
        )

        dns_status = "Resolved"

    except socket.gaierror:

        ip_address = None

        dns_status = "Could not resolve"

    # --------------------------------------------------------
    # DOMAIN AGE / RDAP
    # --------------------------------------------------------

    domain_age_info = get_domain_age_info(
        hostname
    )

    # --------------------------------------------------------
    # SSL / TLS
    # --------------------------------------------------------

    if parsed.scheme.lower() == "https":

        ssl_info = get_ssl_certificate_info(
            hostname
        )

    else:

        ssl_info = {

            "status":
                "NOT_APPLICABLE",

            "issuer":
                None,

            "issued":
                None,

            "expires":
                None,

            "cert_age_days":
                None,

            "error":
                "URL does not use HTTPS."

        }

    # --------------------------------------------------------
    # FEATURES
    # --------------------------------------------------------

    features = extract_ml_features(

        url,

        parsed,

        hostname

    )

    # --------------------------------------------------------
    # RULES
    # --------------------------------------------------------

    rule_analysis = analyze_url_rules(

        url,

        parsed,

        hostname

    )

    # --------------------------------------------------------
    # ML
    # --------------------------------------------------------

    ml_result = predict_with_ml(
        features
    )

    # --------------------------------------------------------
    # FINAL RISK
    # --------------------------------------------------------

    final_risk = calculate_final_risk(

        rule_analysis["score"],

        ml_result

    )

    # --------------------------------------------------------
    # VIRUSTOTAL THREAT INTELLIGENCE
    # --------------------------------------------------------

    virustotal_result = check_virustotal(url)

    google_result = check_google_safe_browsing(url)

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "success":
            True,

        "url":
            url,

        "analysis": {

            "protocol":
                parsed.scheme,

            "hostname":
                hostname,

            "path":
                parsed.path,

            "query":
                parsed.query,

            "url_length":
                len(url),

            "domain_length":
                len(hostname),

            "https":
                parsed.scheme.lower() == "https",

            # ------------------------------------------------
            # DNS
            # ------------------------------------------------

            "dns": {

                "status":
                    dns_status,

                "ip":
                    ip_address

            },

            # ------------------------------------------------
            # DOMAIN INTELLIGENCE
            # ------------------------------------------------

            "domain": {

                "hostname":
                    hostname,

                "dns_status":
                    dns_status,

                "registration_date":
                    domain_age_info.get(
                        "registered"
                    ),

                "domain_age":
                    domain_age_info.get(
                        "domain_age"
                    ),

                "domain_age_days":
                    domain_age_info.get(
                        "domain_age_days"
                    ),

                "status":
                    domain_age_info.get(
                        "status"
                    ),

                "error":
                    domain_age_info.get(
                        "error"
                    )

            },

            # ------------------------------------------------
            # SSL / TLS
            # ------------------------------------------------

            "ssl":
                ssl_info

        },

        # ----------------------------------------------------
        # RULE ANALYSIS
        # ----------------------------------------------------

        "rule_analysis":
            rule_analysis,

        # ----------------------------------------------------
        # MACHINE LEARNING
        # ----------------------------------------------------

        "machine_learning":
            ml_result,

        # ----------------------------------------------------
        # FINAL RISK
        # ----------------------------------------------------

                "risk":
            final_risk,

        # THREAT INTELLIGENCE
                "threat_intelligence": {
            "status": (
    "AVAILABLE"
    if virustotal_result.get("status") == "AVAILABLE"
    or google_result.get("status") == "AVAILABLE"
    else "UNAVAILABLE"
),
"message": "Threat intelligence checks completed. Review individual provider results.",
            "providers": {
                "virustotal": virustotal_result,
                "google_safe_browsing": google_result
            }
        }
    }
    