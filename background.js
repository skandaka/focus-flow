const OPENAI_API_KEY = 'key here'; // replace with your actual API key

let timerState = {
    isRunning: false,
    isPaused: false,
    timeLeft: 25 * 60,
    phase: 'work',
    totalSeconds: 25 * 60
};

let currentTasks = [];
let siteCache = {};
let stats = {
    todayCount: 0,
    streak: 0,
    totalMinutes: 0,
    blockedToday: 0,
    lastDate: new Date().toDateString()
};

let timerInterval = null;

chrome.runtime.onInstalled.addListener(async () => {
    await loadState();
    console.log('FocusFlow AI initialized');
});

async function loadState() {
    const result = await chrome.storage.local.get(['timerState', 'currentTasks', 'stats']);
    if (result.timerState) timerState = result.timerState;
    if (result.currentTasks) currentTasks = result.currentTasks;
    if (result.stats) stats = result.stats;

    const today = new Date().toDateString();
    if (stats.lastDate !== today) {
        stats.blockedToday = 0;
        stats.lastDate = today;
    }
}

async function saveState() {
    await chrome.storage.local.set({
        timerState,
        currentTasks,
        stats
    });
}

chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);

async function handleTabUpdate(tabId, changeInfo, tab) {
    if (!tab.url || !changeInfo.url) return;
    await checkSite(tabId, tab.url);
}

async function handleNavigation(details) {
    if (details.frameId !== 0) return;
    await checkSite(details.tabId, details.url);
}

async function checkSite(tabId, url) {
    if (!timerState.isRunning || timerState.isPaused || timerState.phase !== 'work') {
        return;
    }

    if (currentTasks.length === 0) {
        return;
    }

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '').toLowerCase();

        const alwaysAllowedDomains = [
            'chrome.google.com',
            'newtab',
            'chrome://',
            'chrome-extension://',
            'about:blank',
            'about:newtab',
            'localhost',
            '127.0.0.1',
            'google.com/search',
            'google.ca/search',
            'google.co.uk/search',
            'bing.com/search',
            'duckduckgo.com',
            'search.yahoo.com'
        ];

        for (const allowed of alwaysAllowedDomains) {
            if (url.includes(allowed) || hostname === allowed || hostname === '') {
                return;
            }
        }

        const cacheKey = `${hostname}_${currentTasks.join('_')}`;
        if (siteCache[cacheKey] !== undefined) {
            if (!siteCache[cacheKey]) {
                await blockSite(tabId, hostname, url);
            }
            return;
        }

        const isProductive = await evaluateSiteWithAI(hostname, url);
        siteCache[cacheKey] = isProductive;

        if (!isProductive) {
            await blockSite(tabId, hostname, url);
        }
    } catch (e) {
        console.error('Error checking site:', e);
    }
}

async function evaluateSiteWithAI(hostname, url) {
    const productiveDomains = [
        'wikipedia.org', 'wikimedia.org', 'wikibooks.org', 'wikiversity.org',
        'khanacademy.org', 'coursera.org', 'edx.org', 'udemy.com', 'udacity.com',
        'mit.edu', 'stanford.edu', 'harvard.edu', '.edu',
        'github.com', 'gitlab.com', 'stackoverflow.com', 'developer.mozilla.org',
        'npmjs.com', 'pypi.org', 'rubygems.org',
        'docs.google.com', 'drive.google.com', 'sheets.google.com', 'slides.google.com',
        'notion.so', 'evernote.com', 'onenote.com', 'dropbox.com',
        'trello.com', 'asana.com', 'monday.com', 'todoist.com',
        'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 'jstor.org', 'arxiv.org',
        'researchgate.net', 'academia.edu',
        'quizlet.com', 'anki.com', 'ankiweb.net', 'memrise.com',
        'slack.com', 'teams.microsoft.com', 'zoom.us'
    ];

    const isKnownProductive = productiveDomains.some(domain => hostname.includes(domain));

    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_API_KEY_HERE' || OPENAI_API_KEY.includes('YOUR_API_KEY')) {
        return isKnownProductive;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'You are a productivity assistant. Determine if a website is productive for the given tasks. Educational sites like Wikipedia, Khan Academy, and university sites should generally be allowed for studying. Respond with only "YES" if the site would help with the tasks, or "NO" if it would be a distraction.'
                }, {
                    role: 'user',
                    content: `Current tasks: ${currentTasks.join(', ')}\nWebsite: ${hostname}\nIs this website productive for these tasks?`
                }],
                temperature: 0.3,
                max_tokens: 10
            })
        });

        if (!response.ok) {
            console.error('OpenAI API error:', response.status, response.statusText);
            return isKnownProductive;
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Invalid OpenAI response:', data);
            return isKnownProductive;
        }

        const answer = data.choices[0].message.content.toUpperCase().trim();
        return answer === 'YES' || answer.includes('YES');

    } catch (error) {
        console.error('AI evaluation error:', error);
        return isKnownProductive;
    }
}

