[]
    const total = Array.isArray(data)
      ? data.length
      : (data.count ?? tasks.length)
    const done = tasks.filter(t => t.completed).length
    const active = total - done

    document.getElementById('stat-total').textContent = total
    document.getElementById('stat-active').textContent = active
    document.getElementById('stat-done').textContent = done

    state.stats = { total, active, done }

    document.getElementById('clear-done-btn').style.display =
      done > 0 ? 'inline-flex' : 'none'
    document.getElementById('mark-all-btn').style.display =
      active > 0 ? 'inline-flex' : 'none'
  } catch (_) {
    /* statistika xatosi foydalanuvchiga ko'rinmaydi */
  }
}

/* ================================================
   RO'YXATNI CHIZISH
   ================================================ */
function renderList() {
  document.getElementById('list-spinner').classList.remove('show')
  const list = document.getElementById('todo-list')
  const empty = document.getElementById('empty-state')

  if (!state.tasks.length) {
    empty.style.display = 'block'
    list.innerHTML = ''
    return
  }

  empty.style.display = 'none'

  const priorityIcon = { high: '🔴', medium: '🟡', low: '🟢' }
  const priorityLabel = { high: 'Yuqori', medium: "O'rta", low: 'Past' }

  list.innerHTML = state.tasks
    .map(task => {
      const done = !!task.completed
      const pr = task.priority  'medium'
      const created = task.created_at
        ? new Date(task.created_at).toLocaleDateString('uz-UZ')
        : ''

      return `
    <li class="todo-item${done ? ' is-done' : ''}" id="task-${task.id}">

      <button class="check${done ? ' is-checked' : ''}"
              onclick="toggleTask(${task.id}, ${!done})"
              title="${done ? 'Bajarilmagan deb belgilash' : 'Bajarildi deb belgilash'}">
        ${done ? '✓' : ''}
      </button>

      <div class="todo-content">
        <div class="todo-top">
          <h3 class="todo-title">${esc(task.title)}</h3>
          <span class="badge ${done ? 'badge-done' : 'badge-active'}">
            ${done ? '✅ Bajarildi' : '⏳ Jarayonda'}
          </span>
        </div>
        ${task.description ? <p class="todo-desc">${esc(task.description)}</p> : ''}
        <div class="meta">
          <span class="meta-item">${priorityIcon[pr]} ${priorityLabel[pr]}</span>
          ${created ? <span class="meta-item">📅 ${created}</span> : ''}
          <span class="meta-item">#${task.id}</span>
        </div>
      </div>

      <div class="todo-actions">
        <button class="icon-btn edit"   onclick="openEdit(${task.id})"              title="Tahrirlash">✏️</button>
        <button class="icon-btn danger" onclick="openConfirm(${task.id},'${esc(task.title)}')" title="O'chirish">🗑</button>
      </div>

    </li>`
    })
    .join('')
}

/* ================================================
   SAHIFALASHNI CHIZISH
   ================================================ */
function renderPager() {
  const pager = document.getElementById('pager')
  if (state.totalPages <= 1) {
    pager.style.display = 'none'
    return
  }

  pager.style.display = 'flex'
  document.getElementById('page-info').textContent =
    ${state.page} / ${state.totalPages}
  document.getElementById('prev-btn').disabled = state.page <= 1
  document.getElementById('next-btn').disabled = state.page >= state.totalPages

  const nums = document.getElementById('page-nums')
  nums.innerHTML = ''
  pageRange(state.page, state.totalPages).forEach(n => {
    const b = document.createElement('button')
    if (n === '...') {
      b.className = 'page-num-btn'
      b.textContent = '…'
      b.disabled = true
    } else {
      b.className = 'page-num-btn' + (n === state.page ? ' active' : '')
      b.textContent = n
      b.onclick = () => {
        state.page = n
        loadTasks()
      }
    }
    nums.appendChild(b)
  })
}


function pageRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (cur <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (cur >= total - 3)
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', cur - 1, cur, cur + 1, '...', total]
}

/* ================================================
   VAZIFA QO'SHISH
   ================================================ */
async function addTask() {
  const titleEl = document.getElementById('new-title')
  const descEl = document.getElementById('new-desc')
  const prEl = document.getElementById('new-priority')
  const btn = document.getElementById('add-btn')

  const title = titleEl.value.trim()
  if (!title) {
    toast('Vazifa nomini kiriting!', 'error')
    titleEl.focus()
    return
  }

  btn.disabled = true
  btn.textContent = "⏳ Qo'shilmoqda..."

  try {
    await api('POST', '/tasks/', {
      title,...[]
    const active = tasks.filter(t => !t.completed)

    await Promise.all(
      active.map(t => api('PATCH', `/tasks/${t.id}/`, { completed: true })),
    )
    await loadTasks()
    toast(`${active.length} `, 'success')
  } catch (e) {
    toast('Xatolik: ' + e.message, 'error')
  } finally {
    showLoading(false)
  }
}

/* ================================================
   FILTER & QIDIRUV
   ================================================ */
function setFilter(f, btn) {
  state.filter = f
  state.page = 1
  document
    .querySelectorAll('.seg-btn')
    .forEach(b => b.classList.remove('is-active'))
  btn.classList.add('is-active')
  loadTasks()
}

function handleSearch() {
  clearTimeout(state.searchTimer)
  state.searchTimer = setTimeout(() => {
    state.search = document.getElementById('search-input').value
    state.page = 1
    loadTasks()
  }, 400) /* 400ms debounce */
}

/* ================================================
   SAHIFA O'ZGARTIRISH
   ================================================ */
function changePage(dir) {
  const np = state.page + dir
  if (np < 1  np > state.totalPages) return
  state.page = np
  loadTasks()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* ================================================
   API STATUS
   ================================================ */
function updateApiStatus(ok) {
  const dot = document.getElementById('status-dot')
  const text = document.getElementById('status-text')
  if (ok) {
    dot.className = 'status-dot connected'
    text.textContent = 'API ulangan'
  } else {
    dot.className = 'status-dot error'
    text.textContent = 'API ulanmadi'
  }
}

/* ================================================
   YORDAMCHI FUNKSIYALAR
   ================================================ */
function showLoading(show) {
  document.getElementById('loading-overlay').classList.toggle('show', show)
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ================================================
   KLAVIATURA VA MODAL TASHQARISIGA BOSISH
   ================================================ */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return
  closeEditModal()
  closeConfirm()
  closeBulkConfirm()
})

;['edit-modal', 'confirm-modal', 'bulk-confirm-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function (e) {
    if (e.target === this) {
      if (id === 'edit-modal') closeEditModal()
      if (id === 'confirm-modal') closeConfirm()
      if (id === 'bulk-confirm-modal') closeBulkConfirm()
    }
  })
})

/* ================================================
   AVTOMATIK YANGILASH (har 30 soniyada)
   ================================================ */
setInterval(loadTasks, 30_000)

/* ================================================
   ILOVANI ISHGA TUSHIRISH
   ================================================ */
loadTasks()