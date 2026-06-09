// State variables
let currentState = null;
let countdownStartDateStr = null;
let token = localStorage.getItem('token');
let currentUserEmail = localStorage.getItem('email');
let isAdmin = localStorage.getItem('isAdmin') === 'true';

let authMode = 'login'; // 'login' or 'signup'
let activeAdminTab = 'notifs';

// Fetch helper with Authorization header
async function authorizedFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401 || response.status === 403) {
    // Session expired or unauthorized
    logout();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP Error ${response.status}`);
  }
  
  return response;
}

// Helpers
function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr) {
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString('en-IN', options);
}

// Check if user is authenticated and setup view
function checkAuth() {
  const authScreen = document.getElementById('auth-screen');
  const appContent = document.getElementById('app-content');
  const adminBtn = document.getElementById('admin-panel-btn');

  if (token) {
    authScreen.style.display = 'none';
    appContent.style.display = 'flex';
    if (isAdmin) {
      adminBtn.style.display = 'flex';
      fetchAdminNotifications(); // Fetch notifications count for badge
    } else {
      adminBtn.style.display = 'none';
    }
    fetchState();
  } else {
    authScreen.style.display = 'flex';
    appContent.style.display = 'none';
  }
}

// Toggle between Login & Signup UI
function toggleAuthMode() {
  const title = document.getElementById('auth-title');
  const submitBtn = document.getElementById('btn-auth-submit');
  const toggleText = document.getElementById('toggle-auth-mode');
  const errorMsg = document.getElementById('auth-error');
  errorMsg.style.display = 'none';

  if (authMode === 'login') {
    authMode = 'signup';
    title.innerText = '📝 Register Target Account';
    submitBtn.innerText = 'Sign Up';
    toggleText.innerText = 'Login';
  } else {
    authMode = 'login';
    title.innerText = '🔒 Enter Target Dashboard';
    submitBtn.innerText = 'Login';
    toggleText.innerText = 'Sign Up';
  }
}

// Submit Login/Signup Form
document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorMsg = document.getElementById('auth-error');
  errorMsg.style.display = 'none';

  const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    token = data.token;
    currentUserEmail = data.email;
    isAdmin = data.isAdmin;

    localStorage.setItem('token', token);
    localStorage.setItem('email', currentUserEmail);
    localStorage.setItem('isAdmin', isAdmin);

    checkAuth();
  } catch (err) {
    errorMsg.innerText = err.message;
    errorMsg.style.display = 'block';
  }
});

// Logout
function logout() {
  token = null;
  currentUserEmail = null;
  isAdmin = false;
  localStorage.clear();
  checkAuth();
}

// Fetch state
async function fetchState() {
  const localDate = getLocalDateString();
  try {
    const res = await authorizedFetch('/api/state', {
      method: 'POST',
      body: JSON.stringify({ localDate })
    });
    const data = await res.json();
    currentState = data.state;
    countdownStartDateStr = data.countdownStartDate;

    updateUI();
  } catch (err) {
    console.error('Error fetching state:', err);
  }
}

// Update UI
function updateUI() {
  if (!currentState) return;

  document.getElementById('today-date-text').innerText = formatDateDisplay(currentState.date);
  updateCountdown();

  document.getElementById('sales-current').innerText = currentState.salesCallsCount;
  document.getElementById('sales-target').value = currentState.salesCallsTarget;

  renderTasksList();
  renderConsistencyGrid();
}

// Update Countdown
function updateCountdown() {
  if (!countdownStartDateStr) return;

  const startDate = new Date(countdownStartDateStr);
  const targetDate = new Date(startDate.getTime());
  targetDate.setDate(startDate.getDate() + 365);

  const today = new Date(getLocalDateString());
  const timeDiff = targetDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  const countdownDaysEl = document.getElementById('countdown-days');
  const bannerEl = document.getElementById('hinglish-banner');

  if (daysDiff <= 0) {
    countdownDaysEl.innerText = '0';
    bannerEl.innerText = "Target period ended! Results time. dekh.";
  } else {
    countdownDaysEl.innerText = daysDiff;
    bannerEl.innerText = `${daysDiff} aur bache hai, is bar to kar hi le. dekh.`;
  }
}

// Render tasks
function renderTasksList() {
  const listEl = document.getElementById('tasks-list');
  listEl.innerHTML = '';

  currentState.tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;

    li.innerHTML = `
      <label class="task-checkbox-wrapper">
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
        <span class="custom-checkbox"></span>
        <span class="task-text">${task.text}</span>
      </label>
      <button class="delete-task-btn" onclick="deleteTask('${task.id}')">
        <i data-lucide="trash-2"></i>
      </button>
    `;
    listEl.appendChild(li);
  });

  lucide.createIcons();
}

// Sales Call Actions
document.getElementById('btn-inc-sales').addEventListener('click', async () => {
  try {
    const res = await authorizedFetch('/api/sales/count', {
      method: 'POST',
      body: JSON.stringify({ localDate: getLocalDateString(), increment: true })
    });
    currentState = await res.json();
    updateUI();
  } catch (err) {
    console.error(err);
  }
});

document.getElementById('btn-dec-sales').addEventListener('click', async () => {
  try {
    const res = await authorizedFetch('/api/sales/count', {
      method: 'POST',
      body: JSON.stringify({ localDate: getLocalDateString(), increment: false })
    });
    currentState = await res.json();
    updateUI();
  } catch (err) {
    console.error(err);
  }
});

document.getElementById('sales-target').addEventListener('change', async (e) => {
  const targetVal = parseInt(e.target.value) || 10;
  try {
    const res = await authorizedFetch('/api/sales/target', {
      method: 'POST',
      body: JSON.stringify({ localDate: getLocalDateString(), target: targetVal })
    });
    currentState = await res.json();
    updateUI();
  } catch (err) {
    console.error(err);
  }
});

// Add Task Action
document.getElementById('add-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('task-input');
  const text = input.value.trim();
  if (!text) return;

  try {
    const res = await authorizedFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ localDate: getLocalDateString(), text })
    });
    currentState = await res.json();
    input.value = '';
    updateUI();
  } catch (err) {
    console.error(err);
  }
});

// Toggle Task Action
async function toggleTask(taskId) {
  try {
    const res = await authorizedFetch(`/api/tasks/${taskId}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ localDate: getLocalDateString() })
    });
    currentState = await res.json();
    updateUI();
  } catch (err) {
    console.error(err);
  }
}

