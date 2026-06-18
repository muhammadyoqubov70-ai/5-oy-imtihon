/* ================================================
   GLOBAL STATE VA SIZNING API SOZLAMALARI
   ================================================ */
const state = {
  tasks: [],
  page: 1,
  totalPages: 1,
  filter: "all",
  search: "",
  searchTimer: null,
};

// SIZNING ASLIY BACKEND API MANZILINGIZ
const API_URL = "https://biyovo1194.pythonanywhere.com";

async function api(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  // URL dagi ortiqcha sleshlarni (//) tozalash (https:// formatiga tegmagan holda)
  const fullUrl = `${API_URL}/${endpoint}`.replace(/([^:]\/)\/+/g, "$1");

  const response = await fetch(fullUrl, options);
  if (!response.ok) {
    throw new Error(`API xatolik: ${response.status}`);
  }
  if (method === "DELETE") return true;
  return await response.json();
}

/* ================================================
   MA'LUMOTLARNI YUKLASH (GET)
   ================================================ */
async function loadTasks() {
  showLoading(true);
  try {
    // URL parametrlari xavfsiz va to'g'ri yig'ilishi uchun
    let endpoint = "api/tasks/";
    const params = [];

    if (state.page) {
      params.push(`page=${state.page}`);
    }
    if (state.filter && state.filter !== "all") {
      const statusParam = state.filter === "completed" ? "true" : "false";
      params.push(`completed=${statusParam}`);
    }
    if (state.search) {
      params.push(`search=${encodeURIComponent(state.search)}`);
    }

    if (params.length > 0) {
      endpoint += "?" + params.join("&");
    }

    const data = await api("GET", endpoint);

    if (Array.isArray(data)) {
      state.tasks = data;
      state.totalPages = 1;
    } else if (data && data.results) {
      state.tasks = data.results;
      state.totalPages = Math.ceil((data.count || 1) / 5) || 1;
    } else {
      state.tasks = [];
      state.totalPages = 1;
    }

    renderList();
    renderPager();
    renderStats(data);
    updateApiStatus(true);
  } catch (e) {
    console.error(e);
    updateApiStatus(false);

    // Agar serverdan xato kelsa, soxta ma'lumot ko'rsatiladi
    state.tasks = [
      {
        id: 1,
        title: "Backend ulansa, bu yerda vazifalar chiqadi",
        description: "Hozircha server xatolik qaytarmoqda.",
        completed: false,
      },
    ];
    renderList();
    toast(`Backend ulanishda xato: ${e.message}`, "error");
  } finally {
    showLoading(false);
  }
}

/* ================================================
   STATISTIKANI CHIZISH
   ================================================ */
function renderStats(data) {
  try {
    const total = Array.isArray(data)
      ? data.length
      : data.count || state.tasks.length;
    const done = state.tasks.filter((t) => t.completed).length;
    const active = total - done;

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-active").textContent = active;
    document.getElementById("stat-done").textContent = done;
  } catch (_) {}
}

/* ================================================
   RO'YXATNI CHIZISH (HTML RENDER)
   ================================================ */
function renderList() {
  const list = document.getElementById("todo-list");
  const empty = document.getElementById("empty-state");

  if (!state.tasks.length) {
    if (empty) empty.style.display = "block";
    if (list) list.innerHTML = "";
    return;
  }

  if (empty) empty.style.display = "none";

  list.innerHTML = state.tasks
    .map((task) => {
      const done = !!task.completed;
      const created = task.created_at
        ? new Date(task.created_at).toLocaleDateString("uz-UZ")
        : new Date().toLocaleDateString("uz-UZ");

      return `
    <li class="todo-item${done ? " is-done" : ""}" id="task-${task.id}">
      <button class="check${done ? " is-checked" : ""}"
              type="button"
              onclick="toggleTask(${task.id}, ${!done})"
              title="${done ? "Faol qilish" : "Bajarildi deb belgilash"}">
        <span class="check-icon">${done ? "✓" : ""}</span>
      </button>

      <div class="todo-content">
        <div class="todo-top">
          <h3 class="todo-title">${esc(task.title)}</h3>
          <span class="badge ${done ? "badge-done" : "badge-active"}">
            ${done ? "Completed" : "Active"}
          </span>
        </div>
        ${task.description ? `<p class="todo-desc">${esc(task.description)}</p>` : ""}
        <div class="meta">
          <span class="meta-item">📅 ${created}</span>
          <span class="meta-item">#${task.id}</span>
        </div>
      </div>

      <div class="todo-actions">
        <button class="icon-btn danger" type="button" onclick="openConfirm(${task.id})" title="O'chirish">🗑</button>
      </div>
    </li>`;
    })
    .join("");
}

