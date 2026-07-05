// ============================================
// FakeGuard — app.js
// Shared: theme, auth guard, nav, pages
// ============================================

// ---- Init ----
// Auto-load required scripts (no HTML change needed)



(function () {
  document.addEventListener("DOMContentLoaded", () => {



    // Auth guard — redirect if not logged in
    const publicPages = ['index.html', ''];
    const path = window.location.pathname.split('/').pop();
    const user = getCurrentUser();
    if (!user && !publicPages.includes(path) && path !== '') {
      window.location.href = 'index.html';
    }

    // 🔥 Restore sidebar state
    const savedState = localStorage.getItem("sidebarCollapsed");

    if (savedState === "true") {
      document.getElementById("sidebar")?.classList.add("collapsed");
      document.querySelector(".main-content")?.classList.add("expanded");
    }

  });
})();
// ---- Auth ----
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('fg_current_user')); }
  catch { return null; }
}

function signOut() {
  localStorage.removeItem('fg_current_user');
  window.location.href = 'index.html';
}

// ---- Theme ----
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('fg_theme', next);
}

// ---- History Storage ----
function getHistory() {
  const user = getCurrentUser();
  if (!user) return [];
  return JSON.parse(localStorage.getItem('fg_history_' + user.id) || '[]');
}

function saveToHistory(entry) {
  const user = getCurrentUser();
  if (!user) return;
  const key = 'fg_history_' + user.id;
  const hist = JSON.parse(localStorage.getItem(key) || '[]');
  hist.unshift(entry);
  if (hist.length > 100) hist.length = 100;
  localStorage.setItem(key, JSON.stringify(hist));
}

// ---- Dashboard ----
function loadDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  const name = user.firstName || user.email.split('@')[0];
  const el = document.getElementById('welcome-msg');
  if (el) el.textContent = `Welcome back, ${name}!`;

  const history = getHistory();
  const fake = history.filter(h => h.result === 'fake').length;
  const suspicious = history.filter(h => h.result === 'suspicious').length;
  const real = history.filter(h => h.result === 'real').length;

  setText('stat-total', history.length);
  setText('stat-fake', fake);
  setText('stat-real', real);
  setText('stat-suspicious', suspicious);

  const recentList = document.getElementById('recent-list');
  if (!recentList) return;

  if (history.length === 0) return;

  recentList.innerHTML = '';
  history.slice(0, 5).forEach(h => {
    const div = document.createElement('div');
    div.className = 'recent-item';
    div.innerHTML = `
      <div>
        <div class="recent-user">@${h.username}</div>
        <div class="recent-time">${formatDate(h.date)}</div>
      </div>
      <span class="badge badge-${h.result}">
  ${
    h.result === 'fake'
      ? '⚠ Fake'
      : h.result === 'suspicious'
      ? '⚠ Suspicious'
      : '✓ Real'
  }
</span>
    `;
    recentList.appendChild(div);
  });
}

// ---- History Page ----
let _historyData = [];
let _currentFilter = 'all';

function loadHistory() {
  _historyData = getHistory();
  renderHistory(_historyData);

  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn && _historyData.length > 0) clearBtn.style.display = '';
}

function filterHistory(type, btn) {
  _currentFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = type === 'all' ? _historyData : _historyData.filter(h => h.result === type);
  renderHistory(filtered);
}

