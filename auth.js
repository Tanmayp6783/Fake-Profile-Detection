// ============================================
// FakeGuard — auth.js
// FINAL FIXED VERSION (No HTML changes needed)
// ============================================

// Apply saved theme on load
(function () {
  const t = localStorage.getItem("fg_theme") || "dark";
  document.documentElement.setAttribute("data-theme", t);
})();

// ------------------------------------
// FORCE ALL BUTTONS TO NON-SUBMIT
// ------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button").forEach(btn => {
    btn.type = "button";
  });
});

// --------------------
// TAB SWITCHING
// --------------------
function switchTab(tab) {
  document.getElementById("tab-signin").classList.toggle("active", tab === "signin");
  document.getElementById("tab-signup").classList.toggle("active", tab === "signup");

  document.getElementById("form-signin").classList.toggle("hidden", tab !== "signin");
  document.getElementById("form-signup").classList.toggle("hidden", tab !== "signup");
}

// --------------------
// ERROR DISPLAY
// --------------------
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove("hidden");

  setTimeout(() => {
    el.classList.add("hidden");
  }, 4000);
}

// --------------------
// SIGN IN
// --------------------
async function handleSignIn(event) {
  if (event) event.preventDefault();

  const email = document.getElementById("si-email").value.trim();
  const pass = document.getElementById("si-password").value.trim();

  if (!email || !pass) {
    return showError("si-error", "Please fill in all fields.");
  }

  if (!isValidEmail(email)) {
    return showError("si-error", "Invalid email address.");
  }

  try {
    const res = await fetch("http://127.0.0.1:5000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        password: pass
      })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("fg_current_user", JSON.stringify({
        id: data.user_id,
        firstName: data.firstName,
        email: data.email
      }));

      window.location.href = "dashboard.html";

    } else {
      showError("si-error", data.error || "Login failed.");
    }

  } catch (error) {
    showError("si-error", "Server connection failed.");
  }
}

// --------------------
// SIGN UP
// --------------------
async function handleSignUp(event) {
  if (event) event.preventDefault();

  const fname = document.getElementById("su-fname").value.trim();
  const lname = document.getElementById("su-lname").value.trim();
  const email = document.getElementById("su-email").value.trim();
  const pass = document.getElementById("su-password").value.trim();

  if (!fname || !email || !pass) {
    return showError("su-error", "Please fill in all required fields.");
  }

  if (!isValidEmail(email)) {
    return showError("su-error", "Invalid email address.");
  }

  if (pass.length < 8) {
    return showError("su-error", "Password must be at least 8 characters.");
  }

  try {
    const res = await fetch("http://127.0.0.1:5000/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        firstName: fname,
        lastName: lname,
        email: email,
        password: pass
      })
    });

    const data = await res.json();

    if (res.ok) {
      alert("Signup successful! Please sign in.");
      switchTab("signin");
    } else {
      showError("su-error", data.error || "Signup failed.");
    }

  } catch (error) {
    showError("su-error", "Server connection failed.");
  }
}

// --------------------
// EMAIL VALIDATION
// --------------------
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function handleGoogleLogin(response) {

    const payload = JSON.parse(
        atob(response.credential.split('.')[1])
    );

    const user = {
        id: payload.sub,
        firstName: payload.given_name,
        lastName: payload.family_name || "",
        email: payload.email,
        picture: payload.picture
    };

    localStorage.setItem(
        "fg_current_user",
        JSON.stringify(user)
    );

    window.location.href = "dashboard.html";
}