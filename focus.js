// --- JAVASCRIPT: CORE LOGIC & STATE ---

// The 'auth' and 'googleProvider' variables are assumed to be globally available 
// from the <script> block in index.html after Firebase initialization.

// --- DATA/DATABASE MOCK FUNCTIONS ---
// NOTE: These are MOCKED. They use localStorage to simulate database storage for 
// user focus stats. The actual Firebase integration is only for authentication.

async function loadUserData(uid) {
    console.log(`[Data Mock] Loading focus data for UID: ${uid}`);
    const dataKey = `focusData_${uid}`;
    const storedData = localStorage.getItem(dataKey); 
    
    if (storedData) {
        return JSON.parse(storedData);
    }
    // Default data structure
    return {
        currentStreak: 0,
        longestStreak: 0,
        totalHoursWeek: 0,
        sessionsToday: 0,
        lastSessionDate: new Date(0).toISOString(),
        lastWeeklyReset: new Date().toISOString(),
    };
}

async function saveUserData(uid, data) {
    console.log(`[Data Mock] Saving focus data for UID: ${uid}`, data);
    const dataKey = `focusData_${uid}`;
    localStorage.setItem(dataKey, JSON.stringify(data));
}


let state = {
    userUID: null,
    userName: 'Guest',
    isLoggedIn: false,
    goalSeconds: 0,
    remainingSeconds: 0,
    timerInterval: null,
    isPaused: false,
    data: null, 
};


const ELEMENTS = {
    // Nav/Auth
    authBtn: document.getElementById('auth-btn'),
    userDisplayName: document.getElementById('user-display-name'),
    loginModal: document.getElementById('login-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    modalEmailInput: document.getElementById('modal-email-input'),
    modalPasswordInput: document.getElementById('modal-password-input'),
    modalLoginBtn: document.getElementById('modal-login-btn'),
    googleLoginBtn: document.getElementById('google-login-btn'),
    modalAuthStatus: document.getElementById('modal-auth-status'),
    dashboardScreen: document.getElementById('dashboard-screen'),
    soothingAudio: document.getElementById('soothing-audio'),

    // Screens
    dashboardContainer: document.getElementById('dashboard-container'),
    timerContainer: document.getElementById('timer-container'),

    // Dashboard Elements (Data Display)
    inputHrs: document.getElementById('input-hrs'),
    inputMins: document.getElementById('input-mins'),
    inputSecs: document.getElementById('input-secs'),
    startSessionBtn: document.getElementById('start-session-btn'),
    currentStreakDisplay: document.getElementById('current-streak'),
    totalHoursWeekDisplay: document.getElementById('total-hours-week'),
    longestStreakDisplay: document.getElementById('longest-streak'),
    sessionsTodayDisplay: document.getElementById('sessions-today'),

    // Timer Elements
    countdownDisplay: document.getElementById('countdown-display'),
    pauseResumeBtn: document.getElementById('pause-resume-btn'),
    endSessionBtn: document.getElementById('end-session-btn'),
    progressRing: document.getElementById('progress-gradient-ring'), // Horizontal bar
};


// --- AUTHENTICATION HANDLERS ---

function updateAuthStateUI() {
    if (state.isLoggedIn) {
        ELEMENTS.authBtn.textContent = 'Logout';
        ELEMENTS.authBtn.classList.remove('btn-primary');
        ELEMENTS.authBtn.classList.add('btn-secondary');
        ELEMENTS.userDisplayName.textContent = state.userName; 
        ELEMENTS.dashboardScreen.classList.remove('logged-out');
        ELEMENTS.startSessionBtn.disabled = false;
    } else {
        ELEMENTS.authBtn.textContent = 'Login';
        ELEMENTS.authBtn.classList.remove('btn-secondary');
        ELEMENTS.authBtn.classList.add('btn-primary');
        ELEMENTS.userDisplayName.textContent = 'Guest'; 
        ELEMENTS.dashboardScreen.classList.add('logged-out');
        ELEMENTS.startSessionBtn.disabled = true;
        
        // Reset dashboard stats visually for non-logged-in user
        ELEMENTS.currentStreakDisplay.textContent = '—';
        ELEMENTS.longestStreakDisplay.textContent = '—';
        ELEMENTS.totalHoursWeekDisplay.textContent = '—';
        ELEMENTS.sessionsTodayDisplay.textContent = '—';
    }
}

function handleSuccessfulLogin(uid, name) {
    state.userUID = uid;
    state.userName = name || 'User';
    state.isLoggedIn = true;

    ELEMENTS.loginModal.classList.add('hidden');
    updateAuthStateUI();
    initializeDashboard(); 
}

async function handleManualLogin() {
    ELEMENTS.modalAuthStatus.style.color = 'var(--color-text-secondary)';
    ELEMENTS.modalAuthStatus.textContent = 'Logging in...';
    
    const email = ELEMENTS.modalEmailInput.value;
    const password = ELEMENTS.modalPasswordInput.value;

    try {
        // Attempt Sign-in
        let userCredential = await auth.signInWithEmailAndPassword(email, password);
        let user = userCredential.user;
        handleSuccessfulLogin(user.uid, user.displayName || user.email.split('@')[0]);

    } catch (error) {
        // If login fails, attempt to create a new user (Sign-up)
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            try {
                ELEMENTS.modalAuthStatus.textContent = 'User not found. Attempting to sign up...';
                let userCredential = await auth.createUserWithEmailAndPassword(email, password);
                let user = userCredential.user;
                handleSuccessfulLogin(user.uid, user.email.split('@')[0]);
                alert("Account created successfully!");
                
            } catch (signupError) {
                ELEMENTS.modalAuthStatus.style.color = 'var(--color-primary)';
                ELEMENTS.modalAuthStatus.textContent = `Error: ${signupError.message}`;
                console.error("Sign-up Error:", signupError);
            }
        } else {
            // Other errors (e.g., invalid email, weak password)
            ELEMENTS.modalAuthStatus.style.color = 'var(--color-primary)';
            ELEMENTS.modalAuthStatus.textContent = `Error: ${error.message}`;
            console.error("Login Error:", error);
        }
    }
}

