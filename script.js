/* =========================================
   PHISHKAVACH — NAVIGATION
   Fix: active underline, About section,
   first-click behaviour, scroll tracking
========================================= */

/* =========================================
   PHISHKAVACH — SMOOTH NAVIGATION
========================================= */
import { supabase } from "./supabase-client.js";

const navLinks = Array.from(
    document.querySelectorAll(".nav-links a[href^='#']")
);

const navIndicator = document.querySelector(".nav-indicator");
const navContainer = document.querySelector(".nav-links");
const navbar = document.querySelector(".navbar");

const navSections = navLinks
    .map(link => {
        const target = document.querySelector(link.getAttribute("href"));
        return target ? { link, target } : null;
    })
    .filter(Boolean);

let navScrollScheduled = false;
let scrollSpyPaused = false;
let scrollSpyReleaseTimer = null;


/* -----------------------------------------
   MOVE THE UNDERLINE
----------------------------------------- */

function moveIndicator(link, animate = true) {
    if (!link || !navIndicator || !navContainer) return;

    const containerRect = navContainer.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    const targetLeft = linkRect.left - containerRect.left;
    const targetWidth = linkRect.width;

    if (!animate) {
        navIndicator.style.transition = "none";
    }

    navIndicator.style.left = `${targetLeft}px`;
    navIndicator.style.width = `${targetWidth}px`;
    navIndicator.style.opacity = "1";

    if (!animate) {
        // Apply the initial position without animating.
        navIndicator.offsetWidth;
        navIndicator.style.removeProperty("transition");
    }
}


/* -----------------------------------------
   SET THE ACTIVE NAVIGATION LINK
----------------------------------------- */

function setActiveLink(link, animate = true) {
    if (!link) return;

    const alreadyActive = link.classList.contains("active");

    navLinks.forEach(item => {
        item.classList.toggle("active", item === link);
    });

    // Do not restart the animation unnecessarily.
    if (!alreadyActive || !animate) {
        moveIndicator(link, animate);
    }
}


/* -----------------------------------------
   UPDATE ACTIVE LINK DURING MANUAL SCROLLING
----------------------------------------- */

function updateActiveNav() {
    if (!navSections.length || scrollSpyPaused) return;

    const reachedBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 5;

    if (reachedBottom) {
        const lastLink = navSections[navSections.length - 1].link;

        if (!lastLink.classList.contains("active")) {
            setActiveLink(lastLink);
        }

        return;
    }

    const navbarHeight = navbar ? navbar.offsetHeight : 0;
    const activationPoint = navbarHeight + 60;

    let currentSection = navSections[0];

    for (const section of navSections) {
        if (
            section.target.getBoundingClientRect().top <=
            activationPoint
        ) {
            currentSection = section;
        }
    }

    if (!currentSection.link.classList.contains("active")) {
        setActiveLink(currentSection.link);
    }
}


/* -----------------------------------------
   RELEASE SCROLL TRACKING AFTER NAVIGATION
----------------------------------------- */

function releaseScrollSpy() {
    scrollSpyPaused = false;

    if (scrollSpyReleaseTimer) {
        clearTimeout(scrollSpyReleaseTimer);
        scrollSpyReleaseTimer = null;
    }

    updateActiveNav();
}


/* -----------------------------------------
   NAVIGATION CLICKS
----------------------------------------- */

navSections.forEach(({ link }) => {
    link.addEventListener("click", () => {
        // Activate the clicked link immediately.
        setActiveLink(link);

        // Prevent scroll tracking from changing the active
        // link while the browser smoothly scrolls to the target.
        scrollSpyPaused = true;

        if (scrollSpyReleaseTimer) {
            clearTimeout(scrollSpyReleaseTimer);
        }

        // Fallback in case no scroll event occurs.
        scrollSpyReleaseTimer = setTimeout(
            releaseScrollSpy,
            500
        );
    });
});


/* -----------------------------------------
   SCROLL TRACKING
----------------------------------------- */

window.addEventListener(
    "scroll",
    () => {
        if (scrollSpyPaused) {
            // Keep waiting until smooth scrolling finishes.
            if (scrollSpyReleaseTimer) {
                clearTimeout(scrollSpyReleaseTimer);
            }

            scrollSpyReleaseTimer = setTimeout(
                releaseScrollSpy,
                500
            );

            return;
        }

        if (navScrollScheduled) return;

        navScrollScheduled = true;

        requestAnimationFrame(() => {
            updateActiveNav();
            navScrollScheduled = false;
        });
    },
    { passive: true }
);


/* -----------------------------------------
   DETECT THE END OF SMOOTH SCROLLING
----------------------------------------- */

window.addEventListener(
    "scrollend",
    releaseScrollSpy,
    { passive: true }
);


/* -----------------------------------------
   INITIALIZE NAVIGATION
----------------------------------------- */

function initializeNavigation() {
    const hashLink = navLinks.find(
        link => link.hash === window.location.hash
    );

    if (hashLink) {
        setActiveLink(hashLink, false);
    } else {
        updateActiveNav();
    }

    requestAnimationFrame(() => {
        const activeLink =
            navLinks.find(link => link.classList.contains("active"));

        if (activeLink) {
            moveIndicator(activeLink, false);
        }

        updateActiveNav();
    });
}

if (document.readyState === "complete") {
    initializeNavigation();
} else {
    window.addEventListener(
        "load",
        initializeNavigation,
        { once: true }
    );
}


/* -----------------------------------------
   RESIZE
----------------------------------------- */

window.addEventListener("resize", () => {
    const activeLink =
        navLinks.find(link => link.classList.contains("active"));

    if (activeLink) {
        moveIndicator(activeLink, false);
    }
});

/* =========================================
   FEEDBACK BUTTONS
========================================= */

const feedbackButtons =
    document.querySelectorAll(
        ".feedback-btn"
    );

const feedbackThanks =
    document.getElementById(
        "feedbackThanks"
    );


feedbackButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            feedbackButtons.forEach(item => {

                item.disabled = true;
                item.style.opacity = "0.6";
                item.style.cursor = "default";

            });

            button.style.opacity = "1";

            if (feedbackThanks) {
                feedbackThanks.style.display =
                    "block";
            }

        }
    );

});


/* =========================================
   PHISHKAVACH URL ANALYZER
========================================= */

const urlInput =
    document.querySelector(
        ".url-input input"
    );

const scanButton =
    document.querySelector(
        ".scan-btn"
    );

const clearButton =
    document.querySelector(
        ".clear-btn"
    );

const pasteButton =
    document.querySelector(
        ".paste-btn"
    );


const scansLeftElement =
    document.querySelector(
        ".scans-left"
    );

    // SCAN LIMIT WARNING POPUP

const scanLimitModal =
    document.getElementById("scanLimitModal");

const closeScanLimit =
    document.getElementById("closeScanLimit");

function showScanLimitModal() {
    if (scanLimitModal) {
        scanLimitModal.classList.add("active");
    }
}

function hideScanLimitModal() {
    if (scanLimitModal) {
        scanLimitModal.classList.remove("active");
    }
}

// Close button
if (closeScanLimit) {
    closeScanLimit.addEventListener(
        "click",
        hideScanLimitModal
    );
}

// Close when clicking outside the popup
if (scanLimitModal) {
    scanLimitModal.addEventListener("click", (event) => {
        if (event.target === scanLimitModal) {
            hideScanLimitModal();
        }
    });
}

    // LOAD MONTHLY SCAN USAGE FROM SUPABASE
async function loadMonthlyScanUsage() {
    try {
        const { data: { user }, error: userError } =
            await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) return;

        const { data, error } = await supabase
            .from("user_scan_usage")
            .select("scans_used, month_start")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) throw error;

        const currentMonth = new Date()
            .toISOString()
            .slice(0, 7);

        const usageMonth = data?.month_start?.slice(0, 7);

        scansLeft =
            usageMonth === currentMonth
                ? 10 - data.scans_used
                : 10;

        if (scansLeftElement) {
            scansLeftElement.textContent =
                `${scansLeft} free scans left`;
        }

    } catch (error) {
        console.error(
            "Could not load monthly scan usage:",
            error.message
        );
    }
}

loadMonthlyScanUsage();

const totalScansElement =
    document.getElementById(
        "totalScans"
    );

const highRiskElement =
    document.getElementById(
        "highRiskCount"
    );

const suspiciousElement =
    document.getElementById(
        "suspiciousCount"
    );

const todayElement =
    document.getElementById(
        "todayScans"
    );


/* =========================================
   SCAN COUNTERS
========================================= */


/*
   These values are now loaded from
   localStorage so they survive page refreshes.
*/

const STATS_STORAGE_KEY =
    "phishKavachStatistics";


function getTodayDate() {

    return new Date()
        .toISOString()
        .split("T")[0];

}


function loadStatistics() {

    const defaultStats = {
        totalScans: 0,
        highRiskCount: 0,
        suspiciousCount: 0,
        todayScans: 0,
        date: getTodayDate()
    };


    try {

        const stored =
            localStorage.getItem(
                STATS_STORAGE_KEY
            );

        if (!stored) {
            return defaultStats;
        }


        const parsed =
            JSON.parse(stored);


        /*
           If the stored date is from
           another day, reset TODAY only.
        */

        if (
            parsed.date !==
            getTodayDate()
        ) {

            parsed.todayScans = 0;
            parsed.date =
                getTodayDate();

        }


        return {
            totalScans:
                Number(parsed.totalScans) || 0,

            highRiskCount:
                Number(parsed.highRiskCount) || 0,

            suspiciousCount:
                Number(parsed.suspiciousCount) || 0,

            todayScans:
                Number(parsed.todayScans) || 0,

            date:
                parsed.date ||
                getTodayDate()
        };

    }

    catch (error) {

        console.warn(
            "Could not load saved statistics:",
            error
        );

        return defaultStats;

    }

}


function saveStatistics() {

    try {

        localStorage.setItem(
            STATS_STORAGE_KEY,
            JSON.stringify({
                totalScans,
                highRiskCount,
                suspiciousCount,
                todayScans,
                date: getTodayDate()
            })
        );

    }

    catch (error) {

        console.warn(
            "Could not save statistics:",
            error
        );

    }

}


const savedStatistics =
    loadStatistics();


let totalScans =
    savedStatistics.totalScans;

let highRiskCount =
    savedStatistics.highRiskCount;

let suspiciousCount =
    savedStatistics.suspiciousCount;

let todayScans =
    savedStatistics.todayScans;


let scansLeft = 10;


/* =========================================
   STATISTICS ANIMATION
========================================= */


/*
   Keeps track of animation frames so that
   a new scan can immediately update the
   numbers if necessary.
*/

const statisticsAnimationFrames = {};


function animateStatistic(
    element,
    targetValue,
    duration = 1800
) {

    if (!element) return;


    /*
       Cancel an existing animation
       for this specific number.
    */

    const elementId =
        element.id;

    if (
        statisticsAnimationFrames[
            elementId
        ]
    ) {

        cancelAnimationFrame(
            statisticsAnimationFrames[
                elementId
            ]
        );

    }


    targetValue =
        Number(targetValue) || 0;


    /*
       The visual animation begins
       from 500 every time the page loads.
    */

    const startValue = 500;

    const startTime =
        performance.now();


    function updateNumber(currentTime) {

        const elapsed =
            currentTime -
            startTime;

        const progress =
            Math.min(
                elapsed / duration,
                1
            );


        /*
           Ease-out effect:
           fast at the beginning,
           slower near the final number.
        */

        const easedProgress =
            1 -
            Math.pow(
                1 - progress,
                3
            );


        const currentValue =
            Math.round(
                startValue +
                (
                    targetValue -
                    startValue
                ) *
                easedProgress
            );


        element.textContent =
            currentValue.toLocaleString();


        if (progress < 1) {

            statisticsAnimationFrames[
                elementId
            ] =
                requestAnimationFrame(
                    updateNumber
                );

        }

        else {

            element.textContent =
                targetValue.toLocaleString();

            statisticsAnimationFrames[
                elementId
            ] = null;

        }

    }


    statisticsAnimationFrames[
        elementId
    ] =
        requestAnimationFrame(
            updateNumber
        );

}


