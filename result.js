/* =========================================
   PHISHKAVACH — RESULT ANALYSIS
========================================= */


/* =========================================
   GET URL FROM HOMEPAGE
========================================= */

const params = new URLSearchParams(window.location.search);

let submittedURL = params.get("url");

if (!submittedURL) {
    window.location.replace("index.html");
} else {


/* =========================================
   PARSE URL
========================================= */

function parseURL(url) {

    try {
        return new URL(url);
    }

    catch (error) {
        return null;
    }
}


const parsedURL = parseURL(submittedURL);


/* =========================================
   KEYWORD LIST
========================================= */

const suspiciousKeywords = [
    "login",
    "signin",
    "verify",
    "verification",
    "account",
    "password",
    "secure",
    "security",
    "update",
    "confirm",
    "payment",
    "wallet",
    "bank",
    "billing",
    "recover",
    "unlock",
    "suspend"
];


/* =========================================
   FIND KEYWORDS
========================================= */

function findKeywords(url) {

    const lowerURL = url.toLowerCase();

    return suspiciousKeywords.filter(keyword =>
        lowerURL.includes(keyword)
    );
}


/* =========================================
   ANALYZE URL
========================================= */

function analyzeURL(url) {

    const parsed = parseURL(url);

    if (!parsed) {

        return {
            valid: false
        };
    }


    const hostname = parsed.hostname;

    const pathname = parsed.pathname;

    const fullURL = parsed.href;


    return {

        valid: true,

        protocol:
            parsed.protocol.replace(":", ""),

        https:
            parsed.protocol === "https:",

        hostname:
            hostname,

        pathname:
            pathname || "/",

        urlLength:
            fullURL.length,

        domainLength:
            hostname.length,

        pathLength:
            pathname.length,

        subdomains:
            Math.max(hostname.split(".").length - 2, 0),

        dots:
            (hostname.match(/\./g) || []).length,

        hyphens:
            (hostname.match(/-/g) || []).length,

        hasIP:
            /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname),

        hasAt:
            fullURL.includes("@"),

        encoded:
            /%[0-9A-Fa-f]{2}/.test(fullURL),

        doubleSlash:
            pathname.includes("//"),

        keywords:
            findKeywords(fullURL),

        tld:
            hostname.split(".").pop()

    };
}


const analysis = analyzeURL(submittedURL);


/* =========================================
   CALCULATE RISK
========================================= */

function calculateRisk(data) {

    if (!data.valid) {

        return {

            score: 0,

            level: "INVALID",

            confidence: 0,

            reasons: []

        };
    }


    let score = 0;

    const reasons = [];


    /* -------------------------------------
       HTTP
    ------------------------------------- */

    if (!data.https) {

        score += 12;

        reasons.push({

            type: "CONNECTION",

            title: "HTTP connection detected",

            value: data.protocol,

            explanation:
                "The submitted URL uses HTTP instead of HTTPS. " +
                "This provides less transport security than HTTPS. " +
                "However, HTTP alone does not prove that a website is phishing."

        });
    }


    /* -------------------------------------
       LONG URL
    ------------------------------------- */

    if (data.urlLength > 100) {

        score += 12;

        reasons.push({

            type: "URL STRUCTURE",

            title: "Unusually long URL",

            value:
                data.urlLength + " characters",

            explanation:
                "The submitted URL is unusually long. Long URLs " +
                "can sometimes be used to hide important parts of " +
                "a destination or create deceptive URL structures."

        });
    }


    /* -------------------------------------
       IP ADDRESS
    ------------------------------------- */

    if (data.hasIP) {

        score += 20;

        reasons.push({

            type: "DOMAIN",

            title: "IP address used as hostname",

            value:
                data.hostname,

            explanation:
                "Instead of using a conventional domain name, " +
                "the submitted URL points directly to an IP address. " +
                "This can be legitimate, but it deserves additional scrutiny."

        });
    }


    /* -------------------------------------
       @ SYMBOL
    ------------------------------------- */

    if (data.hasAt) {

        score += 20;

        reasons.push({

            type: "URL STRUCTURE",

            title: "The URL contains an @ symbol",

            value:
                "@",

            explanation:
                "An @ symbol can make a URL appear different from " +
                "its actual destination and has historically been used " +
                "in deceptive URLs."

        });
    }


    /* -------------------------------------
       ENCODING
    ------------------------------------- */

    if (data.encoded) {

        score += 8;

        reasons.push({

            type: "OBFUSCATION",

            title: "Encoded characters detected",

            value:
                "URL encoding present",

            explanation:
                "The URL contains encoded characters. URL encoding " +
                "is legitimate in many websites, but unusual or extensive " +
                "encoding can make a destination harder to inspect."

        });
    }


    /* -------------------------------------
       DOUBLE SLASH
    ------------------------------------- */

    if (data.doubleSlash) {

        score += 8;

        reasons.push({

            type: "URL STRUCTURE",

            title: "Repeated path separators detected",

            value:
                "//",

            explanation:
                "The path contains repeated slash characters. " +
                "This can occur legitimately, but unusual URL structures " +
                "deserve additional inspection."

        });
    }


    /* -------------------------------------
       MANY HYPHENS
    ------------------------------------- */

    if (data.hyphens >= 3) {

        score += 7;

        reasons.push({

            type: "DOMAIN",

            title: "Multiple hyphens in hostname",

            value:
                data.hyphens + " hyphens",

            explanation:
                "The hostname contains several hyphens. This is not " +
                "proof of phishing, but unusual domain construction " +
                "can become more significant when combined with other signals."

        });
    }


    /* -------------------------------------
       SUSPICIOUS KEYWORDS
    ------------------------------------- */

    if (data.keywords.length >= 2) {

        score += 15;

        reasons.push({

            type: "URL CONTENT",

            title: "Multiple security-related terms detected",

            value:
                data.keywords.join(", "),

            explanation:
                "The submitted URL contains terms associated with " +
                "login, account, verification, payment, or security actions. " +
                "Attackers may use such language to make phishing pages " +
                "appear relevant or trustworthy."

        });
    }


    /* -------------------------------------
       LIMIT SCORE
    ------------------------------------- */

    score = Math.min(score, 100);


    /* -------------------------------------
       DETERMINE LEVEL
    ------------------------------------- */

    let level;


    if (score >= 70) {

        level = "HIGH RISK";

    }

    else if (score >= 40) {

        level = "SUSPICIOUS";

    }

    else {

        level = "LOW RISK";

    }


    /* -------------------------------------
       CONFIDENCE
    ------------------------------------- */

    const confidence =
        Math.min(
            55 + (reasons.length * 7),
            94
        );


    return {

        score,

        level,

        confidence,

        reasons

    };
}