async function handleGoogleLogin() {
    ELEMENTS.modalAuthStatus.style.color = 'var(--color-text-secondary)';
    ELEMENTS.modalAuthStatus.textContent = 'Signing in with Google...';

    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        handleSuccessfulLogin(user.uid, user.displayName || user.email.split('@')[0]);

    } catch (error) {
        ELEMENTS.modalAuthStatus.style.color = 'var(--color-primary)';
        if (error.code !== 'auth/popup-closed-by-user') {
            ELEMENTS.modalAuthStatus.textContent = `Google Sign-in Error: ${error.message}`;
            console.error("Google Sign-in Error:", error);
        } else {
            ELEMENTS.modalAuthStatus.textContent = '';
        }
    }
}

function handleLogout() {
    if (!confirm("Are you sure you want to log out?")) {
        return;
    }
    auth.signOut().then(() => {
        console.log("User signed out successfully.");
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}

function toggleAuthModal() {
    if (state.isLoggedIn) {
        handleLogout();
    } else {
        ELEMENTS.modalAuthStatus.textContent = '';
        ELEMENTS.modalEmailInput.value = '';
        ELEMENTS.modalPasswordInput.value = '';
        ELEMENTS.loginModal.classList.remove('hidden');
        ELEMENTS.modalEmailInput.focus();
    }
}


// --- DASHBOARD AND DATA LOGIC ---

function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Logic for Horizontal Progress Bar (using width percentage)
function updateProgressRing(percentage) {
    if (ELEMENTS.progressRing) {
        ELEMENTS.progressRing.style.width = percentage + '%'; 
    }
}

function checkAndResetStats() {
    const today = new Date();
    const lastSession = new Date(state.data.lastSessionDate); 
    const lastReset = new Date(state.data.lastWeeklyReset);
    const daysSinceReset = Math.floor((today - lastReset) / (1000 * 60 * 60 * 24));
    
    // Weekly reset
    if (daysSinceReset >= 7) {
         state.data.totalHoursWeek = 0;
         state.data.lastWeeklyReset = today.toISOString();
    }

    // Daily reset and streak check
    if (today.toDateString() !== lastSession.toDateString()) {
        state.data.sessionsToday = 0;
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (lastSession.toDateString() !== (new Date(yesterday.setHours(0,0,0,0))).toDateString()) {
            state.data.currentStreak = 0;
        }
    }
}

function updateDashboardUI() {
    if (!state.data) return;
    ELEMENTS.currentStreakDisplay.textContent = state.data.currentStreak;
    ELEMENTS.longestStreakDisplay.textContent = state.data.longestStreak;
    ELEMENTS.totalHoursWeekDisplay.textContent = state.data.totalHoursWeek.toFixed(1);
    ELEMENTS.sessionsTodayDisplay.textContent = state.data.sessionsToday;
}


async function initializeDashboard() {
    if (!state.isLoggedIn) {
        updateAuthStateUI();
        return;
    }
    // Load user data after successful login/state change
    state.data = await loadUserData(state.userUID);
    checkAndResetStats();
    updateDashboardUI();
    await saveUserData(state.userUID, state.data); 
}

// --- TIMER FUNCTIONS ---

function startAudio() {
    if (ELEMENTS.soothingAudio) {
        ELEMENTS.soothingAudio.muted = false;
        const playPromise = ELEMENTS.soothingAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Audio auto-play failed. User must interact to enable audio.", error);
            });
        }
    }
}

function stopAudio() {
    if (ELEMENTS.soothingAudio) {
        ELEMENTS.soothingAudio.pause();
        ELEMENTS.soothingAudio.currentTime = 0;
        ELEMENTS.soothingAudio.muted = true;
    }
}

