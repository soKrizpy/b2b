async function handleLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("loginBtn");

  if (!validators.required(username) || !validators.required(password)) {
    toast("Username dan password wajib diisi!", "error");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Memproses...';

  let email = username;
  if (validators.phone(username)) {
    email = username + "@kelas-coding.com";
  }

  const { data, error } = await sbClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    toast("Username atau MPIN salah!", "error");
    btn.disabled = false;
    btn.innerHTML = "Masuk";
    return;
  }

  const profile = await apiHandler.handle(
    sbClient.from("profiles").select("role").eq("id", data.user.id).single(),
  );

  if (profile && profile.role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "student.html";
  }
}

// Enter key to login
document.getElementById("password").addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleLogin();
});
