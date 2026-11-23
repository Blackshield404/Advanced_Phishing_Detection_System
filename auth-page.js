
import { supabase } from "./supabase-client.js";

// Elements
const loginPanel = document.getElementById("loginPanel");
const signupPanel = document.getElementById("signupPanel");
const message = document.getElementById("authMessage");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginPassword = document.getElementById("loginPassword");
const eyeButton = document.getElementById("toggleLoginPassword");

// Display messages
function setMessage(text, success = false) {
    message.textContent = text;
    message.className = success ? "success" : "";
}

// Switch login/signup
function setMode(mode) {
    loginPanel.hidden = mode !== "login";
    signupPanel.hidden = mode !== "signup";

    setMessage("");

    history.replaceState(null, "", `auth.html?mode=${mode}`);
}

document.getElementById("showSignup").addEventListener("click", () => {
    setMode("signup");
});

document.getElementById("showLogin").addEventListener("click", () => {
    setMode("login");
});

// Initial page mode
const initialMode = new URLSearchParams(location.search).get("mode");
setMode(initialMode === "signup" ? "signup" : "login");

// Show / hide password
if (loginPassword && eyeButton) {
    eyeButton.addEventListener("click", () => {
        const visible = loginPassword.type === "password";

        loginPassword.type = visible ? "text" : "password";

        eyeButton.innerHTML = visible
    ? `<svg width="24" height="24" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
         <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
         <circle cx="12" cy="12" r="3"/>
       </svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
         <path d="M3 3l18 18"/>
         <path d="M10.6 10.6a2 2 0 002.8 2.8"/>
         <path d="M9.9 5.2A10.8 10.8 0 0112 5c6.5 0 10 7 10 7"/>
         <path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7"/>
       </svg>`;

        eyeButton.setAttribute(
            "aria-label",
            visible ? "Hide password" : "Show password"
        );
    });
}

// Login
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = loginForm.querySelector('[type="submit"]');
    const email = document.getElementById("loginEmail").value.trim();
    const password = loginPassword.value;

    button.disabled = true;
    button.textContent = "Logging in...";
    setMessage("");

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        setMessage("Login successful! Redirecting...", true);

        window.location.replace("index.html");

    } catch (error) {
        setMessage(error.message);
    } finally {
        button.disabled = false;
        button.innerHTML = 'Log In <span>→</span>';
    }
});

// Signup
signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = signupForm.querySelector('[type="submit"]');

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (password !== confirm) {
        setMessage("Passwords do not match.");
        return;
    }

    button.disabled = true;
    button.textContent = "Creating account...";
    setMessage("");

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) throw error;

        if (data.session) {
            setMessage("Account created! Redirecting...", true);
            window.location.replace("index.html");
        } else {
            setMessage(
                "Account created. Please verify your email, then log in.",
                true
            );
        }

    } catch (error) {
        setMessage(error.message);
    } finally {
        button.disabled = false;
        button.textContent = "Create Account";
    }
});

// Forgot password
document.getElementById("forgotPassword").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();

    if (!email) {
        setMessage("Enter your email address first.");
        document.getElementById("loginEmail").focus();
        return;
    }

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);

        if (error) throw error;

        setMessage("Password reset email sent. Check your inbox.", true);

    } catch (error) {
        setMessage(error.message);
    }
});