function startStatisticsAnimation() {

    animateStatistic(
        totalScansElement,
        totalScans
    );

    animateStatistic(
        highRiskElement,
        highRiskCount
    );

    animateStatistic(
        suspiciousElement,
        suspiciousCount
    );

    animateStatistic(
        todayElement,
        todayScans
    );

}


/*
   Start the animation shortly after the
   website becomes visible.
*/

window.addEventListener(
    "load",
    () => {

        setTimeout(
            () => {

                startStatisticsAnimation();

            },
            250
        );

    }
);


/* =========================================
   BACKEND URL
========================================= */

const BACKEND_URL =
    "http://127.0.0.1:8000/api/analyze";


/* =========================================
   NORMALIZE URL
========================================= */

function normalizeURL(url) {

    url = url.trim();

    if (
        !/^https?:\/\//i.test(url)
    ) {

        url =
            "https://" + url;

    }

    return url;

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================
   FORMAT BACKEND VALUES
========================================= */

function formatBackendValue(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "Unknown";

    }


    if (
        typeof value === "string"
    ) {

        return value;

    }


    if (
        typeof value === "number" ||
        typeof value === "boolean"
    ) {

        return String(value);

    }


    if (Array.isArray(value)) {

        return value.join(", ");

    }


    if (
        typeof value === "object"
    ) {

        const parts = [];


        Object.entries(value)
            .forEach(
                ([key, val]) => {

                    if (
                        val !== null &&
                        val !== undefined &&
                        val !== ""
                    ) {

                        const readableKey =
                            key
                                .replace(
                                    /_/g,
                                    " "
                                )
                                .replace(
                                    /\b\w/g,
                                    char =>
                                        char.toUpperCase()
                                );


                        parts.push(
                            `${readableKey}: ${val}`
                        );

                    }

                }
            );


        return parts.length > 0
            ? parts.join(" • ")
            : "Available";

    }


    return String(value);

}


/* =========================================
   WEBSITE PREVIEW
========================================= */

function updateWebsitePreview(url) {

    const websitePreviewFrame =
        document.getElementById(
            "websitePreviewFrame"
        );

    const previewURL =
        document.getElementById(
            "previewURL"
        );

    const previewLoading =
        document.getElementById(
            "previewLoading"
        );

    const previewBlocked =
        document.getElementById(
            "previewBlocked"
        );

    const previewStatus =
        document.getElementById(
            "previewStatus"
        );


    if (!websitePreviewFrame) {
        return;
    }


    if (!url) {
        return;
    }


    if (previewURL) {
        previewURL.textContent =
            url;
    }


    if (previewLoading) {
        previewLoading.style.display =
            "flex";
    }


    if (previewBlocked) {
        previewBlocked.style.display =
            "none";
    }


    if (previewStatus) {
        previewStatus.textContent =
            "LOADING PREVIEW";
    }


    /*
       Replace iframe so the previous
       event handlers are removed.
    */

    const newFrame =
        websitePreviewFrame.cloneNode(
            true
        );


    websitePreviewFrame.replaceWith(
        newFrame
    );


    newFrame.src = url;


    newFrame.addEventListener(
        "load",
        () => {

            if (previewLoading) {
                previewLoading.style.display =
                    "none";
            }

            if (previewStatus) {
                previewStatus.textContent =
                    "PREVIEW LOADED";
            }

        }
    );


    newFrame.addEventListener(
        "error",
        () => {

            if (previewLoading) {
                previewLoading.style.display =
                    "none";
            }

            if (previewBlocked) {
                previewBlocked.style.display =
                    "flex";
            }

            if (previewStatus) {
                previewStatus.textContent =
                    "PREVIEW UNAVAILABLE";
            }

        }
    );


    /*
       Some websites block iframe
       embedding without triggering
       iframe.onerror.
    */

    setTimeout(
        () => {

            if (previewLoading) {

                previewLoading.style.display =
                    "none";

            }


            if (
                previewStatus &&
                previewStatus.textContent ===
                "LOADING PREVIEW"
            ) {

                previewStatus.textContent =
                    "PREVIEW LOADED";

            }

        },
        8000
    );

}


/* =========================================
   SCAN COMPLETE TOAST
========================================= */

let scanToastTimer = null;

function hideScanToast() {

    const scanToast =
        document.getElementById("scanToast");

    if (scanToast) {
        scanToast.classList.remove("show");
    }

    if (scanToastTimer) {
        clearTimeout(scanToastTimer);
        scanToastTimer = null;
    }

}


