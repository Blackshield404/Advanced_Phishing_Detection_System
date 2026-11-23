
import { supabase } from "./supabase-client.js";

const style = document.createElement("style");

style.textContent = `
.auth-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(5, 12, 28, .78);
    backdrop-filter: blur(12px);
}
.auth-overlay.active { display: flex; }

.auth-card {
    width: 100%;
    max-width: 440px;
    padding: 36px;
    position: relative;
    color: #edf3ff;
    background: linear-gradient(145deg, #14223d, #0b1427);
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 22px;
    box-shadow: 0 25px 80px rgba(0,0,0,.45);
    animation: authAppear .25s ease;
}
@keyframes authAppear {
    from { opacity: 0; transform: translateY(15px) scale(.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}
.auth-close {
    position: absolute;
    top: 17px;
    right: 19px;
    border: 0;
    background: transparent;
    color: #aab8d0;
    font-size: 25px;
    cursor: pointer;
}
.auth-logo {
    font-size: 25px;
    font-weight: 800;
    letter-spacing: -.8px;
    margin-bottom: 25px;
}
.auth-logo span { color: #55a7ff; }
.auth-card h2 {
    font-size: 28px;
    margin: 0 0 9px;
    color: white;
}
.auth-subtitle {
    color: #9eacc4;
    font-size: 14px;
    margin-bottom: 27px;
    line-height: 1.5;
}
.auth-field { margin-bottom: 18px; }
.auth-field label {
    display: block;
    font-size: 13px;
    color: #d4def0;
    margin-bottom: 8px;
}
.auth-field input {
    width: 100%;
    box-sizing: border-box;
    padding: 14px 15px;
    border-radius: 10px;
    border: 1px solid #344663;
    background: #0b172b;
    color: white;
    outline: none;
    font-size: 14px;
}
.auth-field input:focus {
    border-color: #55a7ff;
    box-shadow: 0 0 0 3px rgba(85,167,255,.13);
}
.auth-password { position: relative; }
.auth-password input { padding-right: 65px; }
.auth-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #8fbaff;
    background: none;
    border: 0;
    cursor: pointer;
}
.auth-submit {
    width: 100%;
    padding: 15px;
    margin-top: 8px;
    border: none;
    border-radius: 10px;
    color: white;
    font-weight: 700;
    font-size: 15px;
    background: linear-gradient(100deg,#1768dc,#388df5);
    cursor: pointer;
}
.auth-submit:disabled { opacity: .6; cursor: wait; }
.auth-message {
    display: none;
    margin-top: 16px;
    padding: 12px;
    border-radius: 9px;
    font-size: 13px;
    line-height: 1.5;
}
.auth-message.show { display: block; }
.auth-message.error {
    color: #ffb4b4;
    background: rgba(220,50,50,.12);
}
.auth-message.success {
    color: #9ef0c0;
    background: rgba(40,180,100,.12);
}
.auth-switch {
    text-align: center;
    color: #aab8d0;
    font-size: 14px;
    margin-top: 23px;
}
.auth-switch button {
    color: #70b3ff;
    border: none;
    background: none;
    cursor: pointer;
    font-weight: 700;
}
@media(max-width:480px) {
    .auth-card { padding: 28px 22px; }
}
`;

document.head.appendChild(style);

const overlay = document.createElement("div");
overlay.className = "auth-overlay";

