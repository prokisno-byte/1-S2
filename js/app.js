// ============================================
// ForgeCS — Main Application Logic
// ============================================

// ---------- State ----------
let currentUser = null;
let currentFilter = "all";
let isRegisterMode = false;
let demoTeams = [];
let demoApplications = [];
let demoUsers = {};

// ---------- Helpers ----------
function $(sel) {
  return document.querySelector(sel);
}
function $$(sel) {
  return document.querySelectorAll(sel);
}

function showToast(msg, type = "") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  setTimeout(() => t.classList.remove("show"), 3000);
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

function showSection(name) {
  $$(".section").forEach((s) => s.classList.remove("active"));
  $$(".nav-link").forEach((l) => l.classList.remove("active"));
  const section = document.getElementById(name);
  if (section) section.classList.add("active");
  const link = document.querySelector(`.nav-link[data-section="${name}"]`);
  if (link) link.classList.add("active");
  // Close mobile menu
  $("#mainNav").classList.remove("open");
}

// Validation: name — only letters (latin + cyrillic)
function isValidName(str) {
  return /^[A-Za-zА-Яа-яЁё\s\-]+$/.test(str.trim()) && str.trim().length >= 2;
}

// Validation: only digits
function isValidNumber(str) {
  return /^\d+$/.test(String(str).trim());
}

// ---------- Navigation ----------
$$(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    showSection(link.dataset.section);
  });
});

$("#menuToggle")?.addEventListener("click", () => {
  $("#mainNav").classList.toggle("open");
});

// Platform filters
$$(".filter-btn[data-platform]").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".filter-btn[data-platform]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.platform;
    renderTeams();
  });
});

$("#searchTeams")?.addEventListener("input", () => renderTeams());

// ---------- Auth Modal Toggle ----------
$("#authSwitchBtn")?.addEventListener("click", () => {
  isRegisterMode = !isRegisterMode;
  $("#authTitle").textContent = isRegisterMode ? "Регистрация" : "Вход";
  $("#authSubmit").textContent = isRegisterMode ? "Зарегистрироваться" : "Войти";
  $("#authSwitchText").textContent = isRegisterMode ? "Уже есть аккаунт?" : "Нет аккаунта?";
  $("#authSwitchBtn").textContent = isRegisterMode ? "Войти" : "Зарегистрироваться";
});