function showScanToast(riskLevel, riskScore) {

    const scanToast =
        document.getElementById("scanToast");

    const scanToastIcon =
        document.getElementById("scanToastIcon");

    const scanToastTitle =
        document.getElementById("scanToastTitle");

    const scanToastMessage =
        document.getElementById("scanToastMessage");

    const scanToastClose =
        document.getElementById("scanToastClose");

    if (!scanToast) {
        return;
    }

    scanToast.classList.remove(
        "toast-high",
        "toast-suspicious",
        "toast-low"
    );

    if (scanToastTimer) {
        clearTimeout(scanToastTimer);
        scanToastTimer = null;
    }

    const normalizedRisk =
        String(riskLevel || "UNKNOWN")
            .trim()
            .toUpperCase();

    if (normalizedRisk === "HIGH RISK") {

        scanToast.classList.add("toast-high");

        if (scanToastIcon) {
            scanToastIcon.textContent = "!";
        }

        if (scanToastTitle) {
            scanToastTitle.textContent =
                "Scan Complete";
        }

        if (scanToastMessage) {
            scanToastMessage.textContent =
                `High Risk detected · ${riskScore}/100`;
        }

    } else if (normalizedRisk === "SUSPICIOUS") {

        scanToast.classList.add("toast-suspicious");

        if (scanToastIcon) {
            scanToastIcon.textContent = "!";
        }

        if (scanToastTitle) {
            scanToastTitle.textContent =
                "Scan Complete";
        }

        if (scanToastMessage) {
            scanToastMessage.textContent =
                `Suspicious URL · ${riskScore}/100`;
        }

    } else if (
        normalizedRisk === "LOW" ||
        normalizedRisk === "SAFE" ||
        normalizedRisk === "NO STRONG INDICATORS"
    ) {

        scanToast.classList.add("toast-low");

        if (scanToastIcon) {
            scanToastIcon.textContent = "✓";
        }

        if (scanToastTitle) {
            scanToastTitle.textContent =
                "Scan Complete";
        }

        if (scanToastMessage) {
            scanToastMessage.textContent =
                `No strong indicators · ${riskScore}/100`;
        }

    } else {

        if (scanToastIcon) {
            scanToastIcon.textContent = "✓";
        }

        if (scanToastTitle) {
            scanToastTitle.textContent =
                "Scan Complete";
        }

        if (scanToastMessage) {
            scanToastMessage.textContent =
                `Analysis ready · ${riskScore}/100`;
        }
    }

    requestAnimationFrame(() => {
        scanToast.classList.add("show");
    });

    scanToastTimer = setTimeout(() => {
        scanToast.classList.remove("show");
        scanToastTimer = null;
    }, 4000);

    if (scanToastClose) {
        scanToastClose.onclick = () => {
            hideScanToast();
        };
    }

}


/* =========================================
   SHOW ERROR
========================================= */

function showScanError(message) {

    const resultSection =
        document.getElementById(
            "scanResultSection"
        );


    if (resultSection) {

        resultSection.style.display =
            "block";

        resultSection.classList.add(
            "active"
        );

    }


    const title =
        document.getElementById(
            "resultRiskTitle"
        );

    const description =
        document.getElementById(
            "resultRiskDescription"
        );

    const badge =
        document.getElementById(
            "resultRiskBadge"
        );

    const score =
        document.getElementById(
            "resultRiskScore"
        );

    const finalTitle =
        document.getElementById(
            "resultFinalTitle"
        );

    const finalDescription =
        document.getElementById(
            "resultFinalDescription"
        );


    if (title) {
        title.textContent =
            "SCAN ERROR";
    }


    if (description) {
        description.textContent =
            message;
    }


    if (badge) {
        badge.textContent =
            "ERROR";
    }


    if (score) {
        score.textContent =
            "—";
    }


    if (finalTitle) {

        finalTitle.textContent =
            "Analysis could not be completed";

    }


    if (finalDescription) {

        finalDescription.textContent =
            message;

    }

}


/* =========================================
   DISPLAY BACKEND RESULT
========================================= */

