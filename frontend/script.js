/**
 * Task Management Application - Frontend Client
 * Handles Authentication, Task CRUD, Filter/Search, Metrics, and UI Interactions
 */

// Determine API base URL dynamically
const API_BASE = window.location.origin.includes(':5000') || window.location.origin.includes('localhost')
  ? `${window.location.origin}/api`
  : 'http://localhost:5000/api';

// ==========================================================================
// Authentication & Storage Utilities
// ==========================================================================
const AUTH_TOKEN_KEY = 'taskflow_jwt_token';
const AUTH_USER_KEY = 'taskflow_user_profile';

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getStoredUser() {
  const user = localStorage.getItem(AUTH_USER_KEY);
  return user ? JSON.parse(user) : null;
}

function setAuthSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function handleLogout() {
  clearAuthSession();
  showToast('You have been logged out.', 'info');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 400);
}

// ==========================================================================
// Toast Notification Utility
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else {
    iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Password toggle helper
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

// ==========================================================================
// Authenticated API Request Wrapper
// ==========================================================================
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (response.status === 401) {
      // Unauthorized or token expired
      clearAuthSession();
      if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        window.location.href = 'index.html';
      }
      throw new Error(data.message || 'Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(data.message || 'An error occurred with the request.');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ==========================================================================
// Auth Page Logic (index.html)
// ==========================================================================
function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabReg = document.getElementById('tab-register');
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');

  if (tab === 'login') {
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    title.innerText = 'Welcome Back';
    subtitle.innerText = 'Manage your daily tasks efficiently and stay productive.';
  } else {
    loginForm.style.display = 'none';
    regForm.style.display = 'block';
    tabReg.classList.add('active');
    tabLogin.classList.remove('active');
    title.innerText = 'Create Account';
    subtitle.innerText = 'Start organizing your tasks with ease today.';
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('btn-login-submit');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Signing In...</span>';

    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setAuthSession(data.token, data.user);
    showToast('Login successful! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 600);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Sign In</span>';
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('btn-reg-submit');
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;

  if (password !== confirmPassword) {
    showToast('Passwords do not match!', 'error');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating Account...</span>';

    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });

    setAuthSession(data.token, data.user);
    showToast('Registration successful! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 600);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Create Account</span>';
  }
}

// ==========================================================================
// Dashboard Logic (dashboard.html)
// ==========================================================================
let currentTasks = [];
let taskToDeleteId = null;
let searchTimeout = null;

const currentFilters = {
  status: 'all',
  priority: '',
  search: '',
  sortBy: 'createdAt',
  order: 'desc'
};

async function initDashboard() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // Display user information
  const user = getStoredUser();
  if (user) {
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const avatarEl = document.getElementById('user-avatar');

    if (nameEl) nameEl.innerText = user.name || 'User';
    if (emailEl) emailEl.innerText = user.email || '';
    if (avatarEl) {
      avatarEl.innerText = (user.name ? user.name.charAt(0) : 'U').toUpperCase();
    }
  }

  await loadTasks();
}

async function loadTasks() {
  try {
    const params = new URLSearchParams();
    if (currentFilters.status && currentFilters.status !== 'all' && currentFilters.status !== 'overdue') {
      params.append('status', currentFilters.status);
    }
    if (currentFilters.priority) {
      params.append('priority', currentFilters.priority);
    }
    if (currentFilters.search) {
      params.append('search', currentFilters.search);
    }
    if (currentFilters.sortBy) {
      params.append('sortBy', currentFilters.sortBy);
      params.append('order', currentFilters.order);
    }

    const data = await apiRequest(`/tasks?${params.toString()}`);
    currentTasks = data.tasks || [];

    // Client-side filtering for overdue if selected
    let displayedTasks = currentTasks;
    const now = new Date();
    if (currentFilters.status === 'overdue') {
      displayedTasks = currentTasks.filter(
        (t) => t.status === 'pending' && t.deadline && new Date(t.deadline) < now
      );
    }

    renderStats(data.stats);
    renderTasks(displayedTasks);
  } catch (err) {
    showToast(err.message || 'Failed to fetch tasks', 'error');
  }
}

function renderStats(stats) {
  if (!stats) return;

  const totalEl = document.getElementById('stat-total');
  const completedEl = document.getElementById('stat-completed');
  const pendingEl = document.getElementById('stat-pending');
  const overdueEl = document.getElementById('stat-overdue');
  const progressFillEl = document.getElementById('progress-bar-fill');
  const progressPercentEl = document.getElementById('progress-percentage');
  const progressCountText = document.getElementById('progress-count-text');

  if (totalEl) totalEl.innerText = stats.total;
  if (completedEl) completedEl.innerText = stats.completed;
  if (pendingEl) pendingEl.innerText = stats.pending;
  if (overdueEl) overdueEl.innerText = stats.overdue;

  // Calculate percentage
  const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (progressFillEl) progressFillEl.style.width = `${percent}%`;
  if (progressPercentEl) progressPercentEl.innerText = `${percent}%`;
  if (progressCountText) {
    progressCountText.innerText = `${stats.completed} of ${stats.total} tasks completed`;
  }
}

function renderTasks(tasks) {
  const container = document.getElementById('tasks-container');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>
        <h3>No tasks found</h3>
        <p>You don't have any tasks matching the current view. Create a new task to get started!</p>
        <button class="btn btn-primary" onclick="openCreateTaskModal()">
          + Add New Task
        </button>
      </div>
    `;
    return;
  }

  const now = new Date();

  container.innerHTML = tasks
    .map((task) => {
      const isCompleted = task.status === 'completed';
      const deadlineDate = task.deadline ? new Date(task.deadline) : null;
      const isOverdue = !isCompleted && deadlineDate && deadlineDate < now;

      // Format deadline display
      let deadlineBadge = '';
      if (deadlineDate) {
        const formattedDate = deadlineDate.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        deadlineBadge = `
          <span class="badge badge-deadline ${isOverdue ? 'overdue' : ''}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${isOverdue ? 'Overdue: ' : 'Due: '}${formattedDate}
          </span>
        `;
      }

      const createdDateFormatted = new Date(task.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });

      return `
        <article class="task-card ${isCompleted ? 'is-completed' : ''}" data-id="${task._id}">
          <div class="task-card-header">
            <div class="task-title-group">
              <input 
                type="checkbox" 
                class="status-checkbox" 
                ${isCompleted ? 'checked' : ''} 
                onchange="toggleTaskStatus('${task._id}', this.checked)"
                title="${isCompleted ? 'Mark as pending' : 'Mark as completed'}"
              />
              <h4 class="task-title">${escapeHtml(task.title)}</h4>
            </div>
          </div>

          ${
            task.description
              ? `<p class="task-description">${escapeHtml(task.description)}</p>`
              : '<p class="task-description" style="color: var(--text-light); font-style: italic;">No description provided.</p>'
          }

          <div class="task-badges">
            <span class="badge badge-priority-${task.priority}">
              ● ${escapeHtml(task.priority)} priority
            </span>
            <span class="badge badge-status-${task.status}">
              ${escapeHtml(task.status)}
            </span>
            ${deadlineBadge}
          </div>

          <div class="task-card-footer">
            <span class="task-date">Created ${createdDateFormatted}</span>
            <div class="task-actions">
              <button class="icon-btn" onclick="openEditTaskModal('${task._id}')" title="Edit Task">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
              <button class="icon-btn delete-btn" onclick="openDeleteModal('${task._id}')" title="Delete Task">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

// ==========================================================================
// Task Actions (Create, Edit, Toggle Status, Delete)
// ==========================================================================
async function toggleTaskStatus(taskId, isChecked) {
  const newStatus = isChecked ? 'completed' : 'pending';
  try {
    await apiRequest(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Task marked as ${newStatus}`, 'success');
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
    await loadTasks(); // Revert check state on error
  }
}

function openCreateTaskModal() {
  document.getElementById('modal-title').innerText = 'Create New Task';
  document.getElementById('task-id').value = '';
  document.getElementById('task-title-input').value = '';
  document.getElementById('task-desc-input').value = '';
  document.getElementById('task-deadline-input').value = '';
  document.getElementById('task-priority-input').value = 'medium';
  document.getElementById('status-group').style.display = 'none';

  const modal = document.getElementById('task-modal');
  modal.classList.add('open');
  document.getElementById('task-title-input').focus();
}

function openEditTaskModal(taskId) {
  const task = currentTasks.find((t) => t._id === taskId);
  if (!task) return;

  document.getElementById('modal-title').innerText = 'Edit Task';
  document.getElementById('task-id').value = task._id;
  document.getElementById('task-title-input').value = task.title;
  document.getElementById('task-desc-input').value = task.description || '';

  // Format date input to YYYY-MM-DD
  if (task.deadline) {
    const d = new Date(task.deadline);
    const dateStr = d.toISOString().split('T')[0];
    document.getElementById('task-deadline-input').value = dateStr;
  } else {
    document.getElementById('task-deadline-input').value = '';
  }

  document.getElementById('task-priority-input').value = task.priority || 'medium';
  document.getElementById('task-status-input').value = task.status || 'pending';
  document.getElementById('status-group').style.display = 'block';

  const modal = document.getElementById('task-modal');
  modal.classList.add('open');
}

function closeTaskModal() {
  const modal = document.getElementById('task-modal');
  modal.classList.remove('open');
}

async function handleTaskFormSubmit(event) {
  event.preventDefault();
  const saveBtn = document.getElementById('btn-save-task');
  const taskId = document.getElementById('task-id').value;
  const title = document.getElementById('task-title-input').value.trim();
  const description = document.getElementById('task-desc-input').value.trim();
  const deadline = document.getElementById('task-deadline-input').value;
  const priority = document.getElementById('task-priority-input').value;
  const status = document.getElementById('task-status-input').value;

  if (!title) {
    showToast('Task title is required.', 'error');
    return;
  }

  const payload = {
    title,
    description,
    deadline: deadline || null,
    priority,
    ...(taskId ? { status } : {})
  };

  try {
    saveBtn.disabled = true;
    saveBtn.innerText = 'Saving...';

    if (taskId) {
      // Update existing
      await apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Task updated successfully!', 'success');
    } else {
      // Create new
      await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Task created successfully!', 'success');
    }

    closeTaskModal();
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = 'Save Task';
  }
}

// Delete modal logic
function openDeleteModal(taskId) {
  taskToDeleteId = taskId;
  const modal = document.getElementById('delete-modal');
  modal.classList.add('open');
}

function closeDeleteModal() {
  taskToDeleteId = null;
  const modal = document.getElementById('delete-modal');
  modal.classList.remove('open');
}

async function confirmDeleteTask() {
  if (!taskToDeleteId) return;
  const confirmBtn = document.getElementById('confirm-delete-btn');

  try {
    confirmBtn.disabled = true;
    confirmBtn.innerText = 'Deleting...';

    await apiRequest(`/tasks/${taskToDeleteId}`, {
      method: 'DELETE'
    });

    showToast('Task deleted successfully.', 'success');
    closeDeleteModal();
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerText = 'Delete Task';
  }
}

// ==========================================================================
// Filter and Search Events
// ==========================================================================
function setStatusFilter(status, btnElement) {
  currentFilters.status = status;

  // Update active class on pill buttons
  document.querySelectorAll('.filter-pill').forEach((btn) => btn.classList.remove('active'));
  if (btnElement) {
    btnElement.classList.add('active');
  }

  loadTasks();
}

function handlePriorityFilter(priority) {
  currentFilters.priority = priority;
  loadTasks();
}

function handleSortChange(sortValue) {
  const [field, order] = sortValue.split('_');
  currentFilters.sortBy = field;
  currentFilters.order = order;
  loadTasks();
}

function handleSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentFilters.search = query.trim();
    loadTasks();
  }, 300);
}

// Close modal when pressing Escape or clicking outside
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeTaskModal();
    closeDeleteModal();
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    closeTaskModal();
    closeDeleteModal();
  }
});

// ==========================================================================
// Bootstrap on DOM Ready
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const isDashboard = window.location.pathname.includes('dashboard.html') || document.getElementById('tasks-container');
  const isAuthPage = window.location.pathname.includes('index.html') || document.getElementById('login-form');

  const token = getAuthToken();

  if (isDashboard) {
    if (!token) {
      window.location.href = 'index.html';
      return;
    }
    initDashboard();
  } else if (isAuthPage) {
    if (token) {
      window.location.href = 'dashboard.html';
    }
  }
});