const risk = calculateRisk(analysis);


/* =========================================
   DISPLAY SCANNED URL
========================================= */

const scannedURL =
    document.getElementById("scannedUrl");


if (scannedURL) {

    scannedURL.textContent =
        submittedURL;
}


/* =========================================
   DISPLAY URL PARTS
========================================= */

function renderURLParts() {

    const container =
        document.getElementById("urlParts");


    if (!container || !parsedURL) {
        return;
    }


    container.innerHTML = `

        <div class="url-part">

            <span>PROTOCOL</span>

            <strong>
                ${escapeHTML(parsedURL.protocol.replace(":", ""))}
            </strong>

        </div>


        <div class="url-part">

            <span>HOSTNAME</span>

            <strong>
                ${escapeHTML(parsedURL.hostname)}
            </strong>

        </div>


        <div class="url-part">

            <span>PATH</span>

            <strong>
                ${escapeHTML(parsedURL.pathname || "/")}
            </strong>

        </div>

    `;
}


renderURLParts();


/* =========================================
   RISK SCORE ANIMATION
========================================= */

function animateRiskScore(target) {

    const scoreElement =
        document.getElementById("riskScore");

    const circle =
        document.getElementById("riskCircle");


    if (!scoreElement || !circle) {
        return;
    }


    const circumference =
        2 * Math.PI * 72;


    circle.style.strokeDasharray =
        circumference;


    circle.style.strokeDashoffset =
        circumference;


    let current = 0;


    const interval =
        setInterval(() => {

            current++;

            scoreElement.textContent =
                current;


            const progress =
                circumference -
                (current / 100) *
                circumference;


            circle.style.strokeDashoffset =
                progress;


            if (current >= target) {

                clearInterval(interval);

            }

        }, 18);
}


animateRiskScore(risk.score);


/* =========================================
   RISK VERDICT
========================================= */

function renderRiskVerdict() {

    const badge =
        document.getElementById("riskBadge");

    const title =
        document.getElementById("riskTitle");

    const description =
        document.getElementById("riskDescription");

    const confidence =
        document.getElementById("confidenceValue");


    if (!badge) {
        return;
    }


    badge.textContent =
        risk.level;


    confidence.textContent =
        risk.confidence + "%";


    if (risk.level === "HIGH RISK") {

        badge.classList.add("risk-high");

        title.textContent =
            "Multiple phishing indicators detected";

        description.textContent =
            "The submitted URL contains multiple characteristics " +
            "that can be associated with phishing activity.";

    }


    else if (risk.level === "SUSPICIOUS") {

        badge.classList.add("risk-medium");

        title.textContent =
            "Some characteristics require caution";

        description.textContent =
            "The submitted URL contains characteristics that " +
            "deserve additional verification before you trust it.";

    }


    else {

        badge.classList.add("risk-low");

        title.textContent =
            "No major phishing indicators detected";

        description.textContent =
            "No major phishing indicators were identified from " +
            "the URL characteristics currently available.";

    }

}


