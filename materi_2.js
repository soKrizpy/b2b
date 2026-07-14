// ===============================
// INIT SUPABASE
// ===============================
// sbClient, apiHandler are provided by shared.js (loaded before this file)

// ===============================
// LOGIN FUNCTION
// ===============================
async function login(email, password) {
  const { data, error } = await sbClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    toast("Login gagal: " + error.message, "error");
    const btn = document.getElementById("loginBtn");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Masuk";
    }
    return;
  }

  await redirectByRole(data.user);
}

// ===============================
// HANDLE LOGIN (called by button onclick)
// ===============================
async function handleLogin() {
  let username = (document.getElementById("email")?.value || "").trim();
  const password = (document.getElementById("password")?.value || "").trim();

  if (!username || !password) {
    toast("Username dan password wajib diisi", "error");
    return;
  }

  // Convert phone number to email format
  if (/^(08|628)\d{8,12}$/.test(username)) {
    username += "@kelas-coding.com";
  }

  const btn = document.getElementById("loginBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Memuat...";
  }

  await login(username, password);
}

// ===============================
// REDIRECT BERDASARKAN ROLE
// ===============================
async function redirectByRole(user, retried = false) {
  const profile = await apiHandler.handle(
    sbClient.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  );

  if (!profile) {
    if (retried) {
      toast("Profil belum siap. Silakan coba lagi sebentar lagi.", "error");
      return;
    }

    console.warn(
      "Profile tidak ditemukan, mencoba lanjutkan dengan role default...",
    );
    const fallbackRole =
      user.email?.toLowerCase() === "st.dwi89@gmail.com" ? "admin" : "student";

    if (fallbackRole === "admin") {
      window.location.href = "admin.html";
      return;
    }

    window.location.href = "student.html";
    return;
  }

  if (profile.role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "student.html";
  }
}

// ===============================
// AUTO CREATE PROFILE
// ===============================
async function createProfile(user) {
  const { error } = await sbClient.from("profiles").insert([
    {
      id: user.id,
      role: "student", // default
    },
  ]);

  if (error) {
    console.error("CREATE PROFILE ERROR:", error.message);
    return false;
  }

  return true;
}

// ===============================
// CHECK SESSION (AUTO LOGIN)
// ===============================
async function checkSession() {
  const { data } = await sbClient.auth.getSession();

  if (data.session) {
    await redirectByRole(data.session.user);
  }
}

// ===============================
// LOGOUT
// ===============================
async function logout() {
  await sbClient.auth.signOut();
  window.location.href = "index.html";
}

// ===============================
// EVENT LOGIN FORM
// ===============================
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await handleLogin();
});

// ===============================
// AUTO RUN
// ===============================
checkSession();
