let timerState = {};
let currentTasks = [];
let stats = {};
let hasApiKey = false;

const timerDisplay = document.getElementById('timer');
const phaseDisplay = document.getElementById('phase');
const progressCircle = document.getElementById('progressCircle');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const taskListDisplay = document.getElementById('taskListDisplay');

const todayCountElement = document.getElementById('todayCount');
const blockedCountElement = document.getElementById('blockedCount');
const totalTimeElement = document.getElementById('totalTime');
const streakCountElement = document.getElementById('streakCount');

document.addEventListener('DOMContentLoaded', async () => {
    await loadState();
    updateUI();
    setupEventListeners();

    setInterval(updateTimer, 100);
});

async function loadState() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'getState' });

        if (response) {
            timerState = response.timerState || {
                isRunning: false,
                isPaused: false,
                timeLeft: 25 * 60,
                phase: 'work',
                totalSeconds: 25 * 60
            };
            currentTasks = response.currentTasks || [];
            stats = response.stats || {
                todayCount: 0,
                streak: 0,
                totalMinutes: 0,
                blockedToday: 0
            };
            hasApiKey = response.hasApiKey || false;

            const aiIndicator = document.getElementById('aiIndicator');
            const aiText = document.querySelector('.ai-text');
            if (hasApiKey) {
                aiIndicator.classList.remove('inactive');
                aiText.textContent = 'AI Active';
            } else {
                aiIndicator.classList.add('inactive');
                aiText.textContent = 'No API Key';
            }

            updateStats();

            updateTasksDisplay();
        }
    } catch (error) {
        console.error('Error loading state:', error);
    }
}

function setupEventListeners() {
    startBtn.addEventListener('click', handleStart);
    pauseBtn.addEventListener('click', handlePause);
    resetBtn.addEventListener('click', handleReset);

    document.getElementById('editTasksBtn').addEventListener('click', showTasksView);
    document.getElementById('navToTasksBtn').addEventListener('click', showTasksView);
    document.getElementById('navToStatsBtn').addEventListener('click', showStatsView);
    document.getElementById('tasksBackBtn').addEventListener('click', showTimerView);
    document.getElementById('statsBackBtn').addEventListener('click', showTimerView);

    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    document.getElementById('newTaskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function updateUI() {
    if (timerState.isRunning && !timerState.isPaused) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'flex';
    } else {
        startBtn.style.display = 'flex';
        pauseBtn.style.display = 'none';
    }

    updateTimerDisplay();
    updatePhaseDisplay();
    updateProgress();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerState.timeLeft / 60);
    const seconds = timerState.timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updatePhaseDisplay() {
    if (!timerState.isRunning) {
        phaseDisplay.textContent = 'Ready to Focus';
        phaseDisplay.className = 'phase-text';
    } else if (timerState.phase === 'work') {
        phaseDisplay.textContent = 'Focus Time';
        phaseDisplay.className = 'phase-text work';
    } else {
        phaseDisplay.textContent = 'Break Time';
        phaseDisplay.className = 'phase-text break';
    }
}

function updateProgress() {
    const circumference = 2 * Math.PI * 90;
    let progress = 0;

    if (timerState.isRunning || timerState.timeLeft < timerState.totalSeconds) {
        progress = 1 - (timerState.timeLeft / timerState.totalSeconds);
    }

    const offset = circumference - (progress * circumference);
    progressCircle.style.strokeDashoffset = offset;
}

async function updateTimer() {
    if (timerState.isRunning) {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'getState' });
            if (response && response.timerState) {
                timerState = response.timerState;
                updateUI();
            }
        } catch (error) {
            console.error('Error updating timer:', error);
        }
    }
}

function updateStats() {
    todayCountElement.textContent = stats.todayCount || 0;
    blockedCountElement.textContent = stats.blockedToday || 0;

    const hours = Math.floor((stats.totalMinutes || 0) / 60);
    const mins = (stats.totalMinutes || 0) % 60;
    if (hours > 0) {
        totalTimeElement.textContent = `${hours}h ${mins}m`;
    } else {
        totalTimeElement.textContent = `${mins}m`;
    }

    streakCountElement.textContent = stats.streak || 0;

    const motivationElement = document.getElementById('motivationText');
    if (stats.todayCount >= 8) {
        motivationElement.textContent = "🔥 You're on fire! Incredible focus today!";
    } else if (stats.todayCount >= 4) {
        motivationElement.textContent = "💪 Great progress! Keep up the momentum!";
    } else if (stats.todayCount >= 1) {
        motivationElement.textContent = "🌟 Good start! Every session counts!";
    } else {
        motivationElement.textContent = "🚀 Ready to start? Your future self will thank you!";
    }
}