function displayBackendResult(data) {
    
    const resultSection =
        document.getElementById(
            "scanResultSection"
        );


    if (resultSection) {

        resultSection.style.display =
            "block";

        resultSection.classList.add(
            "active"
        );

    }


    const resultURL =
        document.getElementById(
            "resultURL"
        );

    const resultRiskScore =
        document.getElementById(
            "resultRiskScore"
        );

    const resultRiskBadge =
        document.getElementById(
            "resultRiskBadge"
        );

    const resultRiskTitle =
        document.getElementById(
            "resultRiskTitle"
        );

    const resultRiskDescription =
        document.getElementById(
            "resultRiskDescription"
        );

    const resultConfidence =
        document.getElementById(
            "resultConfidence"
        );


    const risk =
        data.risk || {};

    const analysis =
        data.analysis || {};

    const ruleAnalysis =
        data.rule_analysis || {};

    const ml =
        data.machine_learning || {};

    const threatIntel =
        data.threat_intelligence || {};


    const riskScore =
        typeof risk.score === "number"
            ? Math.round(risk.score)
            : 0;

    /* =====================================
       SCAN COMPLETE TOAST
    ===================================== */

    showScanToast(
        risk.level || "UNKNOWN",
        riskScore
    );


    if (resultURL) {

        resultURL.textContent =
            data.url || "";

    }


    /*
       WEBSITE PREVIEW

       Uses the exact URL returned
       by the backend.
    */

    const investigatedURL =
        data.url || "";


    if (investigatedURL) {

        updateWebsitePreview(
            investigatedURL
        );

    }


    if (resultRiskScore) {

        resultRiskScore.textContent =
            riskScore;

    }


    if (resultRiskBadge) {

        resultRiskBadge.textContent =
            risk.level || "UNKNOWN";

    }


    if (resultRiskTitle) {

        resultRiskTitle.textContent =
            risk.title ||
            "Analysis Complete";

    }


    if (resultRiskDescription) {

        resultRiskDescription.textContent =
            risk.description ||
            "The URL has been analyzed by the PhishKavach backend.";

    }


    /* =====================================
       DETECTION CONFIDENCE
    ===================================== */

    if (resultConfidence) {

        if (
            ml.status ===
            "AVAILABLE"
        ) {

            resultConfidence.textContent =
                "ML + Rule Analysis";

        }

        else {

            resultConfidence.textContent =
                "Rule Analysis";

        }

    }


    /* =====================================
       RISK SCORE CIRCLE
    ===================================== */

    const resultRiskCircle =
        document.getElementById(
            "resultRiskCircle"
        );


    if (resultRiskCircle) {

        const degrees =
            Math.max(
                0,
                Math.min(
                    100,
                    riskScore
                )
            ) * 3.6;


        resultRiskCircle.style.background =
            `conic-gradient(
                #1764f5 ${degrees}deg,
                #e7edf5 ${degrees}deg
            )`;

    }


    /* =====================================
       INVESTIGATION TRAIL
    ===================================== */

    const resultDetectionTrail =
        document.getElementById(
            "resultDetectionTrail"
        );


    if (resultDetectionTrail) {

        const findings =
            ruleAnalysis.findings ||
            [];

        let trailHTML = "";


        /* RULE-BASED FINDINGS */

        if (
            findings.length > 0
        ) {

            trailHTML =
                findings
                    .map(
                        item => {

                            if (
                                typeof item ===
                                "object"
                            ) {

                                const title =
                                    item.title ||
                                    item.name ||
                                    "Security Indicator";


                                const value =
                                    item.value ||
                                    item.detail ||
                                    item.description ||
                                    "";


                                return `
                                    <div class="result-detection-item detection-item">

                                        <span class="result-detection-value">
                                            ${escapeHTML(
                                                formatBackendValue(value)
                                            )}
                                        </span>

                                        <h4>
                                            ${escapeHTML(title)}
                                        </h4>

                                        ${
                                            item.explanation
                                                ? `
                                                    <p>
                                                        <strong>Why it matters:</strong>
                                                        ${escapeHTML(
                                                            item.explanation
                                                        )}
                                                    </p>
                                                `
                                                : ""
                                        }

                                    </div>
                                `;

                            }


                            return `
                                <div class="result-detection-item detection-item">
                                    ${escapeHTML(
                                        formatBackendValue(item)
                                    )}
                                </div>
                            `;

                        }
                    )
                    .join("");

        }

        else {

            trailHTML = `
                <div class="result-detection-item detection-item">

                    <h4>
                        No strong rule-based indicators were detected
                    </h4>

                    <p>
                        The rule engine did not identify strong
                        structural phishing indicators in this URL.
                        The machine-learning result and other
                        technical checks are evaluated separately.
                    </p>

                </div>
            `;

        }


        /* ML FINDING */

        if (
            ml.status ===
            "AVAILABLE"
        ) {

            const phishingProbability =
                Number(
                    ml.phishing_probability ||
                    0
                ) * 100;


            const prediction =
                ml.prediction ||
                "UNKNOWN";


            if (
                prediction ===
                "PHISHING"
            ) {

                trailHTML += `
                    <div class="result-detection-item detection-item">

                        <span class="result-detection-value">
                            ${phishingProbability.toFixed(2)}% phishing probability
                        </span>

                        <h4>
                            Machine-learning model classified the URL as phishing
                        </h4>

                        <p>
                            <strong>Why it matters:</strong>
                            The trained Random Forest model identified
                            the URL's extracted characteristics as
                            being associated with phishing URLs in its
                            training data. This is a strong warning,
                            but model probability alone does not establish
                            maliciousness with certainty.
                        </p>

                    </div>
                `;

            }

            else if (
                prediction ===
                "LEGITIMATE"
            ) {

                trailHTML += `
                    <div class="result-detection-item detection-item">

                        <span class="result-detection-value">
                            ${phishingProbability.toFixed(2)}% phishing probability
                        </span>

                        <h4>
                            Machine-learning model did not classify the URL as phishing
                        </h4>

                        <p>
                            <strong>Why it matters:</strong>
                            The trained model did not identify the
                            extracted URL characteristics as strongly
                            associated with phishing in its training data.
                            This does not guarantee that the URL is safe.
                        </p>

                    </div>
                `;

            }

        }

        else {

            trailHTML += `
                <div class="result-detection-item detection-item">

                    <h4>
                        Machine-learning analysis unavailable
                    </h4>

                    <p>
                        The trained machine-learning model could not
                        provide a prediction for this scan.
                    </p>

                </div>
            `;

        }


        /* DNS FINDING */

        const dns =
            analysis.dns || {};


        const dnsStatus =
            typeof dns === "object"
                ? dns.status
                : dns;


        if (
            dnsStatus &&
            dnsStatus.toLowerCase &&
            dnsStatus
                .toLowerCase()
                .includes("could not")
        ) {

            trailHTML += `
                <div class="result-detection-item detection-item">

                    <span class="result-detection-value">
                        DNS resolution failed
                    </span>

                    <h4>
                        Domain could not be resolved
                    </h4>

                    <p>
                        <strong>Why it matters:</strong>
                        The backend could not resolve this hostname
                        through DNS at the time of analysis. This can
                        occur because a domain is inactive, unavailable,
                        newly registered, misconfigured, or temporarily
                        unreachable. It is an additional signal, not
                        proof of phishing by itself.
                    </p>

                </div>
            `;

        }

        else if (
            dnsStatus &&
            dnsStatus.toLowerCase &&
            dnsStatus
                .toLowerCase()
                .includes("resolved")
        ) {

            trailHTML += `
                <div class="result-detection-item detection-item">

                    <span class="result-detection-value">
                        DNS resolved
                    </span>

                    <h4>
                        Domain resolved successfully
                    </h4>

                    <p>
                        <strong>Why it matters:</strong>
                        The hostname successfully resolved through DNS
                        during the analysis.
                    </p>

                </div>
            `;

        }


        
/* THREAT INTELLIGENCE */

const providers = threatIntel.providers || {};

const vt = providers.virustotal || {};
const google = providers.google_safe_browsing || {};

const vtAvailable = vt.status === "AVAILABLE";
const googleAvailable = google.status === "AVAILABLE";

const vtVerdict = vtAvailable
    ? String(vt.verdict || "UNKNOWN").replace(/_/g, " ")
    : "NOT AVAILABLE";

const googleVerdict = googleAvailable
    ? String(google.verdict || "UNKNOWN").replace(/_/g, " ")
    : "NOT AVAILABLE";

const threatTypes = Array.isArray(google.threat_types)
    ? google.threat_types.join(", ")
    : "None";

trailHTML += `
    <div class="result-detection-item detection-item">

        <h4>External Threat Intelligence</h4>

        <div class="threat-provider">

            <h4>VirusTotal</h4>

            <p>
                <strong>Status:</strong>
                ${escapeHTML(vtAvailable ? "Connected" : "Unavailable")}
            </p>

            <p>
                <strong>Verdict:</strong>
                ${escapeHTML(vtVerdict)}
            </p>

            ${
                vtAvailable
                ? `
                    <p><strong>Malicious:</strong> ${Number(vt.malicious || 0)}</p>
                    <p><strong>Suspicious:</strong> ${Number(vt.suspicious || 0)}</p>
                    <p><strong>Harmless:</strong> ${Number(vt.harmless || 0)}</p>
                    <p><strong>Undetected:</strong> ${Number(vt.undetected || 0)}</p>
                    <p><strong>Total scans:</strong> ${Number(vt.total || 0)}</p>
                `
                : `<p>${escapeHTML(vt.message || "VirusTotal result unavailable.")}</p>`
            }

        </div>

        <div class="threat-provider">

            <h4>Google Safe Browsing</h4>

            <p>
                <strong>Status:</strong>
                ${escapeHTML(googleAvailable ? "Connected" : "Unavailable")}
            </p>

            <p>
                <strong>Verdict:</strong>
                ${escapeHTML(googleVerdict)}
            </p>

            ${
                googleAvailable
                ? `
                    <p><strong>Threat matches:</strong> ${Number(google.matches || 0)}</p>
                    <p><strong>Threat types:</strong> ${escapeHTML(threatTypes)}</p>
                    <p>${escapeHTML(google.message || "")}</p>
                `
                : `<p>${escapeHTML(google.message || "Google Safe Browsing result unavailable.")}</p>`
            }

        </div>

    </div>
`;



        resultDetectionTrail.innerHTML =
            trailHTML;

    }


    /* =====================================
       TECHNICAL ANALYSIS
    ===================================== */

    const resultURLMetrics =
        document.getElementById(
            "resultURLMetrics"
        );


    if (resultURLMetrics) {

        const protocol =
            analysis.protocol ||
            "Unknown";

        const hostname =
            analysis.hostname ||
            "Unknown";

        const path =
            analysis.path ||
            "/";

        const urlLength =
            analysis.url_length ??
            "Unknown";

        const domainLength =
            analysis.domain_length ??
            "Unknown";

        const dnsValue =
            formatBackendValue(
                analysis.dns
            );


        resultURLMetrics.innerHTML = `

            <div class="result-metric">

                <span>
                    Protocol
                </span>

                <strong>
                    ${escapeHTML(protocol)}
                </strong>

            </div>


            <div class="result-metric">

                <span>
                    Hostname
                </span>

                <strong>
                    ${escapeHTML(hostname)}
                </strong>

            </div>


            <div class="result-metric">

                <span>
                    Path
                </span>

                <strong>
                    ${escapeHTML(path)}
                </strong>

            </div>


            <div class="result-metric">

                <span>
                    URL Length
                </span>

                <strong>
                    ${escapeHTML(urlLength)}
                </strong>

            </div>


            <div class="result-metric">

                <span>
                    Domain Length
                </span>

                <strong>
                    ${escapeHTML(domainLength)}
                </strong>

            </div>


            <div class="result-metric">

                <span>
                    DNS
                </span>

                <strong>
                    ${escapeHTML(dnsValue)}
                </strong>

            </div>

        `;

    }


    /* =====================================
       DOMAIN INTELLIGENCE
    ===================================== */

    const analysisCards =
        document.querySelectorAll(
            ".result-analysis-item"
        );


    if (
        analysisCards.length >= 2
    ) {

        const domainCard =
            analysisCards[1];


        const domainPlaceholder =
            domainCard.querySelector(
                ".result-placeholder"
            );


        const hostname =
            analysis.hostname ||
            "Unknown";


        const dns =
            analysis.dns;


        let dnsStatus =
            "DNS information unavailable";


        if (
            typeof dns ===
            "string"
        ) {

            dnsStatus =
                dns;

        }

        else if (
            dns &&
            typeof dns ===
            "object"
        ) {

            if (dns.status) {

                dnsStatus =
                    dns.status;

            }

            else if (
                dns.resolved !==
                undefined
            ) {

                dnsStatus =
                    dns.resolved
                        ? "DNS resolution successful"
                        : "DNS resolution failed";

            }

            else {

                dnsStatus =
                    formatBackendValue(
                        dns
                    );

            }

        }


        const domain =
            analysis.domain ||
            {};


        const domainAge =
            domain.domain_age ||
            "Unavailable";


        const registrationDate =
            domain.registration_date ||
            "Unavailable";


        if (
            domainPlaceholder
        ) {

            domainPlaceholder.innerHTML = `

                <div class="result-domain-info">

                    <div>

                        <span>
                            Hostname
                        </span>

                        <strong>
                            ${escapeHTML(hostname)}
                        </strong>

                    </div>


                    <div>

                        <span>
                            DNS Status
                        </span>

                        <strong>
                            ${escapeHTML(dnsStatus)}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Domain Age
                        </span>

                        <strong>
                            ${escapeHTML(domainAge)}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Registered
                        </span>

                        <strong>
                            ${escapeHTML(registrationDate)}
                        </strong>

                    </div>

                </div>

            `;

        }

    }


    /* =====================================
       SSL / HTTPS
    ===================================== */

    const resultSSL =
        document.getElementById(
            "resultSSL"
        );


    const ssl =
        analysis.ssl || {};


    if (resultSSL) {

        if (
            analysis.https === true
        ) {

            const sslStatus =
                ssl.status ||
                "UNAVAILABLE";


            const issuer =
                ssl.issuer ||
                "Unknown";


            const issued =
                ssl.issued ||
                "Unknown";


            const expires =
                ssl.expires ||
                "Unknown";


            const certAge =
                ssl.cert_age_days !== null &&
                ssl.cert_age_days !== undefined
                    ? `${ssl.cert_age_days} Days`
                    : "Unknown";


            if (
                sslStatus ===
                "VALID"
            ) {

                resultSSL.innerHTML = `

                    <div class="result-ssl-info">

                        <div>

                            <span>
                                Status
                            </span>

                            <strong>
                                ✓ Valid (HTTPS)
                            </strong>

                        </div>


                        <div>

                            <span>
                                Issuer
                            </span>

                            <strong>
                                ${escapeHTML(issuer)}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Issued
                            </span>

                            <strong>
                                ${escapeHTML(issued)}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Expires
                            </span>

                            <strong>
                                ${escapeHTML(expires)}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Cert Age
                            </span>

                            <strong>
                                ${escapeHTML(certAge)}
                            </strong>

                        </div>

                    </div>

                `;

            }


            else if (
                sslStatus ===
                "INVALID"
            ) {

                resultSSL.innerHTML = `

                    <div class="result-ssl-info">

                        <div>

                            <span>
                                Status
                            </span>

                            <strong>
                                ✕ Invalid Certificate
                            </strong>

                        </div>


                        <div>

                            <span>
                                Issuer
                            </span>

                            <strong>
                                ${escapeHTML(issuer)}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Issued
                            </span>

                            <strong>
                                ${escapeHTML(issued)}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Expires
                            </span>

                            <strong>
                                ${escapeHTML(expires)}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Cert Age
                            </span>

                            <strong>
                                ${escapeHTML(certAge)}
                            </strong>

                        </div>


                        ${
                            ssl.error
                                ? `

                                    <div>

                                        <span>
                                            Certificate Error
                                        </span>

                                        <strong>
                                            ${escapeHTML(
                                                ssl.error
                                            )}
                                        </strong>

                                    </div>

                                `
                                : ""
                        }

                    </div>

                `;

            }


            else {

                resultSSL.innerHTML = `

                    <div class="result-ssl-info">

                        <div>

                            <span>
                                Status
                            </span>

                            <strong>
                                HTTPS detected
                            </strong>

                        </div>


                        <div>

                            <span>
                                Certificate
                            </span>

                            <strong>
                                Certificate information unavailable
                            </strong>

                        </div>

                    </div>

                `;

            }

        }

        else {

            resultSSL.innerHTML = `

                <div class="result-ssl-info">

                    <div>

                        <span>
                            Status
                        </span>

                        <strong>
                            HTTPS not detected
                        </strong>

                    </div>

                </div>

            `;

        }

    }


    /* =====================================
       THREAT INTELLIGENCE BOX
    ===================================== */

    if (
        analysisCards.length >= 4
    ) {

        const threatCard =
            analysisCards[3];


        const threatPlaceholder =
            threatCard.querySelector(
                ".result-placeholder"
            );


        const providers = threatIntel.providers || {};

const vt = providers.virustotal || {};
const google = providers.google_safe_browsing || {};

const safe = (value) => escapeHTML(String(value ?? "N/A"));

if (threatPlaceholder) {
    threatPlaceholder.innerHTML = `
        <h4>VirusTotal</h4>
        <p>Status: ${safe(vt.status)}</p>
        <p>Verdict: ${safe(vt.verdict)}</p>
        <p>Malicious: ${safe(vt.malicious)}</p>
        <p>Suspicious: ${safe(vt.suspicious)}</p>
        <p>Harmless: ${safe(vt.harmless)}</p>
        <p>Undetected: ${safe(vt.undetected)}</p>
        <p>Total scans: ${safe(vt.total)}</p>

        <hr>

        <h4>Google Safe Browsing</h4>
        <p>Status: ${safe(google.status)}</p>
        <p>Verdict: ${safe(google.verdict)}</p>
        <p>Threat matches: ${safe(google.matches)}</p>
        <p>Threat types: ${safe(
            Array.isArray(google.threat_types)
                ? google.threat_types.join(", ") || "None"
                : "N/A"
        )}</p>
        <p>${safe(google.message)}</p>
    `;
    }
}

    /* =====================================
       MACHINE LEARNING
    ===================================== */

    const resultMLModel =
        document.getElementById(
            "resultMLModel"
        );


    const resultMLProbability =
        document.getElementById(
            "resultMLProbability"
        );


    if (resultMLModel) {

        if (
            ml.status ===
            "AVAILABLE"
        ) {

            resultMLModel.textContent =
                "Random Forest";

        }

        else {

            resultMLModel.textContent =
                ml.status ||
                "Unavailable";

        }

    }


    if (resultMLProbability) {

        if (
            ml.phishing_probability !==
            null &&
            ml.phishing_probability !==
            undefined
        ) {

            const probability =
                Number(
                    ml.phishing_probability
                ) * 100;


            resultMLProbability.textContent =
                `${probability.toFixed(2)}% phishing probability`;

        }

        else {

            resultMLProbability.textContent =
                "Not available";

        }

    }


    /* =====================================
       FINAL ASSESSMENT
    ===================================== */

    const resultFinalTitle =
        document.getElementById(
            "resultFinalTitle"
        );


    const resultFinalDescription =
        document.getElementById(
            "resultFinalDescription"
        );


    if (resultFinalTitle) {

        if (
            ml.status ===
            "AVAILABLE" &&
            ml.prediction ===
            "PHISHING"
        ) {

            resultFinalTitle.textContent =
                "Machine Learning Detected High Risk";

        }

        else {

            resultFinalTitle.textContent =
                risk.title ||
                "Assessment Complete";

        }

    }


    if (resultFinalDescription) {

        if (
            ml.status ===
            "AVAILABLE" &&
            ml.prediction ===
            "PHISHING"
        ) {

            const probability =
                Number(
                    ml.phishing_probability ||
                    0
                ) * 100;


            resultFinalDescription.textContent =
                `The trained machine-learning model classified this URL as phishing with a ${probability.toFixed(2)}% phishing probability. This result should be treated as a strong warning, but model probability alone does not establish maliciousness with certainty.`;

        }

        else {

            resultFinalDescription.textContent =
                risk.description ||
                "PhishKavach completed the URL analysis.";

        }

    }


    /* =====================================
       SCROLL TO RESULT
    ===================================== */

    if (resultSection) {

        setTimeout(
            () => {

                resultSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            },
            100
        );

    }

}