renderRiskVerdict();


/* =========================================
   DETECTION LOGIC
========================================= */

function renderDetectionTrail() {

    const container =
        document.getElementById("detectionTrail");


    if (!container) {
        return;
    }


    if (risk.reasons.length === 0) {

        container.innerHTML = `

            <div class="no-findings">

                <strong>
                    No major URL-level indicators detected
                </strong>

                <p>
                    This does not guarantee that the website is safe.
                    Additional domain, content, reputation and backend
                    checks are required for a complete assessment.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML =
        risk.reasons.map((reason, index) => {

            return `

                <article class="detection-item">

                    <div class="detection-marker">

                        <span>
                            ${String(index + 1).padStart(2, "0")}
                        </span>

                    </div>


                    <div class="detection-content">

                        <div class="detection-meta">
                            ${escapeHTML(reason.type)}
                        </div>


                        <h3>
                            ${escapeHTML(reason.title)}
                        </h3>


                        <div class="actual-value">

                            <span>
                                ACTUAL VALUE
                            </span>

                            <strong>
                                ${escapeHTML(reason.value)}
                            </strong>

                        </div>


                        <div class="why-matters">

                            <strong>
                                WHY IT MATTERS
                            </strong>

                            <p>
                                ${escapeHTML(reason.explanation)}
                            </p>

                        </div>

                    </div>

                </article>

            `;

        }).join("");

}


renderDetectionTrail();


/* =========================================
   URL METRICS
========================================= */

function renderURLMetrics() {

    const container =
        document.getElementById("urlMetrics");


    if (!container || !analysis.valid) {
        return;
    }


    const metrics = [

        ["URL length", analysis.urlLength + " chars"],

        ["Domain length", analysis.domainLength + " chars"],

        ["Path length", analysis.pathLength + " chars"],

        ["Subdomains", analysis.subdomains],

        ["Dots", analysis.dots],

        ["Hyphens", analysis.hyphens],

        [
            "IP address",
            analysis.hasIP
                ? "Detected"
                : "Not detected"
        ],

        [
            "@ symbol",
            analysis.hasAt
                ? "Detected"
                : "Not detected"
        ],

        [
            "HTTPS",
            analysis.https
                ? "Enabled"
                : "Not used"
        ]

    ];


    container.innerHTML =
        metrics.map(metric => `

            <div class="metric-row">

                <span>
                    ${metric[0]}
                </span>

                <strong>
                    ${metric[1]}
                </strong>

            </div>

        `).join("");

}


renderURLMetrics();


/* =========================================
   SSL / HTTPS
========================================= */

function renderSSL() {

    const container =
        document.getElementById("sslAnalysis");


    if (!container || !analysis.valid) {
        return;
    }


    if (analysis.https) {

        container.innerHTML = `

            <div class="ssl-status ssl-positive">

                <span>✓</span>

                HTTPS detected

            </div>


            <p>
                The submitted URL uses HTTPS.
                Certificate validity and TLS configuration
                will be verified by the backend.
            </p>

        `;

    }


    else {

        container.innerHTML = `

            <div class="ssl-status ssl-warning">

                <span>!</span>

                HTTPS not detected

            </div>


            <p>
                The submitted URL uses HTTP.
                This is a security concern, but it does not
                independently prove phishing.
            </p>

        `;

    }

}


renderSSL();


/* =========================================
   ML SECTION
========================================= */

const mlPrediction =
    document.getElementById("mlPrediction");


const mlProbability =
    document.getElementById("mlProbability");


if (mlPrediction) {

    mlPrediction.textContent =
        "Pending backend";

}


if (mlProbability) {

    mlProbability.textContent =
        "—";

}


/* =========================================
   FINAL ASSESSMENT
========================================= */

const finalTitle =
    document.getElementById("finalTitle");


const finalDescription =
    document.getElementById("finalDescription");


if (finalTitle) {

    finalTitle.textContent =
        risk.level;

}


if (finalDescription) {

    if (risk.reasons.length > 0) {

        finalDescription.textContent =
            "PhishKavach identified " +
            risk.reasons.length +
            " URL-level characteristic(s) that contributed " +
            "to this assessment. The final backend risk engine " +
            "will combine these findings with domain, reputation, " +
            "SSL and ML evidence.";

    }

    else {

        finalDescription.textContent =
            "No major URL-level phishing indicators were identified. " +
            "A complete assessment will require additional backend checks.";

    }

}


/* =========================================
   FINAL SIGNALS
========================================= */

const finalSignals =
    document.getElementById("finalSignals");


if (finalSignals) {

    finalSignals.innerHTML =
        risk.reasons
            .slice(0, 4)
            .map(reason => `

                <span>
                    ⚠ ${escapeHTML(reason.title)}
                </span>

            `)
            .join("");

}


/* =========================================
   HTML SECURITY
========================================= */

function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}