// ---------- Auth Form ----------
$("#authForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;

  if (window.DEMO_MODE || !auth) {
    // Demo mode
    if (isRegisterMode) {
      if (demoUsers[email]) {
        showToast("Такой email уже зарегистрирован", "error");
        return;
      }
      demoUsers[email] = {
        uid: "demo_" + Date.now(),
        email,
        name: "",
        age: "",
        elo: "",
        platform: "premier",
        isAdmin: email === "admin@forgecs.com"
      };
      localStorage.setItem("forgecs_users", JSON.stringify(demoUsers));
      currentUser = demoUsers[email];
      showToast("Аккаунт создан (демо)", "success");
    } else {
      if (!demoUsers[email] || password.length < 6) {
        showToast("Неверный email или пароль (демо: любой пароль ≥6)", "error");
        return;
      }
      currentUser = demoUsers[email];
      showToast("Вход выполнен (демо)", "success");
    }
    localStorage.setItem("forgecs_user", JSON.stringify(currentUser));
    updateUIAfterAuth();
    closeModal("authModal");
    return;
  }

  // Real Firebase
  try {
    if (isRegisterMode) {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection("users").doc(cred.user.uid).set({
        email,
        name: "",
        age: null,
        elo: null,
        platform: "premier",
        isAdmin: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast("Аккаунт создан!", "success");
    } else {
      await auth.signInWithEmailAndPassword(email, password);
      showToast("Вход выполнен", "success");
    }
    closeModal("authModal");
  } catch (err) {
    showToast(err.message || "Ошибка авторизации", "error");
  }
});

// ---------- Discord Login ----------
async function loginWithDiscord() {
  // DEMO MODE — имитация входа через Discord
  if (window.DEMO_MODE || !auth) {
    const demoDiscordUser = {
      uid: "discord_demo_" + Date.now(),
      email: "discord_user@forgecs.demo",
      name: "DiscordPlayer",
      age: "",
      elo: "",
      platform: "faceit",
      isAdmin: false,
      provider: "discord"
    };
    demoUsers[demoDiscordUser.email] = demoDiscordUser;
    currentUser = demoDiscordUser;
    localStorage.setItem("forgecs_user", JSON.stringify(currentUser));
    localStorage.setItem("forgecs_users", JSON.stringify(demoUsers));
    updateUIAfterAuth();
    closeModal("authModal");
    showToast("Вход через Discord выполнен (демо)", "success");
    return;
  }

  // REAL Firebase + Discord
  // Нужно включить Discord в Firebase Console → Authentication → Sign-in method
  // и создать приложение на https://discord.com/developers/applications
  try {
    const provider = new firebase.auth.OAuthProvider("oidc.discord");
    // Альтернатива, если настроен кастомный OIDC:
    // const provider = new firebase.auth.OAuthProvider('discord.com');
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const userRef = db.collection("users").doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      await userRef.set({
        email: user.email || "",
        name: user.displayName || "Discord User",
        age: null,
        elo: null,
        platform: "faceit",
        isAdmin: false,
        provider: "discord",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    showToast("Вход через Discord выполнен!", "success");
    closeModal("authModal");
  } catch (err) {
    console.error(err);
    // Fallback: показываем инструкцию
    showToast("Discord пока не настроен в Firebase. Используй демо или Email.", "error");
  }
}

window.loginWithDiscord = loginWithDiscord;

// ---------- Auth state (Firebase) ----------
if (!window.DEMO_MODE && auth) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const doc = await db.collection("users").doc(user.uid).get();
      currentUser = { uid: user.uid, email: user.email, ...(doc.data() || {}) };
      updateUIAfterAuth();
    } else {
      currentUser = null;
      updateUIAfterAuth();
    }
  });
} else {
  // Demo restore
  const saved = localStorage.getItem("forgecs_user");
  if (saved) {
    currentUser = JSON.parse(saved);
    updateUIAfterAuth();
  }
  const users = localStorage.getItem("forgecs_users");
  if (users) demoUsers = JSON.parse(users);
}

function updateUIAfterAuth() {
  if (currentUser) {
    $("#btnLogin").style.display = "none";
    $("#btnProfile").style.display = "inline-flex";
    if (currentUser.isAdmin) {
      $("#adminLink").style.display = "inline-flex";
    }
    // Profile fill
    $("#profileName").textContent = currentUser.name || currentUser.email;
    $("#profileEmail").textContent = currentUser.email;
    $("#profileAvatar").textContent = (currentUser.name || currentUser.email || "?").charAt(0).toUpperCase();
    $("#pName").value = currentUser.name || "";
    $("#pAge").value = currentUser.age || "";
    $("#pElo").value = currentUser.elo || "";
    $("#pPlatform").value = currentUser.platform || "premier";
    renderMyApplications();
  } else {
    $("#btnLogin").style.display = "inline-flex";
    $("#btnProfile").style.display = "none";
    $("#adminLink").style.display = "none";
  }
  loadTeams();
  loadStats();
}