/* =========================================
   UPDATE STATISTICS
========================================= */

function updateStatistics(riskLevel) {

    totalScans++;
    todayScans++;


    if (
        riskLevel ===
        "HIGH RISK"
    ) {

        highRiskCount++;

    }


    if (
        riskLevel ===
        "SUSPICIOUS"
    ) {

        suspiciousCount++;

    }


    /*
       Save the new values so they remain
       after refreshing the website.
    */

    saveStatistics();


    /*
       Immediately stop any old animation
       and display the new actual values.
    */

    if (totalScansElement) {

        totalScansElement.textContent =
            totalScans.toLocaleString();

    }


    if (highRiskElement) {

        highRiskElement.textContent =
            highRiskCount.toLocaleString();

    }


    if (suspiciousElement) {

        suspiciousElement.textContent =
            suspiciousCount.toLocaleString();

    }


    if (todayElement) {

        todayElement.textContent =
            todayScans.toLocaleString();

    }

}


/* =========================================
   SCAN BUTTON
========================================= */

if (scanButton) {

    scanButton.addEventListener(
        "click",
        async () => {

            let url =
                urlInput
                    ? urlInput.value.trim()
                    : "";


            /* EMPTY INPUT */

            if (!url) {

                if (urlInput) {

                    urlInput.focus();

                    urlInput.style.borderColor =
                        "#e5252a";


                    setTimeout(
                        () => {

                            urlInput.style.borderColor =
                                "";

                        },
                        1500
                    );

                }

                return;

            }


            


            /* NORMALIZE */

            url =
                normalizeURL(url);


            /* BUTTON LOADING STATE */

            const originalButtonText =
                scanButton.textContent;


            scanButton.disabled =
                true;


            scanButton.textContent =
                "Analyzing...";


            try {

                // CHECK MONTHLY SCAN LIMIT IN SUPABASE


                /* SEND URL TO FASTAPI */

                
// GET LOGGED-IN USER SESSION
const { data: { session }, error: sessionError } =
    await supabase.auth.getSession();

if (sessionError) {
    throw sessionError;
}

if (!session) {
    throw new Error("Please log in again to continue.");
}

// SEND URL AND AUTHENTICATION TOKEN TO FASTAPI
const response = await fetch(
    BACKEND_URL,
    {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
        },

        body: JSON.stringify({
            url: url
        })
    }
);


                /* HANDLE HTTP ERROR */

if (!response.ok) {

    let errorMessage =
        `Backend returned HTTP ${response.status}`;

    try {
        const errorData = await response.json();

        if (response.status === 429) {
            showScanLimitModal();
            await loadMonthlyScanUsage();
            return;
        }

        if (response.status === 401) {
            alert("Your login session has expired. Please log in again.");
            return;
        }

        if (errorData.detail) {
            errorMessage = errorData.detail;
        }

    } catch (error) {
        console.error("Error reading backend response:", error);
    }

    throw new Error(errorMessage);
}


                /* READ BACKEND JSON */

                const data =
                    await response.json();


                console.log(
                    "PhishKavach backend response:",
                    data
                );


                /* DISPLAY RESULT */

                displayBackendResult(
                    data
                );
                // Save this scan for the history module
window.dispatchEvent(
    new CustomEvent("phishkavach:scan-complete", {
        detail: data
    })
);


                /* UPDATE STATISTICS */

                if (
                    data.risk &&
                    data.risk.level
                ) {

                    updateStatistics(
                        data.risk.level
                    );

                }


               


             

            }


            catch (error) {

                console.error(
                    "PhishKavach scan error:",
                    error
                );


                showScanError(
                    "Could not connect to the PhishKavach analysis server. Make sure FastAPI is running on http://127.0.0.1:8000."
                );

            }


            finally {

                scanButton.disabled =
                    false;

                scanButton.textContent =
                    originalButtonText;

            }

        }
    );

}