overlay.innerHTML = `
    <div class="auth-card" role="dialog" aria-modal="true"
         aria-labelledby="authTitle">
        <button class="auth-close" type="button"
                aria-label="Close">&times;</button>

        <div class="auth-logo">Phish<span>Kavach</span></div>

        <h2 id="authTitle">Welcome back</h2>
        <p class="auth-subtitle" id="authSubtitle">
            Sign in to protect your digital world.
        </p>

        <form id="authForm">
            <div class="auth-field">
                <label for="authEmail">Email address</label>
                <input id="authEmail" type="email"
                       placeholder="you@example.com" required>
            </div>

            <div class="auth-field">
                <label for="authPassword">Password</label>
                <div class="auth-password">
                    <input id="authPassword" type="password"
                           placeholder="Enter your password"
                           minlength="6" required>
                    <button class="auth-toggle" id="passwordToggle"
                            type="button">Show</button>
                </div>
            </div>

            <button class="auth-submit" id="authSubmit" type="submit">
                Log In
            </button>

            <div class="auth-message" id="authMessage"
                 role="status" aria-live="polite"></div>
        </form>

        <div class="auth-switch">
            <span id="authSwitchText">Don't have an account?</span>
            <button id="authSwitchButton" type="button">Sign Up</button>
        </div>
    </div>
`;

document.body.appendChild(overlay);

const $ = id => document.getElementById(id);

let authMode = "login";

function showMessage(message, type) {
    const box = $("authMessage");
    box.textContent = message;
    box.className = `auth-message show ${type}`;
}

function clearMessage() {
    $("authMessage").className = "auth-message";
    $("authMessage").textContent = "";
}

function setMode(mode) {
    authMode = mode;
    clearMessage();

    const signup = mode === "signup";

    $("authTitle").textContent = signup
        ? "Create your account"
        : "Welcome back";

    $("authSubtitle").textContent = signup
        ? "Join PhishKavach and stay protected online."
        : "Sign in to protect your digital world.";

    $("authSubmit").textContent = signup
        ? "Create Account"
        : "Log In";

    $("authSwitchText").textContent = signup
        ? "Already have an account?"
        : "Don't have an account?";

    $("authSwitchButton").textContent = signup
        ? "Log In"
        : "Sign Up";
}

function openAuth(mode) {
    window.location.href = `auth.html?mode=${mode}`;
}

function closeAuth() {
    overlay.classList.remove("active");
}

$("loginBtn")?.addEventListener("click", () => openAuth("login"));
$("signupBtn")?.addEventListener("click", () => openAuth("signup"));

$("authSwitchButton").addEventListener("click", () => {
    setMode(authMode === "login" ? "signup" : "login");
});

$("authClose");
overlay.querySelector(".auth-close").addEventListener("click", closeAuth);

overlay.addEventListener("click", event => {
    if (event.target === overlay) closeAuth();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeAuth();
});

$("passwordToggle").addEventListener("click", () => {
    const password = $("authPassword");
    const visible = password.type === "password";
    password.type = visible ? "text" : "password";
    $("passwordToggle").textContent = visible ? "Hide" : "Show";
});

$("authForm").addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();

    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    const submit = $("authSubmit");

    submit.disabled = true;
    submit.textContent = "Please wait...";

    try {
        if (authMode === "signup") {
    const fullName = document.getElementById("signupName").value.trim();

const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
        data: {
            full_name: fullName
        }
    }
});

    if (error) throw error;

    showMessage("Account created! Check your email if verification is required.", "success");

} else {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;

    showMessage("Login successful!", "success");

    setTimeout(() => {
        closeAuth();
    }, 1000);
}
    } catch (error) {
        showMessage(error.message || "Authentication failed.", "error");
    } finally {
        submit.disabled = false;
        submit.textContent = authMode === "signup"
            ? "Create Account"
            : "Log In";
    }
});


const passwordInput = document.getElementById("loginPassword");
const eyeButton = document.getElementById("toggleLoginPassword");

