document.addEventListener('DOMContentLoaded', function () {
  const taskInput = document.getElementById('taskInput');
  const taskList = document.getElementById('taskList');
  const addBtn = document.getElementById('addBtn');
  const clearCompletedBtn = document.getElementById('clearCompleted');
  const taskCount = document.getElementById('taskCount');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const notificationArea = document.getElementById('notificationArea');
  const fileEl = document.getElementById('fileInput');

  let currentFilter = 'all';

  loadTasks();

  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') addTask();
  });

  filterButtons.forEach(button => {
    button.addEventListener('click', function () {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      filterTasks();
    });
  });

  clearCompletedBtn.addEventListener('click', clearCompletedTasks);

  function addTask() {
    const taskText = taskInput.value.trim();
    const dueDate = document.getElementById('dueDateInput').value;
    const reminderTime = document.getElementById('reminderTimeInput').value;
    const tag = document.getElementById('tagSelect').value || null;
    const password = document.getElementById('lockPassword').value.trim() || null;
    const file = fileEl.files[0] || null;

    if (!taskText) return showNotification('Please enter a task', 'warning');
    if (reminderTime && !dueDate) return showNotification('Please set a date for the reminder', 'warning');

    createTask(taskText, false, dueDate, reminderTime, true, tag, file, false, password);
    saveTasks();
    filterTasks();

    taskInput.value = '';
    document.getElementById('dueDateInput').value = '';
    document.getElementById('reminderTimeInput').value = '';
    document.getElementById('tagSelect').value = '';
    document.getElementById('lockPassword').value = '';
    fileEl.value = '';
    taskInput.focus();

    showNotification('Task added successfully!', 'success');
  }

  function createTask(text, completed = false, dueDate = null, reminderTime = null, isNew = true, tag = null, file = null, pinned = false, password = null) {
    const li = document.createElement('li');
    if (completed) li.classList.add('completed');
    if (pinned) li.classList.add('pinned');

    const taskContainer = document.createElement('div');
    taskContainer.className = 'task-content';

    const taskTextSpan = document.createElement('span');
    taskTextSpan.className = 'task-text';

    const taskMetaDiv = document.createElement('div');
    taskMetaDiv.className = 'task-meta';

    // 🔐 LOCKED TASK
    if (password) {
      li.classList.add('locked-task');
      li.dataset.password = password;
      li.dataset.locked = 'true';
      taskTextSpan.innerHTML = `<i class="fas fa-lock lock-icon"></i> Locked Task`;

      taskTextSpan.addEventListener('click', () => {
        const entered = prompt('This task is locked. Enter password:');
        if (entered === password) {
          li.classList.remove('locked-task');
          taskTextSpan.textContent = text;
          li.dataset.locked = '';
          addCompletionToggle(taskTextSpan, li);
          saveTasks();
        } else {
          showNotification('Incorrect password', 'danger');
        }
      });
    } else {
      taskTextSpan.textContent = text;
      addCompletionToggle(taskTextSpan, li);
    }

    // 📎 File preview
    if (file) {
      const fileURL = file.url || URL.createObjectURL(file);
      const isImage = file.name.match(/\.(jpeg|jpg|png|gif)$/i);
      const fileContainer = document.createElement('div');
      fileContainer.className = 'file-preview';

      if (isImage) {
        const img = document.createElement('img');
        img.src = fileURL;
        img.alt = file.name;
        img.className = 'attachment-image';
        fileContainer.appendChild(img);
      } else {
        const link = document.createElement('a');
        link.href = fileURL;
        link.textContent = file.name;
        link.target = '_blank';
        link.className = 'task-file';
        fileContainer.appendChild(link);
      }

      taskMetaDiv.appendChild(fileContainer);
      li.dataset.fileName = file.name;
      li.dataset.fileURL = fileURL;
    }

    // 📅 Due date
    if (dueDate) {
      const dueDateSpan = document.createElement('span');
      dueDateSpan.className = 'task-due-date';
      dueDateSpan.dataset.date = dueDate;
      dueDateSpan.innerHTML = `<i class="far fa-calendar-alt"></i> ${formatDueDate(dueDate)}`;
      if (isDueSoon(dueDate)) dueDateSpan.classList.add('coming-soon');
      if (isOverdue(dueDate)) dueDateSpan.classList.add('urgent');
      taskMetaDiv.appendChild(dueDateSpan);
    }

    // 🔔 Reminder time
    if (reminderTime) {
      const reminderSpan = document.createElement('span');
      reminderSpan.className = 'task-reminder';
      reminderSpan.innerHTML = `<i class="far fa-bell"></i> ${formatTime(reminderTime)}`;
      taskMetaDiv.appendChild(reminderSpan);
      li.dataset.reminderTime = reminderTime;
      scheduleReminder(text, dueDate, reminderTime);
    }

    // 🏷️ Tag
    if (tag) {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'task-tag';
      tagSpan.textContent = tag;
      taskMetaDiv.appendChild(tagSpan);
    }

    // 🛠️ Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.setAttribute('aria-label', 'Edit task');

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.setAttribute('aria-label', 'Delete task');

    const pinBtn = document.createElement('button');
    pinBtn.className = 'pin-btn';
    pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
    pinBtn.setAttribute('aria-label', 'Pin task');

    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      li.classList.toggle('pinned');
      saveTasks();
      reorderTasks();
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editTask(li, taskTextSpan);
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      li.classList.add('fade-out');
      setTimeout(() => {
        li.remove();
        saveTasks();
        updateTaskCount();
        showNotification('Task deleted', 'info');
      }, 300);
    });

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    actionsDiv.appendChild(pinBtn);

    taskContainer.appendChild(taskTextSpan);
    if (taskMetaDiv.hasChildNodes()) taskContainer.appendChild(taskMetaDiv);

    li.appendChild(taskContainer);
    li.appendChild(actionsDiv);

    if (isNew) {
      li.style.opacity = '0';
      taskList.appendChild(li);
      setTimeout(() => li.style.opacity = '1', 10);
    } else {
      taskList.appendChild(li);
    }

    updateTaskCount();
  }

  function addCompletionToggle(textSpan, li) {
    textSpan.addEventListener('click', () => {
      li.classList.toggle('completed');
      saveTasks();
      updateTaskCount();
    });
  }

  function saveTasks() {
    const tasks = [];
    document.querySelectorAll('#taskList li').forEach(li => {
      const task = {
        text: li.querySelector('.task-text').textContent.trim(),
        completed: li.classList.contains('completed'),
        pinned: li.classList.contains('pinned')
      };

      const dueDateEl = li.querySelector('.task-due-date');
      if (dueDateEl) task.dueDate = dueDateEl.dataset.date;
      if (li.dataset.reminderTime) task.reminderTime = li.dataset.reminderTime;
      if (li.querySelector('.task-tag')) task.tag = li.querySelector('.task-tag').textContent;
      if (li.dataset.fileName && li.dataset.fileURL) {
        task.fileName = li.dataset.fileName;
        task.fileURL = li.dataset.fileURL;
      }
      if (li.dataset.password) task.password = li.dataset.password;

      tasks.push(task);
    });

    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function loadTasks() {
    const savedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
    taskList.innerHTML = '';
    savedTasks.forEach(task => {
      const file = task.fileURL ? { name: task.fileName, url: task.fileURL } : null;
      createTask(task.text, task.completed, task.dueDate, task.reminderTime, false, task.tag, file, task.pinned, task.password);
    });
    filterTasks();
  }

  function filterTasks() {
    const tasks = document.querySelectorAll('#taskList li');
    tasks.forEach(task => {
      switch (currentFilter) {
        case 'active':
          task.style.display = task.classList.contains('completed') ? 'none' : 'flex';
          break;
        case 'completed':
          task.style.display = task.classList.contains('completed') ? 'flex' : 'none';
          break;
        default:
          task.style.display = 'flex';
      }
    });
    updateTaskCount();
  }

  function updateTaskCount() {
    const total = document.querySelectorAll('#taskList li').length;
    const completed = document.querySelectorAll('#taskList li.completed').length;
    const active = total - completed;
    taskCount.textContent = `${active} ${active === 1 ? 'task' : 'tasks'} remaining`;
    taskCount.setAttribute('aria-label', `${active} tasks remaining out of ${total}`);
  }

  function clearCompletedTasks() {
    const completedTasks = document.querySelectorAll('#taskList li.completed');
    if (!completedTasks.length) return showNotification('No completed tasks to clear', 'info');

    if (confirm('Are you sure you want to clear all completed tasks?')) {
      completedTasks.forEach(task => {
        task.classList.add('fade-out');
        setTimeout(() => task.remove(), 300);
      });
      setTimeout(() => {
        saveTasks();
        updateTaskCount();
        showNotification('Completed tasks cleared', 'success');
      }, 350);
    }
  }

  function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(timeStr) {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  }

  function isDueSoon(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff <= 3 && diff >= 0;
  }

  function isOverdue(dueDate) {
    return new Date(dueDate) < new Date() && !isNaN(new Date(dueDate));
  }

  function scheduleReminder(taskText, dueDate, reminderTime) {
    if (!dueDate || !reminderTime) return;
    const now = new Date();
    const reminderTimeObj = new Date(`${dueDate}T${reminderTime}`);
    const delay = reminderTimeObj - now;
    if (delay > 0) {
      setTimeout(() => {
        showNotification(`Reminder: ${taskText}`, 'reminder');
      }, delay);
    }
  }

  function showNotification(msg, type = 'info') {
    const oldNotes = document.querySelectorAll('.notification');
    oldNotes.forEach(note => {
      note.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => note.remove(), 300);
    });

    const note = document.createElement('div');
    note.className = `notification notification-${type}`;
    const icons = {
      success: 'check-circle',
      warning: 'exclamation-circle',
      danger: 'times-circle',
      reminder: 'bell',
      info: 'info-circle'
    };
    note.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i><span>${msg}</span>`;
    notificationArea.appendChild(note);

    setTimeout(() => {
      note.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => note.remove(), 300);
    }, 5000);
  }
});

function reorderTasks() {
  const taskList = document.getElementById('taskList');
  const tasks = Array.from(taskList.children);
  const pinned = tasks.filter(t => t.classList.contains('pinned'));
  const unpinned = tasks.filter(t => !t.classList.contains('pinned'));
  taskList.innerHTML = '';
  [...pinned, ...unpinned].forEach(task => taskList.appendChild(task));
}