function renderHistory(data) {
  const empty = document.getElementById('history-empty');
  const table = document.getElementById('history-table');
  const tbody = document.getElementById('history-body');
  if (!tbody) return;

  if (data.length === 0) {
    empty.classList.remove('hidden');
    table.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  table.classList.remove('hidden');

  tbody.innerHTML = data.map((h, i) => {
  const label =
    h.result === 'fake'
      ? '⚠ Fake'
      : h.result === 'suspicious'
      ? '⚠ Suspicious'
      : '✓ Real';

  return `
    <tr>
      <!-- USERNAME -->
      <td><strong>@${h.username}</strong></td>

      <!-- RESULT (BADGE) -->
      <td>
        <span class="badge badge-${h.result}">
          ${label}
        </span>
      </td>

      <!-- CONFIDENCE -->
      <td>${h.confidence}%</td>

      <!-- DATE -->
      <td>${formatDate(h.date)}</td>

      <!-- ACTION -->
      <td>
        <button class="delete-row" onclick="deleteHistoryItem(${i})">
          🗑
        </button>
      </td>
    </tr>
  `;
}).join('');
}

function deleteHistoryItem(index) {
  const user = getCurrentUser();
  if (!user) return;
  const key = 'fg_history_' + user.id;
  const hist = JSON.parse(localStorage.getItem(key) || '[]');
  hist.splice(index, 1);
  localStorage.setItem(key, JSON.stringify(hist));
  _historyData = hist;
  filterHistory(_currentFilter, document.querySelector('.filter-btn.active'));
  if (_historyData.length === 0) {
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';
  }
}

function clearHistory() {
  if (!confirm('Clear all analysis history?')) return;
  const user = getCurrentUser();
  if (!user) return;
  localStorage.removeItem('fg_history_' + user.id);
  _historyData = [];
  renderHistory([]);
  document.getElementById('clear-btn').style.display = 'none';
}

// ---- Profile Page ----
function loadProfile() {
  const user = getCurrentUser();
  if (!user) return;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  setText('profile-display-name', fullName || 'User');
  setText('profile-display-email', user.email);

  const initials = [(user.firstName||'')[0], (user.lastName||'')[0]].filter(Boolean).join('').toUpperCase() || 'U';
  setText('avatar-display', initials);

  setVal('p-fname', user.firstName || '');
  setVal('p-lname', user.lastName || '');
  setVal('p-email', user.email || '');
  setVal('p-org', user.org || '');
  setVal('p-bio', user.bio || '');

  const hist = getHistory();
  setText('p-total', hist.length);
  setText('p-fake', hist.filter(h => h.result === 'fake').length);
  setText('p-real', hist.filter(h => h.result === 'real').length);
  setText('p-suspicious', hist.filter(h => h.result === 'suspicious').length);
}

function saveProfile() {
  const user = getCurrentUser();
  if (!user) return;

  user.firstName = document.getElementById('p-fname').value.trim();
  user.lastName = document.getElementById('p-lname').value.trim();
  user.email = document.getElementById('p-email').value.trim();
  user.org = document.getElementById('p-org').value.trim();
  user.bio = document.getElementById('p-bio').value.trim();

  // Update in users array too
  const users = JSON.parse(localStorage.getItem('fg_users') || '[]');
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...user };
    localStorage.setItem('fg_users', JSON.stringify(users));
  }

  localStorage.setItem('fg_current_user', JSON.stringify(user));
  loadProfile();

  const suc = document.getElementById('profile-success');
  if (suc) {
    suc.classList.remove('hidden');
    setTimeout(() => suc.classList.add('hidden'), 3000);
  }
}

function changePassword() {
  const cur = document.getElementById('p-cur-pass').value;
  const nw = document.getElementById('p-new-pass').value;
  const con = document.getElementById('p-con-pass').value;

  if (!cur || !nw || !con) return showToast('Please fill in all password fields.');
  if (nw.length < 8) return showToast('New password must be at least 8 characters.');
  if (nw !== con) return showToast('Passwords do not match.');

  const user = getCurrentUser();
  const users = JSON.parse(localStorage.getItem('fg_users') || '[]');
  const idx = users.findIndex(u => u.id === user.id);

  if (idx !== -1 && users[idx].password !== btoa(cur)) {
    return showToast('Current password is incorrect.');
  }

  if (idx !== -1) {
    users[idx].password = btoa(nw);
    localStorage.setItem('fg_users', JSON.stringify(users));
  }

  document.getElementById('p-cur-pass').value = '';
  document.getElementById('p-new-pass').value = '';
  document.getElementById('p-con-pass').value = '';
  showToast('Password updated successfully!');
}

// ---- Helpers ----
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const main = document.querySelector(".main-content");

  sidebar.classList.toggle("collapsed");
  main.classList.toggle("expanded");

  const isCollapsed = sidebar.classList.contains("collapsed");
  localStorage.setItem("sidebarCollapsed", isCollapsed);
}