if (passwordInput && eyeButton) {
    eyeButton.addEventListener("click", function () {
        const showPassword = passwordInput.type === "password";

        passwordInput.type = showPassword ? "text" : "password";

        eyeButton.innerHTML = showPassword
            ? `<svg width="24" height="24" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
                 <path d="M3 3l18 18"/>
                 <path d="M10.6 10.6a2 2 0 002.8 2.8"/>
                 <path d="M9.9 5.2A10.8 10.8 0 0112 5c6.5 0 10 7 10 7a15 15 0 01-3 3.8"/>
                 <path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 004-.8"/>
               </svg>`
            : `<svg width="24" height="24" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
                 <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
                 <circle cx="12" cy="12" r="3"/>
               </svg>`;

        eyeButton.setAttribute(
            "aria-label",
            showPassword ? "Hide password" : "Show password"
        );
    });
}


/* =====================================
   PHISHKAVACH PROFILE / SESSION HANDLER
===================================== */


/* =====================================
   PHISHKAVACH PROFILE / SESSION HANDLER
===================================== */

const profileNav = document.querySelector(".nav-actions");

// Profile dropdown styles
const profileStyles = document.createElement("style");

profileStyles.textContent = `
#profileMenuWrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
}

#profileAvatar {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: 2px solid #dce9ff;
    background: linear-gradient(135deg, #e8f1ff, #cbdfff);
    color: #174b91;
    font-size: 19px;
    font-weight: 800;
    cursor: pointer;
    transition: .25s ease;
}

#profileAvatar:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 16px rgba(23, 104, 220, .18);
}

#profileArrow {
    border: 0;
    background: transparent;
    color: #334155;
    font-size: 13px;
    cursor: pointer;
    margin-left: 8px;
}

#profileDropdown {
    position: absolute;
    top: 58px;
    right: 0;
    width: 290px;
    padding: 10px;
    background: rgba(255,255,255,.97);
    border: 1px solid #e5eaf2;
    border-radius: 19px;
    box-shadow: 0 18px 55px rgba(16,38,75,.15);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    z-index: 99999;
    opacity: 0;
    visibility: hidden;
    transform: translateY(10px);
    transition: .22s ease;
}

#profileDropdown.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.profile-user {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 10px 17px;
    border-bottom: 1px solid #edf0f5;
    margin-bottom: 10px;
}

.profile-user-avatar {
    width: 46px;
    height: 46px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #e7effb;
    color: #174b91;
    font-weight: 800;
    font-size: 18px;
}

.profile-user-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.profile-user-name {
    color: #14233b;
    font-size: 14px;
    font-weight: 750;
    overflow-wrap: anywhere;
}

.profile-user-email {
    color: #718096;
    font-size: 11px;
    overflow-wrap: anywhere;
}

.profile-menu-heading {
    padding: 8px 10px 7px;
    color: #7c899b;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .7px;
}

.profile-menu-item {
    width: 100%;
    min-height: 43px;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 10px 11px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: #243247;
    text-decoration: none;
    text-align: left;
    font-family: inherit;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
    transition: .2s ease;
}

.profile-menu-item:hover {
    background: #f0f5fc;
    color: #1764c5;
}

.profile-menu-icon {
    width: 16px;
    text-align: center;
    font-size: 15px;
}

.profile-menu-divider {
    height: 1px;
    background: #edf0f5;
    margin: 9px 0;
}

.profile-menu-item.danger {
    color: #b42318;
}

.profile-menu-item.danger:hover {
    background: #fff0ef;
}

.profile-menu-item.logout {
    background: #fff0ef;
    margin-top: 3px;
}

.profile-menu-item.logout:hover {
    background: #ffe3e1;
}

#profileLogoutDialog {
    position: fixed;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(12, 25, 45, .48);
    backdrop-filter: blur(5px);
    z-index: 100000;
}

#profileLogoutDialog.show {
    display: flex;
}

.profile-confirm-card {
    width: 100%;
    max-width: 380px;
    padding: 27px;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 20px 60px rgba(0,0,0,.2);
    text-align: center;
}

.profile-confirm-card h3 {
    margin: 0 0 9px;
    color: #172b50;
    font-size: 21px;
}

.profile-confirm-card p {
    margin: 0 0 23px;
    color: #718096;
    font-size: 14px;
    line-height: 1.5;
}

.profile-confirm-actions {
    display: flex;
    gap: 10px;
}

.profile-confirm-actions button {
    flex: 1;
    padding: 12px;
    border: 0;
    border-radius: 9px;
    font-weight: 700;
    cursor: pointer;
}

#confirmProfileLogout {
    background: #c93636;
    color: white;
}

#cancelProfileLogout {
    background: #eef2f7;
    color: #334155;
}

@media(max-width:600px) {
    #profileDropdown {
        width: min(290px, calc(100vw - 25px));
        right: -5px;
    }
}
`;

