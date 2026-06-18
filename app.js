const BASE_URL = "https://biyovo1194.pythonanywhere.com/api/v1/";

let currentPage = 1;
let totalPages = 1;
let currentFilter = "all";
let currentSort = "newest";
let searchQuery = "";

const todoListEl = document.querySelector('[data-list="todos"]');
const emptyEl = document.querySelector('[data-state="empty"]');
const statCountEl = document.querySelector('[data-stat="count"]');
const statDoneEl = document.querySelector('[data-stat="done"]');
const statActiveEl = document.querySelector('[data-stat="active"]');
const pageCurrentEl = document.querySelector('[data-page="current"]');
const pageTotalEl = document.querySelector('[data-page="total"]');
const prevBtn = document.querySelector('[data-action="prev"]');
const nextBtn = document.querySelector('[data-action="next"]');
const searchInput = document.querySelector('[data-field="search"]');
const sortSelect = document.querySelector('[data-field="sort"]');
const createForm = document.querySelector('[data-form="create"]');

async function getTodos() {
  try {
    const params = new URLSearchParams();
    params.set("page", currentPage);

    if (searchQuery) params.set("search", searchQuery);

    const response = await fetch(`${BASE_URL}/tasks/?${params}`);
    if (!response.ok) throw new Error("API xatosi");

    const data = await response.json();
    console.log("API response:", data);

    const results = data?.data?.results ?? data?.results ?? data;
    const todos = Array.isArray(results) ? results : [];
    const count = data?.data?.count ?? data?.count ?? todos.length;

    totalPages = Math.ceil(count / 10) || 1;

    renderTodos(todos);
    updateStats(todos);
    updatePager();
  } catch (error) {
    console.log("getTodos xatosi:", error);
  }
}