async function getAIRedirectSuggestion(blockedSite) {
    const defaultSuggestions = {
        'study': 'https://www.khanacademy.org',
        'research': 'https://scholar.google.com',
        'write': 'https://docs.google.com',
        'code': 'https://github.com',
        'learn': 'https://www.coursera.org',
        'math': 'https://www.wolframalpha.com',
        'read': 'https://www.gutenberg.org',
        'flashcard': 'https://quizlet.com',
        'note': 'https://docs.google.com',
        'data': 'https://sheets.google.com'
    };

    let defaultUrl = 'https://google.com';
    for (const [keyword, url] of Object.entries(defaultSuggestions)) {
        if (currentTasks.some(task => task.toLowerCase().includes(keyword))) {
            defaultUrl = url;
            break;
        }
    }

    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_API_KEY_HERE' || OPENAI_API_KEY.includes('YOUR_API_KEY') || currentTasks.length === 0) {
        return defaultUrl;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'You are a productivity assistant. Suggest ONE specific website URL that would be most helpful for the given tasks. Respond with only the URL, nothing else.'
                }, {
                    role: 'user',
                    content: `User was trying to visit ${blockedSite} but needs to focus on: ${currentTasks.join(', ')}\nSuggest the most relevant productive website URL:`
                }],
                temperature: 0.5,
                max_tokens: 50
            })
        });

        if (!response.ok) {
            console.error('OpenAI API error for suggestions:', response.status);
            return defaultUrl;
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Invalid OpenAI response for suggestions:', data);
            return defaultUrl;
        }

        const suggestion = data.choices[0].message.content.trim();

        try {
            new URL(suggestion.startsWith('http') ? suggestion : 'https://' + suggestion);
            return suggestion.startsWith('http') ? suggestion : 'https://' + suggestion;
        } catch {
            return defaultUrl;
        }

    } catch (error) {
        console.error('AI redirect error:', error);
        return defaultUrl;
    }
}

async function blockSite(tabId, hostname, originalUrl) {
    stats.blockedToday++;
    await saveState();

    const redirectUrl = await getAIRedirectSuggestion(hostname);

    const blockPageUrl = chrome.runtime.getURL('blocked.html') +
        '?site=' + encodeURIComponent(hostname) +
        '&url=' + encodeURIComponent(originalUrl) +
        '&redirect=' + encodeURIComponent(redirectUrl) +
        '&tasks=' + encodeURIComponent(currentTasks.join('|'));

    try {
        await chrome.tabs.update(tabId, { url: blockPageUrl });
    } catch (e) {
        console.error('Error blocking tab:', e);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case 'startTimer':
            startTimer();
            sendResponse({ success: true });
            break;
        case 'pauseTimer':
            pauseTimer();
            sendResponse({ success: true });
            break;
        case 'resumeTimer':
            resumeTimer();
            sendResponse({ success: true });
            break;
        case 'resetTimer':
            resetTimer();
            sendResponse({ success: true });
            break;
        case 'getState':
            sendResponse({
                timerState,
                currentTasks,
                stats,
                hasApiKey: OPENAI_API_KEY && OPENAI_API_KEY !== 'YOUR_API_KEY_HERE' && !OPENAI_API_KEY.includes('YOUR_API_KEY')
            });
            break;
        case 'updateTasks':
            currentTasks = request.tasks;
            siteCache = {};
            saveState();
            sendResponse({ success: true });
            break;
        case 'checkSite':
            // Response for content script
            if (timerState.isRunning && !timerState.isPaused && timerState.phase === 'work') {
                checkSite(sender.tab.id, request.url);
            }
            sendResponse({ shouldBlock: false });
            break;
    }
    return true;
});

function startTimer() {
    timerState.isRunning = true;
    timerState.isPaused = false;

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (!timerState.isPaused && timerState.isRunning) {
            timerState.timeLeft--;

            if (timerState.timeLeft <= 0) {
                handlePhaseComplete();
            }

            saveState();
        }
    }, 1000);

    saveState();
}

function pauseTimer() {
    timerState.isPaused = true;
    saveState();
}

function resumeTimer() {
    timerState.isPaused = false;
    saveState();
}

function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    timerState = {
        isRunning: false,
        isPaused: false,
        timeLeft: 25 * 60,
        phase: 'work',
        totalSeconds: 25 * 60
    };

    siteCache = {};
    saveState();
}

function handlePhaseComplete() {
    if (timerState.phase === 'work') {
        timerState.phase = 'break';
        timerState.timeLeft = 5 * 60;
        timerState.totalSeconds = 5 * 60;

        stats.todayCount++;
        stats.totalMinutes += 25;
        saveState();

        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: '🎉 Great work!',
            message: 'Time for a 5-minute break. You earned it!',
            priority: 2
        });
    } else {
        timerState.phase = 'work';
        timerState.timeLeft = 25 * 60;
        timerState.totalSeconds = 25 * 60;

        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: '💪 Break over!',
            message: 'Ready to tackle your tasks? Let\'s go!',
            priority: 2
        });
    }

    saveState();
}