document.head.appendChild(profileStyles);

// Create logout confirmation dialog
const logoutDialog = document.createElement("div");
logoutDialog.id = "profileLogoutDialog";

logoutDialog.innerHTML = `
    <div class="profile-confirm-card" role="dialog"
         aria-modal="true" aria-labelledby="profileLogoutTitle">
        <h3 id="profileLogoutTitle">Log out of PhishKavach?</h3>
        <p>Are you sure you want to end your current session?</p>
        <div class="profile-confirm-actions">
            <button id="cancelProfileLogout" type="button">Cancel</button>
            <button id="confirmProfileLogout" type="button">Log Out</button>
        </div>
    </div>
`;

document.body.appendChild(logoutDialog);

function closeProfileDropdown() {
    document.getElementById("profileDropdown")?.classList.remove("open");
}

function openLogoutDialog() {
    closeProfileDropdown();
    logoutDialog.classList.add("show");
}

function closeLogoutDialog() {
    logoutDialog.classList.remove("show");
}

document.getElementById("cancelProfileLogout")
    .addEventListener("click", closeLogoutDialog);

logoutDialog.addEventListener("click", event => {
    if (event.target === logoutDialog) {
        closeLogoutDialog();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeProfileDropdown();
        closeLogoutDialog();
    }
});