/* ================================================
   VAZIFA QO'SHISH (POST)
   ================================================ */
document.getElementById("todo-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const titleEl = document.getElementById("todoTitle");
  const descEl = document.getElementById("todoDesc");
  const btn = document.getElementById("add-btn");

  const title = titleEl.value.trim();
  if (!title) {
    toast("Vazifa nomini kiriting!", "error");
    titleEl.focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = "⏳...";

  try {
    await api("POST", "api/tasks/", {
      title,
      description: descEl ? descEl.value.trim() : "",
      completed: false,
    });

    titleEl.value = "";
    if (descEl) descEl.value = "";

    toast("Vazifa qo'shildi", "success");
    await loadTasks();
  } catch (e) {
    toast("Xatolik: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Qo'shish";
  }
});

/* ================================================
   STATUSNI O'ZGARTIRISH (PATCH)
   ================================================ */
async function toggleTask(id, completed) {
  showLoading(true);
  try {
    await api("PATCH", `api/tasks/${id}/`, { completed });
    toast("Vazifa holati yangilandi", "success");
    await loadTasks();
  } catch (e) {
    toast("Xatolik: " + e.message, "error");
  } finally {
    showLoading(false);
  }
}

/* ================================================
   VAZIFANI O'CHIRISH (DELETE)
   ================================================ */
let deletingTaskId = null;

function openConfirm(id) {
  deletingTaskId = id;
  const modal = document.getElementById("confirm-modal");
  if (modal) modal.style.display = "flex";
}

function closeConfirm() {
  const modal = document.getElementById("confirm-modal");
  if (modal) modal.style.display = "none";
  deletingTaskId = null;
}

async function confirmDelete() {
  if (!deletingTaskId) return;
  showLoading(true);
  try {
    await api("DELETE", `api/tasks/${deletingTaskId}/`);
    toast("Vazifa o'chirildi", "success");
    closeConfirm();
    await loadTasks();
  } catch (e) {
    toast("Xatolik: " + e.message, "error");
  } finally {
    showLoading(false);
  }
}

/* ================================================
   FILTER VA QIDIRUV HODISALARI
   ================================================ */
document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document
      .querySelectorAll(".seg-btn")
      .forEach((b) => b.classList.remove("is-active"));
    e.target.classList.add("is-active");
    state.filter = e.target.getAttribute("data-filter");
    state.page = 1;
    loadTasks();
  });
});

document.getElementById("search-input").addEventListener("input", (e) => {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => {
    state.search = e.target.value.trim();
    state.page = 1;
    loadTasks();
  }, 400);
});

document.getElementById("refresh-btn").addEventListener("click", loadTasks);

/* ================================================
   PAGINATION HODISALARI
   ================================================ */
function renderPager() {
  document.getElementById("page-current").textContent = state.page;
  document.getElementById("page-total").textContent = state.totalPages;
  document.getElementById("prev-btn").disabled = state.page <= 1;
  document.getElementById("next-btn").disabled = state.page >= state.totalPages;
}

document.getElementById("prev-btn").addEventListener("click", () => {
  if (state.page > 1) {
    state.page--;
    loadTasks();
  }
});

document.getElementById("next-btn").addEventListener("click", () => {
  if (state.page < state.totalPages) {
    state.page++;
    loadTasks();
  }
});

/* ================================================
   YORDAMCHI FUNKSIYALAR
   ================================================ */
function showLoading(show) {
  const loader = document.getElementById("loading-overlay");
  if (loader) loader.style.display = show ? "block" : "none";
}

function updateApiStatus(ok) {
  const dot = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  if (dot && text) {
    dot.className = ok ? "status-dot connected" : "status-dot error";
    text.textContent = ok ? "API ulangan" : "API ulanmadi";
  }
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toast(message, type = "success") {
  const toastEl = document.createElement("div");
  toastEl.className = `toast toast-${type}`;
  toastEl.textContent = message;
  toastEl.style.position = "fixed";
  toastEl.style.bottom = "20px";
  toastEl.style.right = "20px";
  toastEl.style.padding = "12px 24px";
  toastEl.style.background = type === "success" ? "#2ecc71" : "#e74c3c";
  toastEl.style.color = "#fff";
  toastEl.style.borderRadius = "8px";
  toastEl.style.zIndex = "9999";
  document.body.appendChild(toastEl);
  setTimeout(() => toastEl.remove(), 3000);
}

document.addEventListener("DOMContentLoaded", loadTasks);