// ---------- Profile Form ----------
$("#profileForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) {
    showToast("Сначала войди", "error");
    return;
  }

  const name = $("#pName").value.trim();
  const age = $("#pAge").value;
  const elo = $("#pElo").value;
  const platform = $("#pPlatform").value;

  if (!isValidName(name)) {
    showToast("Имя: только буквы (без цифр)", "error");
    $("#pName").classList.add("error");
    return;
  }
  if (!isValidNumber(age) || age < 12 || age > 60) {
    showToast("Возраст: только цифры (12–60)", "error");
    return;
  }
  if (!isValidNumber(elo)) {
    showToast("Elo: только цифры", "error");
    return;
  }

  $("#pName").classList.remove("error");

  if (window.DEMO_MODE || !db) {
    currentUser.name = name;
    currentUser.age = Number(age);
    currentUser.elo = Number(elo);
    currentUser.platform = platform;
    demoUsers[currentUser.email] = currentUser;
    localStorage.setItem("forgecs_user", JSON.stringify(currentUser));
    localStorage.setItem("forgecs_users", JSON.stringify(demoUsers));
    updateUIAfterAuth();
    showToast("Профиль сохранён (демо)", "success");
    return;
  }

  try {
    await db.collection("users").doc(currentUser.uid).update({
      name,
      age: Number(age),
      elo: Number(elo),
      platform
    });
    currentUser = { ...currentUser, name, age: Number(age), elo: Number(elo), platform };
    updateUIAfterAuth();
    showToast("Профиль сохранён", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ---------- Create Team ----------
$("#createTeamForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) {
    showToast("Сначала войди в аккаунт", "error");
    openModal("authModal");
    return;
  }

  const name = $("#teamName").value.trim();
  const platform = $("#teamPlatform").value;
  const slots = Number($("#teamSlots").value);
  const desc = $("#teamDesc").value.trim();
  const minElo = $("#teamMinElo").value ? Number($("#teamMinElo").value) : null;

  if (!name || !platform) {
    showToast("Заполни обязательные поля", "error");
    return;
  }

  const team = {
    name,
    platform,
    slots,
    description: desc,
    minElo,
    ownerId: currentUser.uid || currentUser.email,
    ownerName: currentUser.name || currentUser.email,
    members: [currentUser.uid || currentUser.email],
    createdAt: new Date().toISOString()
  };

  if (window.DEMO_MODE || !db) {
    team.id = "team_" + Date.now();
    demoTeams.push(team);
    localStorage.setItem("forgecs_teams", JSON.stringify(demoTeams));
    showToast("Команда создана (демо)!", "success");
    $("#createTeamForm").reset();
    showSection("teams");
    renderTeams();
    loadStats();
    return;
  }

  try {
    await db.collection("teams").add({
      ...team,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast("Команда создана!", "success");
    $("#createTeamForm").reset();
    showSection("teams");
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ---------- Load & Render Teams ----------
async function loadTeams() {
  if (window.DEMO_MODE || !db) {
    const saved = localStorage.getItem("forgecs_teams");
    let teams = saved ? JSON.parse(saved) : [];
    // Если команд мало — подгружаем свежие примеры
    if (teams.length < 8) {
      teams = getSeedTeams();
      localStorage.setItem("forgecs_teams", JSON.stringify(teams));
    }
    demoTeams = teams;
    renderTeams();
    return;
  }

  try {
    const snap = await db.collection("teams").orderBy("createdAt", "desc").get();
    demoTeams = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTeams();
  } catch (err) {
    console.error(err);
    demoTeams = getSeedTeams();
    renderTeams();
  }
}

function getSeedTeams() {
  return [
    {
      id: "seed1",
      name: "Night Wolves",
      platform: "faceit",
      slots: 2,
      description: "Ищем рифлера и саппорта. Минимальный Elo 1800. Играем вечером по МСК.",
      minElo: 1800,
      ownerId: "seed",
      ownerName: "Alpha",
      members: ["seed"]
    },
    {
      id: "seed2",
      name: "Red Storm",
      platform: "premier",
      slots: 3,
      description: "Казуал + ranked. Дружелюбный состав, русский язык.",
      minElo: 1000,
      ownerId: "seed",
      ownerName: "Beta",
      members: ["seed"]
    },
    {
      id: "seed3",
      name: "G2 Wannabe",
      platform: "faceit",
      slots: 1,
      description: "Серьёзный подход. Нужен IGL. Elo 2200+.",
      minElo: 2200,
      ownerId: "seed",
      ownerName: "Gamma",
      members: ["seed"]
    },
    {
      id: "seed4",
      name: "Shadow Five",
      platform: "faceit",
      slots: 2,
      description: "Ищем AWPer и entry. Коммуникация обязательна. Играем 20:00–01:00 МСК.",
      minElo: 2000,
      ownerId: "seed",
      ownerName: "Delta",
      members: ["seed"]
    },
    {
      id: "seed5",
      name: "Premier Kings",
      platform: "premier",
      slots: 4,
      description: "Новая команда под Premier. Все роли открыты. Без токсиков.",
      minElo: 800,
      ownerId: "seed",
      ownerName: "Echo",
      members: ["seed"]
    },
    {
      id: "seed6",
      name: "Frostbite",
      platform: "faceit",
      slots: 1,
      description: "Нужен support / lurker. Level 8+. Русский + английский.",
      minElo: 1900,
      ownerId: "seed",
      ownerName: "Frost",
      members: ["seed"]
    },
    {
      id: "seed7",
      name: "Blackout",
      platform: "premier",
      slots: 2,
      description: "Агрессивный стиль. Ищем rifler и IGL. Возраст 16+.",
      minElo: 1200,
      ownerId: "seed",
      ownerName: "Nova",
      members: ["seed"]
    },
    {
      id: "seed8",
      name: "Apex Predators",
      platform: "faceit",
      slots: 3,
      description: "Тренировки 3 раза в неделю. Цель — уровень 10 и турниры.",
      minElo: 2100,
      ownerId: "seed",
      ownerName: "Viper",
      members: ["seed"]
    },
    {
      id: "seed9",
      name: "Silent Ops",
      platform: "premier",
      slots: 1,
      description: "Спокойный состав, минимум тильта. Ищем надёжного тиммейта.",
      minElo: 1100,
      ownerId: "seed",
      ownerName: "Ghost",
      members: ["seed"]
    },
    {
      id: "seed10",
      name: "Crimson Squad",
      platform: "faceit",
      slots: 2,
      description: "Faceit 7–9. Ищем entry fragger. Discord обязателен.",
      minElo: 1700,
      ownerId: "seed",
      ownerName: "Crimson",
      members: ["seed"]
    }
  ];
}

function renderTeams() {
  const grid = $("#teamsGrid");
  if (!grid) return;

  const search = ($("#searchTeams")?.value || "").toLowerCase();
  let list = demoTeams.filter((t) => {
    const matchPlatform = currentFilter === "all" || t.platform === currentFilter;
    const matchSearch = !search || t.name.toLowerCase().includes(search);
    return matchPlatform && matchSearch;
  });

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <h3>Команд не найдено</h3>
        <p>Попробуй другой фильтр или создай свою команду</p>
      </div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (t) => `
    <div class="team-card">
      <div class="team-card-header">
        <div class="team-name">${escapeHtml(t.name)}</div>
        <span class="platform-badge ${t.platform}">${t.platform}</span>
      </div>
      <p class="team-desc">${escapeHtml(t.description || "Без описания")}</p>
      <div class="team-meta">
        <span>👤 ${t.ownerName || "—"}</span>
        <span>🪑 ${t.slots} мест</span>
        ${t.minElo ? `<span>📊 ${t.minElo}+ Elo</span>` : ""}
      </div>
      <div class="team-actions">
        <button class="btn btn-primary btn-sm" onclick="openApplyModal('${t.id}', '${escapeHtml(t.name)}')">
          Подать заявку
        </button>
      </div>
    </div>`
    )
    .join("");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- Apply to Team ----------
function openApplyModal(teamId, teamName) {
  if (!currentUser) {
    showToast("Сначала войди", "error");
    openModal("authModal");
    return;
  }
  $("#applyTeamId").value = teamId;
  $("#applyTeamName").textContent = "Команда: " + teamName;
  openModal("applyModal");
}

$("#applyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const teamId = $("#applyTeamId").value;
  const message = $("#applyMessage").value.trim();

  const app = {
    teamId,
    teamName: $("#applyTeamName").textContent.replace("Команда: ", ""),
    userId: currentUser.uid || currentUser.email,
    userName: currentUser.name || currentUser.email,
    userElo: currentUser.elo || null,
    userAge: currentUser.age || null,
    message,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  if (window.DEMO_MODE || !db) {
    app.id = "app_" + Date.now();
    demoApplications.push(app);
    localStorage.setItem("forgecs_apps", JSON.stringify(demoApplications));
    showToast("Заявка отправлена (демо)!", "success");
    closeModal("applyModal");
    renderMyApplications();
    loadStats();
    return;
  }

  try {
    await db.collection("applications").add({
      ...app,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast("Заявка отправлена!", "success");
    closeModal("applyModal");
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ---------- My Applications ----------
function renderMyApplications() {
  const box = $("#myApplications");
  if (!box || !currentUser) return;

  const my = demoApplications.filter(
    (a) => a.userId === (currentUser.uid || currentUser.email)
  );

  if (my.length === 0) {
    box.innerHTML = `<p class="text-muted">У тебя пока нет заявок</p>`;
    return;
  }

  box.innerHTML = my
    .map(
      (a) => `
    <div class="app-item">
      <div class="app-info">
        <h4>${escapeHtml(a.teamName)}</h4>
        <p>${a.message ? escapeHtml(a.message) : "Без сообщения"}</p>
      </div>
      <span class="app-status ${a.status}">${statusText(a.status)}</span>
    </div>`
    )
    .join("");
}

function statusText(s) {
  return { pending: "Ожидает", accepted: "Принята", rejected: "Отклонена" }[s] || s;
}

// ---------- Admin ----------
async function loadAdminApplications() {
  const box = $("#adminApplications");
  if (!box) return;

  if (window.DEMO_MODE || !db) {
    const saved = localStorage.getItem("forgecs_apps");
    demoApplications = saved ? JSON.parse(saved) : [];
  } else {
    try {
      const snap = await db.collection("applications").orderBy("createdAt", "desc").get();
      demoApplications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error(e);
    }
  }

  const filter = document.querySelector(".filter-btn[data-admin].active")?.dataset.admin || "pending";
  const list =
    filter === "pending"
      ? demoApplications.filter((a) => a.status === "pending")
      : demoApplications;

  if (list.length === 0) {
    box.innerHTML = `<div class="empty-state"><p>Нет заявок</p></div>`;
    return;
  }

  box.innerHTML = list
    .map(
      (a) => `
    <div class="app-item">
      <div class="app-info">
        <h4>${escapeHtml(a.userName)} → ${escapeHtml(a.teamName)}</h4>
        <p>Elo: ${a.userElo || "—"} · Возраст: ${a.userAge || "—"} · ${a.message ? escapeHtml(a.message) : ""}</p>
      </div>
      <div class="app-actions">
        ${
          a.status === "pending"
            ? `
          <button class="btn btn-success btn-sm" onclick="updateAppStatus('${a.id}', 'accepted')">Принять</button>
          <button class="btn btn-danger btn-sm" onclick="updateAppStatus('${a.id}', 'rejected')">Отклонить</button>
        `
            : `<span class="app-status ${a.status}">${statusText(a.status)}</span>`
        }
      </div>
    </div>`
    )
    .join("");
}

$$(".filter-btn[data-admin]").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".filter-btn[data-admin]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadAdminApplications();
  });
});

async function updateAppStatus(id, status) {
  if (window.DEMO_MODE || !db) {
    const app = demoApplications.find((a) => a.id === id);
    if (app) {
      app.status = status;
      localStorage.setItem("forgecs_apps", JSON.stringify(demoApplications));
    }
    showToast(status === "accepted" ? "Заявка принята" : "Заявка отклонена", "success");
    loadAdminApplications();
    renderMyApplications();
    return;
  }

  try {
    await db.collection("applications").doc(id).update({ status });
    showToast("Статус обновлён", "success");
    loadAdminApplications();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Make functions global for onclick
window.openApplyModal = openApplyModal;
window.updateAppStatus = updateAppStatus;
window.showSection = showSection;
window.openModal = openModal;
window.closeModal = closeModal;

// ---------- Stats ----------
function loadStats() {
  $("#statTeams").textContent = demoTeams.length;
  $("#statPlayers").textContent = Object.keys(demoUsers).length || "—";
  $("#statApps").textContent = demoApplications.length;
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  // Load demo data
  const apps = localStorage.getItem("forgecs_apps");
  if (apps) demoApplications = JSON.parse(apps);

  loadTeams();
  loadStats();

  // Observe section changes for admin
  const observer = new MutationObserver(() => {
    if ($("#admin")?.classList.contains("active")) {
      loadAdminApplications();
    }
  });
  observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["class"] });
});