/* =========================================
   CLEAR BUTTON
========================================= */

if (clearButton) {

    clearButton.addEventListener(
        "click",
        () => {

            if (urlInput) {

                urlInput.value = "";

                urlInput.focus();

            }


            /*
               Also clear website preview.
            */

            const previewFrame =
                document.getElementById(
                    "websitePreviewFrame"
                );


            const previewURL =
                document.getElementById(
                    "previewURL"
                );


            const previewLoading =
                document.getElementById(
                    "previewLoading"
                );


            const previewBlocked =
                document.getElementById(
                    "previewBlocked"
                );


            const previewStatus =
                document.getElementById(
                    "previewStatus"
                );


            if (previewFrame) {

                previewFrame.src =
                    "about:blank";

            }


            if (previewURL) {

                previewURL.textContent =
                    "—";

            }


            if (previewLoading) {

                previewLoading.style.display =
                    "none";

            }


            if (previewBlocked) {

                previewBlocked.style.display =
                    "none";

            }


            if (previewStatus) {

                previewStatus.textContent =
                    "PREVIEW READY";

            }

        }
    );

}


/* =========================================
   PASTE BUTTON
========================================= */

if (pasteButton) {

    pasteButton.addEventListener(
        "click",
        async () => {

            try {

                const text =
                    await navigator.clipboard.readText();


                if (
                    text &&
                    urlInput
                ) {

                    urlInput.value =
                        text.trim();

                    urlInput.focus();

                }

            }

            catch (error) {

                alert(
                    "Clipboard access was blocked. Please paste manually."
                );

            }

        }
    );

}

/* Fix navigation underline on first click */
document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll(".nav-links a");
    const navIndicator = document.querySelector(".nav-indicator");

    function activateNavLink(link) {
        if (!link || !navIndicator) return;

        navLinks.forEach((item) => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        // Update the underline position immediately.
        navIndicator.style.width = `${link.offsetWidth}px`;
        navIndicator.style.left = `${link.offsetLeft}px`;
    }

    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            activateNavLink(link);
        });
    });

    // Position the underline for the initially active link.
    const initialLink = document.querySelector(".nav-links a.active");
    if (initialLink) {
        requestAnimationFrame(() => {
            activateNavLink(initialLink);
        });
    }

    // Recalculate after the browser resizes.
    window.addEventListener("resize", () => {
        const activeLink = document.querySelector(".nav-links a.active");
        if (activeLink) activateNavLink(activeLink);
    });
});

window.supabaseClient = supabase;