// Delete Task Action
async function deleteTask(taskId) {
  try {
    const res = await authorizedFetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      body: JSON.stringify({ localDate: getLocalDateString() })
    });
    currentState = await res.json();
    updateUI();
  } catch (err) {
    console.error(err);
  }
}

// Render Consistency Grid (365 cells)
async function renderConsistencyGrid() {
  if (!countdownStartDateStr) return;

  try {
    const res = await authorizedFetch('/api/logs');
    const logs = await res.json();

    const logsMap = {};
    logs.forEach(log => {
      logsMap[log.date] = log;
    });

    const gridEl = document.getElementById('consistency-grid');
    gridEl.innerHTML = '';

    const start = new Date(countdownStartDateStr);
    
    for (let i = 0; i < 365; i++) {
      const cellDate = new Date(start.getTime());
      cellDate.setDate(start.getDate() + i);
      const cellDateStr = cellDate.toLocaleDateString('en-CA');
      
      const cell = document.createElement('div');
      cell.className = 'grid-cell';

      const log = logsMap[cellDateStr];
      const todayStr = getLocalDateString();

      let tooltipText = `${formatDateDisplay(cellDateStr)}: No record`;

      if (cellDateStr === todayStr) {
        const totalTasks = currentState.tasks.length + 1;
        const comp = currentState.tasks.filter(t => t.completed).length;
        const salesCallsDone = currentState.salesCallsCount;
        const target = currentState.salesCallsTarget;

        let perf = 'red';
        if (salesCallsDone >= target && comp === currentState.tasks.length) {
          perf = 'green';
        } else if (salesCallsDone > 0 || comp > 0) {
          perf = 'yellow';
        }

        cell.classList.add(perf);
        cell.style.outline = '2px solid var(--gold)';
        tooltipText = `${formatDateDisplay(cellDateStr)} (Today): ${comp}/${currentState.tasks.length} tasks, ${salesCallsDone}/${target} sales calls`;
      } else if (log) {
        cell.classList.add(log.performance);
        tooltipText = `${formatDateDisplay(cellDateStr)}: ${log.tasksCompleted}/${log.tasksTotal} completed, ${log.salesCallsCount}/${log.salesCallsTarget} sales calls (${log.performance.toUpperCase()})`;
      } else if (new Date(cellDateStr) < new Date(todayStr)) {
        cell.classList.add('red');
        tooltipText = `${formatDateDisplay(cellDateStr)}: Incomplete/No Activity (RED)`;
      } else {
        tooltipText = `${formatDateDisplay(cellDateStr)}: Future`;
      }

      cell.setAttribute('data-tooltip', tooltipText);
      gridEl.appendChild(cell);
    }
  } catch (err) {
    console.error('Error fetching logs:', err);
  }
}

