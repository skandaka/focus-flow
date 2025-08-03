const urlParams = new URLSearchParams(window.location.search);
const blockedSite = urlParams.get('site') || 'this site';
const redirectUrl = urlParams.get('redirect') || 'https://google.com';
const tasks = urlParams.get('tasks') ? urlParams.get('tasks').split('|') : [];

document.getElementById('blockedSite').textContent = blockedSite;

const tasksList = document.getElementById('tasksList');
if (tasks.length > 0 && tasks[0] !== '') {
    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.textContent = task;
        tasksList.appendChild(div);
    });
} else {
    document.getElementById('currentTasks').style.display = 'none';
}

if (redirectUrl && redirectUrl !== 'https://google.com') {
    document.getElementById('aiSuggestion').style.display = 'block';
    try {
        const url = new URL(redirectUrl);
        document.getElementById('suggestionText').textContent =
            `Based on your tasks, ${url.hostname} might be more helpful:`;
    } catch (e) {
        document.getElementById('aiSuggestion').style.display = 'none';
    }
}

function updateTimer() {
    try {
        chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                document.getElementById('timer').textContent = '--:--';
                return;
            }

            if (response && response.timerState && typeof response.timerState.timeLeft === 'number') {
                const minutes = Math.floor(response.timerState.timeLeft / 60);
                const seconds = response.timerState.timeLeft % 60;
                document.getElementById('timer').textContent =
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                document.getElementById('timer').textContent = '--:--';
            }
        });
    } catch (error) {
        console.error('Error updating timer:', error);
        document.getElementById('timer').textContent = '--:--';
    }
}

updateTimer();
const timerInterval = setInterval(updateTimer, 1000);

function goBack() {
    window.history.back();
}

function visitSuggested() {
    try {
        new URL(redirectUrl);
        window.location.href = redirectUrl;
    } catch (e) {
        console.error('Invalid redirect URL:', redirectUrl);
        window.location.href = 'https://google.com';
    }
}

document.getElementById('goBackBtn').addEventListener('click', goBack);
document.getElementById('suggestedBtn').addEventListener('click', visitSuggested);

window.addEventListener('beforeunload', () => {
    clearInterval(timerInterval);
});