// Supabase profile navbar
async function updateProfileNavbar(session) {
    if (!profileNav) return;

    const loginButton = document.getElementById("loginBtn");
    const signupButton = document.getElementById("signupBtn");

    document.getElementById("profileMenuWrapper")?.remove();

    if (!session?.user) {
        if (loginButton) loginButton.style.display = "";
        if (signupButton) signupButton.style.display = "";
        return;
    }

    if (loginButton) loginButton.style.display = "none";
    if (signupButton) signupButton.style.display = "none";

    const user = session.user;

    const fullName =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "User";

    const initials = fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const wrapper = document.createElement("div");
    wrapper.id = "profileMenuWrapper";

    const avatarButton = document.createElement("button");
    avatarButton.id = "profileAvatar";
    avatarButton.type = "button";
    avatarButton.textContent = initials;
    avatarButton.setAttribute("aria-label", "Open profile menu");
    avatarButton.setAttribute("aria-expanded", "false");

    const arrowButton = document.createElement("button");
    arrowButton.id = "profileArrow";
    arrowButton.type = "button";
    arrowButton.textContent = "▼";
    arrowButton.setAttribute("aria-label", "Toggle profile menu");

    const dropdown = document.createElement("div");
    dropdown.id = "profileDropdown";

    dropdown.innerHTML = `
        <div class="profile-user">
            <div class="profile-user-avatar" id="profileHeaderInitials"></div>
            <div class="profile-user-info">
                <strong class="profile-user-name" id="profileHeaderName"></strong>
                <span class="profile-user-email" id="profileHeaderEmail"></span>
            </div>
        </div>

        <div class="profile-menu-heading">YOUR PHISHKAVACH</div>

        <a href="#analyze" class="profile-menu-item">
            <span class="profile-menu-icon">⌕</span> Analyze
        </a>

        <button type="button" class="profile-menu-item"
                data-profile-action="history">
            <span class="profile-menu-icon">◷</span> Scan History
        </button>

        <a href="#awareness" class="profile-menu-item">
            <span class="profile-menu-icon">♢</span> Awareness
        </a>

        <a href="#about" class="profile-menu-item">
            <span class="profile-menu-icon">ⓘ</span> About
        </a>

        <div class="profile-menu-divider"></div>

        <div class="profile-menu-heading">ACCOUNT SETTINGS</div>

        <button type="button" class="profile-menu-item"
                data-profile-action="edit">
            <span class="profile-menu-icon">♟</span> Edit Profile
        </button>

        <button type="button" class="profile-menu-item"
                data-profile-action="password">
            <span class="profile-menu-icon">♧</span> Change Password
        </button>

        <div class="profile-menu-divider"></div>

        <button type="button" class="profile-menu-item danger"
                data-profile-action="delete">
            <span class="profile-menu-icon">▮</span> Delete Account
        </button>

        <button type="button" class="profile-menu-item danger logout"
                id="profileLogout">
            <span class="profile-menu-icon">⇥</span> Log Out
        </button>
    `;

    wrapper.append(avatarButton, arrowButton, dropdown);
    profileNav.appendChild(wrapper);

    // Safely insert Supabase user details
    document.getElementById("profileHeaderInitials").textContent = initials;
    document.getElementById("profileHeaderName").textContent = fullName;
    document.getElementById("profileHeaderEmail").textContent =
        user.email || "";

    function toggleDropdown(event) {
    event?.stopPropagation();

    const isOpen = dropdown.style.display !== "block";

    dropdown.classList.toggle("open", isOpen);

    dropdown.style.setProperty(
        "display",
        isOpen ? "block" : "none",
        "important"
    );

    dropdown.style.setProperty(
        "visibility",
        isOpen ? "visible" : "hidden",
        "important"
    );

    dropdown.style.setProperty(
        "opacity",
        isOpen ? "1" : "0",
        "important"
    );

    avatarButton.setAttribute("aria-expanded", String(isOpen));
}

    avatarButton.addEventListener("click", toggleDropdown);
arrowButton.addEventListener("click", toggleDropdown);

    // Close menu when clicking outside
    document.addEventListener("click", event => {
        if (!wrapper.contains(event.target)) {
            closeProfileDropdown();
            avatarButton.setAttribute("aria-expanded", "false");
        }
    });

    // Dropdown actions
    dropdown.addEventListener("click", event => {
        const actionButton = event.target.closest("[data-profile-action]");
        if (!actionButton) return;

        const action = actionButton.dataset.profileAction;
        closeProfileDropdown();

        if (action === "history") {
            // Connect this to your actual scan-history page/panel.
            alert("Scan History page needs to be connected here.");
        }

        if (action === "edit") {
            alert("Edit Profile functionality is not connected yet.");
        }

        if (action === "password") {
            alert("Change Password functionality is not connected yet.");
        }

        if (action === "delete") {
            alert("Account deletion requires a secure backend function. It cannot safely be implemented from this frontend alone.");
        }
    });

    dropdown.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", closeProfileDropdown);
    });

    document.getElementById("profileLogout")
        .addEventListener("click", openLogoutDialog);
}

// Confirm logout
document.getElementById("confirmProfileLogout")
    .addEventListener("click", async () => {
        const confirmButton = document.getElementById("confirmProfileLogout");

        confirmButton.disabled = true;
        confirmButton.textContent = "Logging out...";

        const { error } = await supabase.auth.signOut();

        if (error) {
            alert(error.message);
            confirmButton.disabled = false;
            confirmButton.textContent = "Log Out";
            return;
        }

        closeLogoutDialog();
        window.location.reload();
    });

// Restore existing Supabase session
supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
        console.error("Session error:", error.message);
        return;
    }

    updateProfileNavbar(data.session);
});

// Listen for login/logout changes
supabase.auth.onAuthStateChange((_event, session) => {
    updateProfileNavbar(session);
});