async function createTodo(title, description) {
  try {
    const response = await fetch(`${BASE_URL}/tasks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    if (!response.ok) throw new Error("Yaratishda xato");

    await getTodos();
  } catch (error) {
    console.log("createTodo xatosi:", error);
  }
}

async function deleteTodo(id) {
  try {
    const response = await fetch(`${BASE_URL}/tasks/${id}/`, {
      method: "DELETE",
    });
    if (!response.ok && response.status !== 204)
      throw new Error("O'chirishda xato");

    await getTodos();
  } catch (error) {
    console.log("deleteTodo xatosi:", error);
  }
}

async function toggleTodo(id, completed) {
  try {
    const response = await fetch(`${BASE_URL}/tasks/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    if (!response.ok) throw new Error("Yangilashda xato");

    await getTodos();
  } catch (error) {
    console.log("toggleTodo xatosi:", error);
  }
}

async function editTodo(id, title, description) {
  try {
    const response = await fetch(`${BASE_URL}/tasks/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    if (!response.ok) throw new Error("Tahrirlashda xato");

    await getTodos();
  } catch (error) {
    console.log("editTodo xatosi:", error);
  }
}

function renderTodos(todos) {
  let filtered = filterTodos(todos);
  filtered = sortTodos(filtered);

  todoListEl.innerHTML = "";

  if (filtered.length === 0) {
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;

  filtered.forEach((todo) => {
    const isCompleted = todo.completed;
    const createdDate = todo.created_at ? todo.created_at.slice(0, 10) : "—";

    const li = document.createElement("li");
    li.className = `todo-item${isCompleted ? " is-done" : ""}`;
    li.dataset.id = todo.id;
    li.dataset.completed = isCompleted;

    li.innerHTML = `
      <button class="check ${isCompleted ? "is-checked" : ""}" type="button"
        aria-label="${isCompleted ? "Mark as active" : "Mark as completed"}"
        data-action="toggle">
        <span class="check-icon" aria-hidden="true">${isCompleted ? "✓" : ""}</span>
      </button>      <div class="todo-content">
        <div class="todo-top">
          <h3 class="todo-title">${escapeHtml(todo.title)}</h3>
          <span class="badge ${isCompleted ? "badge-done" : "badge-active"}">
            ${isCompleted ? "Completed" : "Active"}
          </span>
        </div>
        ${todo.description ? `<p class="todo-desc">${escapeHtml(todo.description)}</p>` : ""}
        <div class="meta">
          <span class="meta-item">
            <span class="meta-label">ID:</span>
            <span class="meta-value">${todo.id}</span>
          </span>
          <span class="meta-item">
            <span class="meta-label">Created:</span>
            <span class="meta-value">${createdDate}</span>
          </span>
        </div>
      </div>

      <div class="todo-actions">
        <button class="icon-btn" type="button" title="Edit" data-action="edit">✎</button>
        <button class="icon-btn danger" type="button" title="Delete" data-action="delete">🗑</button>
      </div>
    `;

    todoListEl.appendChild(li);
  });
}

function filterTodos(todos) {
  if (currentFilter === "active") return todos.filter((t) => !t.completed);
  if (currentFilter === "completed") return todos.filter((t) => t.completed);
  return todos;
}

function sortTodos(todos) {
  const sorted = [...todos];
  if (currentSort === "newest") return sorted.sort((a, b) => b.id - a.id);
  if (currentSort === "oldest") return sorted.sort((a, b) => a.id - b.id);
  if (currentSort === "az")
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  if (currentSort === "za")
    return sorted.sort((a, b) => b.title.localeCompare(a.title));
  return sorted;
}

function updateStats(todos) {
  const done = todos.filter((t) => t.completed).length;
  const active = todos.filter((t) => !t.completed).length;
  statCountEl.textContent = todos.length;
  statDoneEl.textContent = done;
  statActiveEl.textContent = active;
}

function updatePager() {
  pageCurrentEl.textContent = currentPage;
  pageTotalEl.textContent = totalPages;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

function openEditModal(id, title, description) {
  const existing = document.getElementById("edit-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "edit-modal";
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center; z-index: 100;
  `;
  modal.innerHTML = `
    <div style="
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 24px; width: 90%; max-width: 480px;
      display: grid; gap: 14px;
    ">
      <h2 style="margin:0; font-size:18px;">Tahrirlash</h2>
      <div class="field">
        <label for="edit-title">Title</label>
        <input id="edit-title" type="text" value="${escapeHtml(title)}" autocomplete="off" />
      </div>
      <div class="field">
        <label for="edit-desc">Description</label>
        <textarea id="edit-desc" rows="2">${escapeHtml(description || "")}</textarea>
      </div>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button class="btn btn-ghost" id="edit-cancel">Bekor</button>
        <button class="btn btn-primary" id="edit-save">Saqlash</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById("edit-cancel")
    .addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document.getElementById("edit-save").addEventListener("click", async () => {
    const newTitle = document.getElementById("edit-title").value.trim();
    const newDesc = document.getElementById("edit-desc").value.trim();
    if (!newTitle) return;

    modal.remove();
    await editTodo(id, newTitle, newDesc);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = createForm.querySelector('[name="title"]').value.trim();
  const description = createForm
    .querySelector('[name="description"]')
    .value.trim();
  if (!title) return;

  await createTodo(title, description);
  createForm.reset();
});

todoListEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const li = btn.closest(".todo-item");
  if (!li) return;

  const id = li.dataset.id;
  const completed = li.dataset.completed === "true";
  const title = li.querySelector(".todo-title").textContent;
  const descEl = li.querySelector(".todo-desc");
  const description = descEl ? descEl.textContent : "";

  const action = btn.dataset.action;

  if (action === "toggle") await toggleTodo(id, completed);
  if (action === "delete") await deleteTodo(id);
  if (action === "edit") openEditModal(id, title, description);
});

document.querySelectorAll("[data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("[data-filter]")
      .forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentFilter = btn.dataset.filter;
    getTodos();
  });
});

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  getTodos();
});

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.trim();
    currentPage = 1;
    getTodos();
  }, 400);
});

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    getTodos();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    getTodos();
  }
});

document
  .querySelector('[data-action="refresh"]')
  .addEventListener("click", () => {
    getTodos();
  });

getTodos();