// Admin Panel Logic
function openAdminPanel() {
  document.getElementById('admin-modal').style.display = 'flex';
  switchAdminTab('notifs');
}

function closeAdminPanel() {
  document.getElementById('admin-modal').style.display = 'none';
}

function switchAdminTab(tabName) {
  activeAdminTab = tabName;
  const tabNotifsBtn = document.getElementById('tab-notifs');
  const tabUsersBtn = document.getElementById('tab-users');
  const notifContent = document.getElementById('admin-tab-content-notifs');
  const userContent = document.getElementById('admin-tab-content-users');

  if (tabName === 'notifs') {
    tabNotifsBtn.classList.add('active');
    tabUsersBtn.classList.remove('active');
    notifContent.style.display = 'block';
    userContent.style.display = 'none';
    fetchAdminNotifications();
  } else {
    tabNotifsBtn.classList.remove('active');
    tabUsersBtn.classList.add('active');
    notifContent.style.display = 'none';
    userContent.style.display = 'block';
    fetchAdminUsers();
  }
}

async function fetchAdminNotifications() {
  try {
    const res = await authorizedFetch('/api/admin/notifications');
    const notifications = await res.json();
    
    // Update admin button badge
    const badge = document.getElementById('admin-notif-count');
    if (notifications.length > 0) {
      badge.innerText = notifications.length;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }

    const listEl = document.getElementById('notif-list');
    listEl.innerHTML = '';

    if (notifications.length === 0) {
      listEl.innerHTML = '<li style="justify-content: center; color: var(--text-muted);">No new signup notifications</li>';
      return;
    }

    notifications.forEach(n => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="notif-msg">🔔 ${n.message}</span>
        <span class="notif-time">${new Date(n.createdAt).toLocaleString('en-IN')}</span>
      `;
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

async function clearNotifications() {
  try {
    await authorizedFetch('/api/admin/notifications/clear', { method: 'POST' });
    fetchAdminNotifications();
  } catch (err) {
    console.error(err);
  }
}

async function fetchAdminUsers() {
  try {
    const res = await authorizedFetch('/api/admin/users');
    const users = await res.json();

    const listEl = document.getElementById('user-list');
    listEl.innerHTML = '';

    users.forEach(u => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="notif-msg">👤 ${u.email}</span>
        <span class="notif-time">${u.isAdmin ? '<span class="user-admin-badge">Admin</span>' : ''} Created: ${new Date(u.createdAt).toLocaleDateString('en-IN')}</span>
      `;
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  lucide.createIcons();

  let activeDate = getLocalDateString();
  setInterval(() => {
    if (!token) return;
    const curDate = getLocalDateString();
    if (curDate !== activeDate) {
      activeDate = curDate;
      fetchState();
    }
  }, 15000);
});
