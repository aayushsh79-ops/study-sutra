const taskInput = document.getElementById("taskInput");
const taskStartTime = document.getElementById("taskStartTime");
const taskCategory = document.getElementById("taskCategory");
const taskPriority = document.getElementById("taskPriority");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const taskDate = document.getElementById("taskDate");
const progressFill = document.getElementById("progressFill");
const clearCompleted = document.getElementById("clearCompleted");
const exportBtn = document.getElementById("exportBtn");
const emptyState = document.getElementById("emptyState");
const themeToggle = document.getElementById("themeToggle");
const themeToggleNav = document.getElementById("dark-mode-toggle-nav");
const progressPerc = document.getElementById("progressPerc");
// Filters & stats
const filterAll = document.getElementById('filterAll');
const filterActive = document.getElementById('filterActive');
const filterCompleted = document.getElementById('filterCompleted');
const statTotal = document.getElementById('statTotal');
const statDone = document.getElementById('statDone');
const statPending = document.getElementById('statPending');

let currentFilter = 'all';

// Default = today
const today = new Date().toISOString().split("T")[0];
taskDate.value = today;

taskDate.addEventListener("change", loadTasks);

// Ask permission for notifications
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

// Add task
addBtn.addEventListener("click", () => {
  const text = taskInput.value.trim();
  const startTime = taskStartTime.value;
  const date = taskDate.value;
  const category = taskCategory.value;
  const priority = taskPriority.value;

  if (text === "" || !date) return;

  const tasks = getTasks(date);
  tasks.push({ text, startTime, category, priority, completed: false });
  tasks.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  saveTasks(date, tasks);

  taskInput.value = "";
  taskStartTime.value = "";
  loadTasks();
});

// Allow Enter key in textbox to add task
if (taskInput) {
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBtn.click();
    }
  });
}

// FILTER BUTTONS
function setFilter(filter) {
  currentFilter = filter;
  [filterAll, filterActive, filterCompleted].forEach(btn => btn && btn.classList.remove('active'));
  if (filter === 'all' && filterAll) filterAll.classList.add('active');
  if (filter === 'active' && filterActive) filterActive.classList.add('active');
  if (filter === 'completed' && filterCompleted) filterCompleted.classList.add('active');
  loadTasks();
}

[filterAll, filterActive, filterCompleted].forEach(btn => {
  if (!btn) return;
  btn.addEventListener('click', () => setFilter(btn === filterAll ? 'all' : btn === filterActive ? 'active' : 'completed'));
});

// Clear completed tasks
if (clearCompleted) {
  clearCompleted.addEventListener('click', () => {
    const date = taskDate.value;
    let tasks = getTasks(date);
    tasks = tasks.filter(t => !t.completed);
    saveTasks(date, tasks);
    loadTasks();
  });
}

// Export tasks for selected date
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const date = taskDate.value;
    const tasks = getTasks(date);

    // Convert tasks to CSV (Excel-friendly)
    const rows = [];
    rows.push(['Start Time', 'Description', 'Category', 'Priority', 'Completed']);
    tasks.forEach(t => {
      rows.push([t.startTime || '', t.text || '', t.category || '', t.priority || '', t.completed ? 'Yes' : 'No']);
    });

    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

// THEME TOGGLE
if (themeToggle) {
  const enableDark = () => {
    document.body.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    themeToggle.innerText = '☀️';
    themeToggle.setAttribute('aria-pressed', 'true');
    if (themeToggleNav) {
      themeToggleNav.innerText = '☀️';
      themeToggleNav.setAttribute('aria-pressed', 'true');
    }
  };

  const disableDark = () => {
    document.body.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    themeToggle.innerText = '🌙';
    themeToggle.setAttribute('aria-pressed', 'false');
    if (themeToggleNav) {
      themeToggleNav.innerText = '🌙';
      themeToggleNav.setAttribute('aria-pressed', 'false');
    }
  };

  themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('dark')) disableDark();
    else enableDark();
  });

  // Allow nav toggle to work too
  if (themeToggleNav) {
    themeToggleNav.addEventListener('click', () => {
      if (document.body.classList.contains('dark')) disableDark();
      else enableDark();
    });
  }

  // initialize from storage
  const stored = localStorage.getItem('theme');
  if (stored === 'dark') enableDark();
  else disableDark();
}

// Load tasks
function loadTasks() {
  const date = taskDate.value;
  taskList.innerHTML = "";

  const tasks = getTasks(date);
  let completedCount = 0;

  tasks.forEach((task, index) => {
    if (task.completed) completedCount++;

    // apply filter: show/hide based on currentFilter
    if (currentFilter === 'active' && task.completed) return;
    if (currentFilter === 'completed' && !task.completed) return;


    const li = document.createElement("li");
    li.classList.add(`priority-${task.priority}`);

    const details = document.createElement("div");
    details.className = "task-details";
    details.innerHTML = `
      <span class="task-time">${task.startTime || "--:--"} • ${escapeHtml(task.text)}</span>
      <span class="task-category">${escapeHtml(task.category)} • Priority: ${escapeHtml(task.priority)}</span>
    `;
    if (task.completed) li.classList.add("completed");

    // checkbox for completion (accessible)
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!task.completed;
    checkbox.setAttribute('aria-label', `Mark ${task.text} as completed`);
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      task.completed = checkbox.checked;
      saveTasks(date, tasks);
      loadTasks();
    });

    li.addEventListener("click", (e) => {
      // Click on list item toggles completed (unless clicking a control)
      if (e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'input') return;
      task.completed = !task.completed;
      saveTasks(date, tasks);
      loadTasks();
    });

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn small-btn";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      tasks.splice(index, 1);
      saveTasks(date, tasks);
      loadTasks();
    });

    actions.appendChild(deleteBtn);
    li.appendChild(checkbox);
    li.appendChild(details);
    li.appendChild(actions);
    taskList.appendChild(li);

    // Schedule notification
    scheduleNotification(task, date);
  });

  // Update progress bar
  const percent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  progressFill.style.width = percent + "%";
  if (progressPerc) progressPerc.textContent = percent + "%";

  // update stats
  if (statTotal) statTotal.textContent = tasks.length;
  if (statDone) statDone.textContent = completedCount;
  if (statPending) statPending.textContent = tasks.length - completedCount;

  // Empty state visibility
  if (emptyState) {
    emptyState.style.display = tasks.length ? 'none' : 'block';
  }

}

// Helpers
function getTasks(date) {
  return JSON.parse(localStorage.getItem(date)) || [];
}

function saveTasks(date, tasks) {
  localStorage.setItem(date, JSON.stringify(tasks));
}

// Notification Scheduler
function scheduleNotification(task, date) {
  if (!task.startTime) return;

  const [hours, minutes] = task.startTime.split(":").map(Number);
  const taskTime = new Date(date);
  taskTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const delay = taskTime - now;

  if (delay > 0) {
    setTimeout(() => {
      if (Notification.permission === "granted" && !task.completed) {
        new Notification("⏰ Task Reminder", {
          body: `${task.startTime} - ${task.text} [${task.category}]`,
          icon: "https://cdn-icons-png.flaticon.com/512/565/565547.png"
        });
      }
    }, delay);
  }
}

// Load today’s tasks
loadTasks();

// Utility: escape HTML to avoid injection
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe.replace(/[&<>"]/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return m;
    }
  });
}