function startTimer() {
    if (state.timerInterval) return; 
    startAudio();

    state.timerInterval = setInterval(() => {
        if (state.isPaused) return;
        if (state.remainingSeconds > 0) {
            state.remainingSeconds--;
            ELEMENTS.countdownDisplay.textContent = formatTime(state.remainingSeconds);
            const percentage = 100 - (state.remainingSeconds / state.goalSeconds) * 100;
            updateProgressRing(percentage);
        } else {
            clearInterval(state.timerInterval);
            sessionComplete();
        }
    }, 1000);
}

function togglePauseResume() {
    state.isPaused = !state.isPaused;
    ELEMENTS.pauseResumeBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
    ELEMENTS.countdownDisplay.classList.toggle('paused', state.isPaused);
    if (state.isPaused) {
        ELEMENTS.soothingAudio.pause();
    } else {
        ELEMENTS.soothingAudio.play();
    }
}

async function sessionComplete() {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    stopAudio();

    const focusedHours = state.goalSeconds / 3600;
    
    // Update streaks and hours on successful completion
    state.data.totalHoursWeek += focusedHours;
    state.data.sessionsToday += 1; // Assuming completion counts as a session
    
    const today = new Date();
    const lastSession = new Date(state.data.lastSessionDate);
    const oneDay = 1000 * 60 * 60 * 24;

    // Check if yesterday was the last session date (for streak continuation)
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (lastSession.toDateString() === yesterday.toDateString()) {
        state.data.currentStreak += 1;
    } else if (lastSession.toDateString() !== today.toDateString()) {
        // If session was not today, and not yesterday, start streak at 1
        state.data.currentStreak = 1; 
    }
    
    // Update longest streak
    if (state.data.currentStreak > state.data.longestStreak) {
        state.data.longestStreak = state.data.currentStreak;
    }

    state.data.lastSessionDate = today.toISOString();

    await saveUserData(state.userUID, state.data);
    
    alert(`🎉 Goal Completed! You focused for ${focusedHours.toFixed(2)} hours.`);
    
    showDashboard();
}

function endSession() {
    if (!confirm("Are you sure you want to end the session? Progress will be lost.")) {
        return;
    }
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.isPaused = false;
    stopAudio();
    showDashboard();
}

// --- SCREEN TRANSITION FUNCTIONS ---

function showDashboard() {
    initializeDashboard().then(() => {
        ELEMENTS.timerContainer.classList.add('hidden');
        // Small delay for transition effect
        setTimeout(() => {
            ELEMENTS.dashboardContainer.classList.remove('hidden');
            ELEMENTS.dashboardContainer.style.zIndex = '10';
            ELEMENTS.timerContainer.style.zIndex = '1';
        }, 300); 
    });
}

function showTimer() {
    if (!state.isLoggedIn) {
        alert("Please log in to start a focus session.");
        return;
    }
    
    const hrs = parseInt(ELEMENTS.inputHrs.value) || 0;
    const mins = parseInt(ELEMENTS.inputMins.value) || 0;
    const secs = parseInt(ELEMENTS.inputSecs.value) || 0;
    
    const totalSeconds = (hrs * 3600) + (mins * 60) + secs;

    if (totalSeconds <= 0) {
        alert("Please enter a focus goal greater than zero.");
        return;
    }

    state.goalSeconds = totalSeconds;
    state.remainingSeconds = totalSeconds;
    state.isPaused = false;

    ELEMENTS.countdownDisplay.textContent = formatTime(state.remainingSeconds);
    ELEMENTS.pauseResumeBtn.textContent = 'Pause';
    ELEMENTS.countdownDisplay.classList.remove('paused');
    updateProgressRing(0); // Reset the horizontal bar at 0%

    ELEMENTS.dashboardContainer.classList.add('hidden');
    setTimeout(() => {
        ELEMENTS.timerContainer.classList.remove('hidden');
        ELEMENTS.timerContainer.style.zIndex = '10';
        ELEMENTS.dashboardContainer.style.zIndex = '1';
        startTimer();
    }, 300); 
}

// --- EVENT LISTENERS & INITIALIZATION ---

ELEMENTS.authBtn.addEventListener('click', toggleAuthModal);
ELEMENTS.closeModalBtn.addEventListener('click', () => ELEMENTS.loginModal.classList.add('hidden'));
ELEMENTS.modalLoginBtn.addEventListener('click', handleManualLogin);
ELEMENTS.googleLoginBtn.addEventListener('click', handleGoogleLogin);
ELEMENTS.startSessionBtn.addEventListener('click', showTimer);
ELEMENTS.pauseResumeBtn.addEventListener('click', togglePauseResume);
ELEMENTS.endSessionBtn.addEventListener('click', endSession);

// Listen for Firebase Auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in.
        const displayName = user.displayName || user.email.split('@')[0];
        
        state.userUID = user.uid;
        state.userName = displayName;
        state.isLoggedIn = true;
        
    } else {
        // User is signed out.
        state.userUID = null;
        state.userName = 'Guest';
        state.isLoggedIn = false;
        state.data = null;
    }
    
    // Always call showDashboard after the state is determined to load data and update UI
    showDashboard(); 
});