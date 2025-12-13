// --- STATE MANAGEMENT ---
let state = {
    user: null,
    isPaused: false,
    timerInterval: null,
    totalSeconds: 0,
    remainingSeconds: 0,
    history: {} // Format: "YYYY-MM-DD": sessionCount
};

// --- DOM ELEMENTS ---
const dashboardView = document.getElementById('dashboard-view');
const timerView = document.getElementById('timer-view');
const authCard = document.getElementById('auth-card');
const authStatus = document.getElementById('auth-status');
const navUser = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('auth-btn');

// --- FIREBASE AUTH LOGIC ---

// 1. Monitor Auth State
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Logged In
        state.user = user;
        navUser.textContent = user.email.split('@')[0];
        logoutBtn.classList.remove('hidden');
        authCard.classList.add('hidden'); // Hide login form
        loadUserHistory(user.uid);
    } else {
        // Logged Out
        state.user = null;
        navUser.textContent = "Guest";
        logoutBtn.classList.add('hidden');
        authCard.classList.remove('hidden'); // Show login form
        state.history = {};
        renderStats();
    }
});

// 2. Email Login/Signup
document.getElementById('email-login-btn').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    
    authStatus.textContent = "Processing...";
    authStatus.style.color = "#fff";

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .catch((error) => {
            if (error.code === 'auth/user-not-found') {
                // Auto Signup if user doesn't exist
                return firebase.auth().createUserWithEmailAndPassword(email, pass);
            }
            throw error;
        })
        .then(() => { authStatus.textContent = ""; })
        .catch((error) => {
            authStatus.textContent = error.message;
            authStatus.style.color = "#ff00ff";
        });
});

// 3. Google Login
document.getElementById('google-login-btn').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(e => alert(e.message));
});

// 4. Logout
logoutBtn.addEventListener('click', () => firebase.auth().signOut());


// --- TIMER LOGIC ---

document.getElementById('start-btn').addEventListener('click', startSession);
document.getElementById('end-btn').addEventListener('click', endSession);
document.getElementById('pause-btn').addEventListener('click', togglePause);

function startSession() {
    if (!state.user) {
        alert("Please login first to track your progress!");
        return;
    }

    const h = parseInt(document.getElementById('hrs-input').value) || 0;
    const m = parseInt(document.getElementById('mins-input').value) || 0;
    const s = parseInt(document.getElementById('secs-input').value) || 0;

    state.totalSeconds = (h * 3600) + (m * 60) + s;
    if (state.totalSeconds <= 0) return alert("Please set a time!");

    state.remainingSeconds = state.totalSeconds;
    state.isPaused = false;

    // Switch Views
    dashboardView.classList.add('hidden');
    timerView.classList.remove('hidden');
    
    // Start Audio
    document.getElementById('soothing-audio').play().catch(e=>console.log(e));

    updateTimerDisplay();
    state.timerInterval = setInterval(tick, 1000);
}

function tick() {
    if (state.isPaused) return;

    if (state.remainingSeconds > 0) {
        state.remainingSeconds--;
        updateTimerDisplay();
        updateProgressBar();
    } else {
        finishSession();
    }
}

function updateTimerDisplay() {
    const h = Math.floor(state.remainingSeconds / 3600);
    const m = Math.floor((state.remainingSeconds % 3600) / 60);
    const s = state.remainingSeconds % 60;
    document.getElementById('countdown-display').textContent = 
        `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updateProgressBar() {
    const percent = (state.remainingSeconds / state.totalSeconds) * 100;
    document.getElementById('progress-bar').style.width = percent + "%";
}

function togglePause() {
    state.isPaused = !state.isPaused;
    document.getElementById('pause-btn').textContent = state.isPaused ? "RESUME" : "PAUSE";
    const audio = document.getElementById('soothing-audio');
    state.isPaused ? audio.pause() : audio.play();
}

function endSession() {
    if(!confirm("End session? Progress will be lost.")) return;
    resetTimer();
}

function finishSession() {
    alert("Session Complete! Great work.");
    saveSessionData(); // Save to DB
    resetTimer();
}

function resetTimer() {
    clearInterval(state.timerInterval);
    document.getElementById('soothing-audio').pause();
    document.getElementById('soothing-audio').currentTime = 0;
    timerView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
}


// --- DATA & HISTORY LOGIC ---

// Save completed session to LocalStorage (Mock DB)
function saveSessionData() {
    const today = new Date().toISOString().split('T')[0];
    if (!state.history[today]) state.history[today] = 0;
    state.history[today] += (state.totalSeconds / 3600); // Save hours
    
    // Persist to LocalStorage using UID
    localStorage.setItem(`history_${state.user.uid}`, JSON.stringify(state.history));
    renderStats();
}

function loadUserHistory(uid) {
    const data = localStorage.getItem(`history_${uid}`);
    state.history = data ? JSON.parse(data) : {};
    renderStats();
}

function renderStats() {
    // 1. Calculate Stats
    const today = new Date().toISOString().split('T')[0];
    const todayHours = state.history[today] || 0;
    const totalHours = Object.values(state.history).reduce((a, b) => a + b, 0);
    const streak = calculateStreak();

    // 2. Update DOM
    document.getElementById('streak-number').textContent = streak;
    document.getElementById('today-sessions').textContent = todayHours.toFixed(1) + "h";
    document.getElementById('total-hours').textContent = totalHours.toFixed(1);

    // 3. Render Calendar
    renderCalendar();
}

function calculateStreak() {
    let streak = 0;
    const dates = Object.keys(state.history).sort().reverse();
    // Simple mock streak logic for visual purposes
    return dates.length > 0 ? dates.length : 0; 
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = "";
    
    // Create last 14 days grid
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const div = document.createElement('div');
        div.className = 'cal-day';
        div.textContent = d.getDate();
        
        if (state.history[dateStr]) {
            div.classList.add('active');
        }
        grid.appendChild(div);
    }
}

// --- CLOCK ---
setInterval(() => {
    const now = new Date();
    document.getElementById('real-time-clock').textContent = now.toLocaleTimeString();
}, 1000);