function updateTasksDisplay() {
    taskListDisplay.innerHTML = '';
    if (currentTasks.length === 0) {
        taskListDisplay.innerHTML = '<div class="empty-tasks">No tasks set. Add tasks to enable smart blocking.</div>';
    } else {
        currentTasks.forEach(task => {
            const div = document.createElement('div');
            div.className = 'task-item-display';
            div.textContent = task;
            taskListDisplay.appendChild(div);
        });
    }

    renderTasksList();
}

async function handleStart() {
    if (currentTasks.length === 0) {
        if (confirm('No tasks set! AI blocking won\'t work without tasks. Start anyway?')) {
            await chrome.runtime.sendMessage({ type: 'startTimer' });
            await loadState();
        } else {
            showTasksView();
        }
    } else {
        await chrome.runtime.sendMessage({ type: 'startTimer' });
        await loadState();
    }
}

async function handlePause() {
    if (timerState.isPaused) {
        await chrome.runtime.sendMessage({ type: 'resumeTimer' });
    } else {
        await chrome.runtime.sendMessage({ type: 'pauseTimer' });
    }
    await loadState();
}

async function handleReset() {
    if (confirm('Reset the timer?')) {
        await chrome.runtime.sendMessage({ type: 'resetTimer' });
        await loadState();
    }
}

// view nav
function showTimerView() {
    document.getElementById('timerView').style.display = 'flex';
    document.getElementById('tasksView').style.display = 'none';
    document.getElementById('statsView').style.display = 'none';
}

function showTasksView() {
    document.getElementById('timerView').style.display = 'none';
    document.getElementById('tasksView').style.display = 'flex';
    document.getElementById('statsView').style.display = 'none';
    document.getElementById('newTaskInput').focus();
}

function showStatsView() {
    document.getElementById('timerView').style.display = 'none';
    document.getElementById('tasksView').style.display = 'none';
    document.getElementById('statsView').style.display = 'flex';
}

async function addTask() {
    const input = document.getElementById('newTaskInput');
    const task = input.value.trim();

    if (task && !currentTasks.includes(task)) {
        currentTasks.push(task);
        input.value = '';

        await chrome.runtime.sendMessage({
            type: 'updateTasks',
            tasks: currentTasks
        });

        updateTasksDisplay();

        // Animate the new task
        const tasksList = document.getElementById('tasksList');
        const newTaskElement = tasksList.lastElementChild;
        if (newTaskElement) {
            newTaskElement.style.animation = 'slideIn 0.3s ease-out';
        }
    }
}

async function removeTask(index) {
    currentTasks.splice(index, 1);

    await chrome.runtime.sendMessage({
        type: 'updateTasks',
        tasks: currentTasks
    });

    updateTasksDisplay();
}

function renderTasksList() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '';

    if (currentTasks.length === 0) {
        tasksList.innerHTML = '<div class="empty-tasks">No tasks yet. Add your first task above!</div>';
        return;
    }

    currentTasks.forEach((task, index) => {
        const div = document.createElement('div');
        div.className = 'task-item';

        const textSpan = document.createElement('span');
        textSpan.className = 'task-text';
        textSpan.textContent = task;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-task-btn';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => removeTask(index));

        div.appendChild(textSpan);
        div.appendChild(removeBtn);
        tasksList.appendChild(div);
    });
}

function handleKeyboardShortcuts(e) {
    if (e.target.tagName === 'INPUT') return;

    if (e.key === ' ') {
        e.preventDefault();
        if (timerState.isRunning) {
            pauseBtn.click();
        } else {
            startBtn.click();
        }
    }

    // 'r' to reset (with cmd/ctrl)
    if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        resetBtn.click();
    }

    // 't' for tasks
    if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        showTasksView();
    }

    // 's' for stats
    if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        showStatsView();
    }

    // esc to go back to timer
    if (e.key === 'Escape') {
        e.preventDefault();
        showTimerView();
    }
}