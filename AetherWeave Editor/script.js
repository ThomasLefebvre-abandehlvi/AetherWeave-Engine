// ==========================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAt1zpo19sS0Fm8wMrBcGJwbHpHMIhFag0",
    authDomain: "aetherweave-edtor.firebaseapp.com",
    projectId: "aetherweave-edtor",
    storageBucket: "aetherweave-edtor.appspot.com",
    messagingSenderId: "102938475610",
    appId: "1:102938475610:web:abc123def456"
};

// Initialize Firebase safely
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} else {
    console.error("Firebase SDK failed to load from CDN.");
}

const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// ==========================================
// 2. GLOBAL APPLICATION STATE
// ==========================================
let currentUser = null;
let isSignUpView = false;
let activeBrowseSort = 'New';
let activeDashSubTab = 'edit';
let activeFeedTab = 'global';
let animationFrameId = null;

// Game & Canvas Engine State
let gridWidth = 512;
let gridHeight = 384;
let activeTool = 'solid';
let isTestingMode = false;

const gameState = {
    currentPath: '/',
    entities: [],
    player: {
        x: 64,
        y: 64,
        vx: 0,
        vy: 0,
        width: 24,
        height: 24,
        isGrounded: false
    }
};

const ADMIN_EMAILS = [
    'thomas@aetherweave.com',
    'admin@aetherweave.com',
    'thomas-lefebvre@gmail.com'
];

function isAdmin(email) {
    return email && ADMIN_EMAILS.includes(email.toLowerCase());
}

function navigate(path) {
    window.history.pushState({}, '', path);
    router();
}

window.addEventListener('popstate', router);

// ==========================================
// 3. AUTHENTICATION LISTENER & ROUTER
// ==========================================
auth.onAuthStateChanged(user => {
    currentUser = user;
    router();
});

function router() {
    const path = window.location.pathname;
    gameState.currentPath = path;
    const app = document.getElementById('app-view');
    if (!app) return;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (path === '/google-sign-in') {
        renderGoogleHandshakePage(app);
        return;
    }

    if (!currentUser) {
        renderAdvertisementPage(app);
        return;
    }

    if (path === '/' || path === '') {
        navigate('/browse');
        return;
    }

    if (path === '/admin' || path === '/admin/') {
        if (isAdmin(currentUser.email)) {
            renderAdminDashboardPage(app);
        } else {
            navigate('/browse');
        }
        return;
    }

    if (path === '/browse' || path.startsWith('/browse/sorting/')) {
        if (path.startsWith('/browse/sorting/')) {
            activeBrowseSort = path.split('/browse/sorting/')[1] || 'New';
        }
        renderMainPlatformLayout(app, 'browse');
    }
    else if (path === '/dashboard' || path === '/dashboard/') {
        renderMainPlatformLayout(app, 'dashboard');
    }
    else if (path.startsWith('/dashboard/')) {
        const parts = path.split('/'); 
        const projId = parts[2];
        const subTab = parts[3] || 'edit';
        activeDashSubTab = subTab;
        renderDashboardProjectView(app, projId);
    }
    else if (path === '/feed' || path.startsWith('/feed/')) {
        if (path.startsWith('/feed/')) {
            activeFeedTab = path.split('/feed/')[1] || 'global';
        }
        renderMainPlatformLayout(app, 'feed');
    }
    else if (path === '/chat' || path === '/chat/') {
        renderMainPlatformLayout(app, 'chat');
    }
    else if (path.startsWith('/')) {
        const cleanPath = path.substring(1);
        if (cleanPath.endsWith('/edit')) {
            renderMainPlatformLayout(app, 'profile-edit');
        } else {
            renderMainPlatformLayout(app, 'profile');
        }
    }
    else {
        render404Page(app);
    }
}

// ==========================================
// 4. AUTHENTICATION & LANDING VIEWS
// ==========================================
function renderAdvertisementPage(container) {
    container.innerHTML = `
        <div class="home-container">
            <svg width="80" height="80" viewBox="0 0 100 100" style="margin-bottom:20px; border-radius:16px; background:#13131a; border:2px solid var(--border-glow);">
              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#aetherGrad)" stroke-width="8" />
              <path d="M 30 50 Q 50 20 70 50 T 30 50" fill="none" stroke="#00e5ff" stroke-width="6" />
              <defs><linearGradient id="aetherGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00e5ff"/><stop offset="100%" stop-color="#7000ff"/></linearGradient></defs>
            </svg>

            <h1 class="brand-logo" style="font-size:3rem; margin-bottom:10px;">AetherWeave Engine</h1>
            <p style="color:var(--text-thread); max-width:500px; margin-bottom:30px; font-size:1.1rem;">
                Craft 2D grid levels, share game matrices, and collaborate with creators across the universe.
            </p>

            <div style="background:var(--panel-weave); border:1px solid var(--border-glow); border-radius:12px; padding:30px; width:100%; max-width:400px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                <h2 style="margin-bottom:20px; font-size:1.4rem;">${isSignUpView ? 'Create Account' : 'Welcome Back'}</h2>
                
                <div class="input-group">
                    <label>Email Address</label>
                    <input type="email" id="auth-email" placeholder="weaver@aetherweave.com">
                </div>

                <div class="input-group">
                    <label>Password</label>
                    <input type="password" id="auth-password" placeholder="••••••••">
                </div>

                <p id="auth-error" style="color:var(--aether-red); font-size:0.85rem; display:none; margin-bottom:15px;"></p>

                <button class="btn" id="btn-submit-auth" style="width:100%; margin-bottom:15px;">
                    ${isSignUpView ? 'Sign Up' : 'Log In'}
                </button>

                <div style="display:flex; align-items:center; gap:10px; margin:15px 0; color:var(--text-thread); font-size:0.8rem;">
                    <div style="flex:1; height:1px; background:var(--border-glow);"></div>
                    <span>OR</span>
                    <div style="flex:1; height:1px; background:var(--border-glow);"></div>
                </div>

                <button class="btn" id="btn-google-auth" style="width:100%; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">
                    🌐 Continue with Google
                </button>

                <p style="margin-top:20px; font-size:0.85rem; color:var(--text-thread);">
                    ${isSignUpView ? 'Already have an account?' : "Don't have an account?"} 
                    <a href="#" id="toggle-auth-link" style="color:var(--aether-cyan); text-decoration:none; font-weight:bold;">
                        ${isSignUpView ? 'Log In' : 'Sign Up'}
                    </a>
                </p>
            </div>
        </div>
    `;

    document.getElementById('toggle-auth-link').addEventListener('click', (e) => {
        e.preventDefault();
        isSignUpView = !isSignUpView;
        renderAdvertisementPage(container);
    });

    document.getElementById('btn-submit-auth').addEventListener('click', () => {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const errBox = document.getElementById('auth-error');

        if (!email || !password) {
            errBox.innerText = 'Please provide both email and password.';
            errBox.style.display = 'block';
            return;
        }

        const authAction = isSignUpView 
            ? auth.createUserWithEmailAndPassword(email, password)
            : auth.signInWithEmailAndPassword(email, password);

        authAction.then(cred => {
            if (isSignUpView) {
                return db.collection('users').doc(cred.user.uid).set({
                    email: email,
                    username: email.split('@')[0],
                    registeredAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }).then(() => {
            navigate('/browse');
        }).catch(err => {
            errBox.innerText = err.message;
            errBox.style.display = 'block';
        });
    });

    document.getElementById('btn-google-auth').addEventListener('click', () => {
        navigate('/google-sign-in');
    });
}

function renderGoogleHandshakePage(container) {
    container.innerHTML = `
        <div class="handshake-container" style="position: relative;">
            <button class="btn" id="btn-handshake-back" style="position: absolute; top: 30px; left: 30px; background: rgba(255,255,255,0.08); border: 1px solid var(--border-glow); box-shadow: none;">
                ← Back to Login
            </button>

            <div class="handshake-bridge">
                <svg width="70" height="70" viewBox="0 0 100 100" style="border-radius:12px; background:#13131a; border:2px solid var(--border-glow);">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="url(#aetherGrad)" stroke-width="8" />
                  <path d="M 30 50 Q 50 20 70 50 T 30 50" fill="none" stroke="#00e5ff" stroke-width="6" />
                  <defs><linearGradient id="aetherGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00e5ff"/><stop offset="100%" stop-color="#7000ff"/></linearGradient></defs>
                </svg>
                <div class="meeting-hands">🤝</div>
                <img src="google.jpg" class="handshake-logo" style="background:#fff; padding:8px;" alt="Google Icon">
            </div>
            
            <h2 class="brand-logo" style="font-size: 2.2rem; margin-bottom:10px;">Authorizing Connection</h2>
            <p style="color:var(--text-thread); font-size:1.1rem; margin:0;" id="handshake-status">Synchronizing authentication security tokens...</p>
        </div>
    `;

    document.getElementById('btn-handshake-back').addEventListener('click', () => {
        navigate('/');
    });

    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((cred) => {
        document.getElementById('handshake-status').innerText = "Authentication successful! Redirecting...";
        return db.collection('users').doc(cred.user.uid).set({
            email: cred.user.email,
            username: cred.user.displayName || cred.user.email.split('@')[0],
            registeredAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }).then(() => {
        setTimeout(() => navigate('/browse'), 800);
    }).catch((err) => {
        const statusEl = document.getElementById('handshake-status');
        if (statusEl) {
            statusEl.innerText = "Handshake Error: " + err.message;
            statusEl.style.color = "var(--aether-red)";
        }
    });
}

// ==========================================
// 5. MAIN PLATFORM NAVIGATION SHELL
// ==========================================
function renderMainPlatformLayout(container, activeTab) {
    const userSlug = currentUser.email ? currentUser.email.replace(/[^a-zA-Z0-9]/g, '_') : 'user';
    const adminNav = isAdmin(currentUser.email) ? `<button class="tab-btn" onclick="navigate('/admin')">🛡️ Admin</button>` : '';

    container.innerHTML = `
        <div class="dashboard-wrapper">
            <nav class="dashboard-nav">
                <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="navigate('/browse')">
                    <svg width="32" height="32" viewBox="0 0 100 100" style="border-radius:6px; background:#13131a; border:1px solid var(--border-glow); flex-shrink: 0;">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#aetherGrad)" stroke-width="8" />
                      <path d="M 30 50 Q 50 20 70 50 T 30 50" fill="none" stroke="#00e5ff" stroke-width="6" />
                      <defs><linearGradient id="aetherGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00e5ff"/><stop offset="100%" stop-color="#7000ff"/></linearGradient></defs>
                    </svg>
                    <span class="project-title" style="font-size:1.3rem;">AetherWeave</span>
                </div>

                <div class="nav-tabs">
                    <button class="tab-btn ${activeTab === 'browse' ? 'active' : ''}" onclick="navigate('/browse')">🔍 Browse</button>
                    <button class="tab-btn ${activeTab === 'dashboard' ? 'active' : ''}" onclick="navigate('/dashboard')">🛠️ Dashboard</button>
                    <button class="tab-btn ${activeTab === 'feed' ? 'active' : ''}" onclick="navigate('/feed/global')">📰 Feed</button>
                    <button class="tab-btn ${activeTab === 'chat' ? 'active' : ''}" onclick="navigate('/chat')">💬 Notifications</button>
                    ${adminNav}
                </div>

                <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="navigate('/${userSlug}')">
                    <img id="header-user-avatar" src="aetherweave.jpg" style="width:32px; height:32px; border-radius:50%; border:1px solid var(--aether-cyan); object-fit:cover;">
                    <span id="header-user-name" style="font-size:0.9rem; font-weight:bold; color:var(--text-pure);">${currentUser.email.split('@')[0]}</span>
                    <button class="btn" onclick="event.stopPropagation(); auth.signOut().then(() => navigate('/'))" style="padding:6px 12px; font-size:0.75rem; background:#dc3545; box-shadow:none;">Sign Out</button>
                </div>
            </nav>

            <div class="dashboard-content" id="main-tab-viewport"></div>
        </div>
    `;

    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const avatarEl = document.getElementById('header-user-avatar');
            const nameEl = document.getElementById('header-user-name');
            if (avatarEl && data.avatarUrl) avatarEl.src = data.avatarUrl;
            if (nameEl && data.username) nameEl.innerText = data.username;
        }
    });

    const viewport = document.getElementById('main-tab-viewport');
    if (activeTab === 'browse') renderBrowseTab(viewport);
    else if (activeTab === 'dashboard') renderStudioDashboardTab(viewport);
    else if (activeTab === 'feed') renderCommunityFeedTab(viewport);
    else if (activeTab === 'chat') renderNotificationsChatTab(viewport);
    else if (activeTab === 'profile') renderUserProfileView(viewport, false);
    else if (activeTab === 'profile-edit') renderUserProfileView(viewport, true);
}
// ==========================================
// 6. TAB 1: BROWSE CATALOG & SEARCH
// ==========================================
function renderBrowseTab(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:15px; flex-wrap:wrap;">
            <input type="text" id="browse-search-input" placeholder="🔍 Search games..." style="flex:1; max-width:400px; padding:10px 15px; background:#1a1a24; border:1px solid var(--border-glow); border-radius:8px; color:#fff; outline:none;">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${['New', 'Popular', 'Top Played', 'Top Rated', 'Most Recent'].map(sort => `
                    <button class="btn" onclick="navigate('/browse/sorting/${sort}')" style="padding:6px 14px; font-size:0.8rem; background:${activeBrowseSort === sort ? 'var(--aether-cyan)' : '#1a1a24'}; color:${activeBrowseSort === sort ? '#000' : '#fff'}; box-shadow:none;">${sort}</button>
                `).join('')}
            </div>
        </div>
        <div class="project-card-grid" id="browse-games-grid"><p style="color:var(--text-thread);">Loading game catalog...</p></div>
    `;
    const searchInput = document.getElementById('browse-search-input');
    searchInput.addEventListener('input', () => fetchAndRenderBrowseGames(searchInput.value.toLowerCase()));
    fetchAndRenderBrowseGames('');
}

function fetchAndRenderBrowseGames(query) {
    db.collection('projects').get().then(snapshot => {
        const grid = document.getElementById('browse-games-grid');
        if (!grid) return;
        let projects = [];
        snapshot.forEach(doc => projects.push(doc.data()));
        if (query) projects = projects.filter(p => p.name && p.name.toLowerCase().includes(query));
        
        if (projects.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-thread);">No game matrices found.</p>`;
            return;
        }

        grid.innerHTML = projects.map(proj => `
            <div class="project-card">
                <div style="font-weight:bold; font-size:1.2rem; color:var(--aether-cyan);">🎮 ${proj.name}</div>
                <p style="font-size:0.85rem; color:var(--text-thread); margin:4px 0;">${proj.description || 'No description provided.'}</p>
                <div class="card-meta"><span>By: ${proj.author || 'Anonymous'}</span><span>⭐ ${proj.rating || '5.0'}</span></div>
                <button class="btn" onclick="navigate('/dashboard/${proj.id}/edit')" style="width:100%; padding:8px; margin-top:auto; background:var(--aether-purple); box-shadow:none;">Launch & Play</button>
            </div>
        `).join('');
    });
}

// ==========================================
// 7. TAB 2: STUDIO DASHBOARD & PROJECT VIEWS
// ==========================================
function renderStudioDashboardTab(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:15px; margin-bottom:20px;">
            <h2 style="margin:0;">Studio Dashboard</h2>
            <button class="btn" onclick="promptCreateNewWorkspaceProject()">➕ Create New Game</button>
        </div>
        <div class="project-card-grid" id="studio-projects-grid"><p style="color:var(--text-thread);">Loading your games...</p></div>
    `;

    db.collection('projects').where('ownerUid', '==', currentUser.uid).get().then(snapshot => {
        const grid = document.getElementById('studio-projects-grid');
        if (!grid) return;
        if (snapshot.empty) {
            grid.innerHTML = `<p style="color:var(--text-thread);">You haven't created any games yet. Click "Create New Game" above!</p>`;
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            const proj = doc.data();
            html += `
                <div class="project-card" style="border-left: 4px solid var(--aether-cyan);">
                    <div style="font-weight:bold; font-size:1.3rem;">${proj.name}</div>
                    <p style="font-size:0.85rem; color:var(--text-thread); margin:4px 0;">${proj.description || ''}</p>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-top:auto;">
                        <button class="btn" onclick="navigate('/dashboard/${proj.id}/edit')" style="padding:6px; background:#28a745; box-shadow:none;">Edit</button>
                        <button class="btn" onclick="navigate('/dashboard/${proj.id}/settings')" style="padding:6px; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">Settings</button>
                        <button class="btn" onclick="navigate('/dashboard/${proj.id}/analytics')" style="padding:6px; background:var(--aether-purple); box-shadow:none;">Stats</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    });
}

function renderDashboardProjectView(container, projectId) {
    db.collection('projects').doc(projectId).get().then(doc => {
        if (!doc.exists) return render404Page(container);
        const proj = doc.data();

        container.innerHTML = `
            <div style="padding:10px 0;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:15px; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
                    <h2 style="margin:0; color:var(--aether-cyan);">${proj.name}</h2>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn" onclick="navigate('/dashboard/${projectId}/edit')" style="padding:8px 16px; font-size:0.8rem; background:${activeDashSubTab === 'edit' ? 'var(--aether-cyan)' : '#1a1a24'}; color:${activeDashSubTab === 'edit' ? '#000' : '#fff'}; box-shadow:none;">🛠️ Editor</button>
                        <button class="btn" onclick="navigate('/dashboard/${projectId}/settings')" style="padding:8px 16px; font-size:0.8rem; background:${activeDashSubTab === 'settings' ? 'var(--aether-cyan)' : '#1a1a24'}; color:${activeDashSubTab === 'settings' ? '#000' : '#fff'}; box-shadow:none;">⚙️ Settings</button>
                        <button class="btn" onclick="navigate('/dashboard/${projectId}/analytics')" style="padding:8px 16px; font-size:0.8rem; background:${activeDashSubTab === 'analytics' ? 'var(--aether-cyan)' : '#1a1a24'}; color:${activeDashSubTab === 'analytics' ? '#000' : '#fff'}; box-shadow:none;">📊 Analytics</button>
                        <button class="btn" onclick="navigate('/dashboard')" style="padding:8px 16px; font-size:0.8rem; background:#dc3545; box-shadow:none;">← Studio</button>
                    </div>
                </div>
                <div id="dash-subview-content"></div>
            </div>
        `;

        const subView = document.getElementById('dash-subview-content');
        if (activeDashSubTab === 'edit') {
            renderEditorPage(subView, projectId);
            initEditorEngine();
        } else if (activeDashSubTab === 'settings') {
            subView.innerHTML = `
                <div style="max-width:500px; background:var(--panel-weave); padding:24px; border-radius:8px; border:1px solid var(--border-glow);">
                    <h3>Game Metadata Settings</h3>
                    <div class="input-group" style="margin-top:15px;"><label>Game Title</label><input type="text" id="setting-name" value="${proj.name}"></div>
                    <div class="input-group" style="margin-top:10px;"><label>Description</label><textarea id="setting-desc" style="width:100%; height:90px; background:#1a1a24; border:1px solid var(--border-glow); border-radius:6px; color:#fff; padding:10px; outline:none;">${proj.description || ''}</textarea></div>
                    <button class="btn" id="btn-save-settings" style="margin-top:15px;">Save Metadata</button>
                </div>
            `;
            document.getElementById('btn-save-settings').addEventListener('click', () => {
                db.collection('projects').doc(projectId).update({
                    name: document.getElementById('setting-name').value,
                    description: document.getElementById('setting-desc').value
                }).then(() => alert('Settings saved successfully!'));
            });
        } else if (activeDashSubTab === 'analytics') {
            subView.innerHTML = `
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:20px; max-width:800px;">
                    <div class="properties-box" style="text-align:center; padding:20px;"><h1 style="color:var(--aether-cyan); margin:0;">${proj.plays || 0}</h1><p style="margin-top:8px; color:var(--text-thread);">Total Plays</p></div>
                    <div class="properties-box" style="text-align:center; padding:20px;"><h1 style="color:var(--aether-purple); margin:0;">${proj.likes || 0}</h1><p style="margin-top:8px; color:var(--text-thread);">Likes</p></div>
                    <div class="properties-box" style="text-align:center; padding:20px;"><h1 style="color:#28a745; margin:0;">${proj.rating || '5.0'}</h1><p style="margin-top:8px; color:var(--text-thread);">Average Rating</p></div>
                </div>
            `;
        }
    });
}

// ==========================================
// 8. TAB 3: COMMUNITY FEED
// ==========================================
function renderCommunityFeedTab(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:15px; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; gap:10px;">
                <button class="btn" onclick="navigate('/feed/my')" style="padding:8px 16px; font-size:0.85rem; background:${activeFeedTab === 'my' ? 'var(--aether-cyan)' : '#1a1a24'}; color:${activeFeedTab === 'my' ? '#000' : '#fff'}; box-shadow:none;">👤 My Feed</button>
                <button class="btn" onclick="navigate('/feed/featured')" style="padding:8px 16px; font-size:0.85rem; background:${activeFeedTab === 'featured' ? 'var(--aether-cyan)' : '#1a1a24'}; color:${activeFeedTab === 'featured' ? '#000' : '#fff'}; box-shadow:none;">⭐ Featured</button>
                <button class="btn" onclick="navigate('/feed/global')" style="padding:8px 16px; font-size:0.85rem; background:${activeFeedTab === 'global' ? 'var(--aether-cyan)' : '#1a1a24'}; color:${activeFeedTab === 'global' ? '#000' : '#fff'}; box-shadow:none;">🌍 Global Feed</button>
            </div>
        </div>
        <div class="project-card-grid" id="feed-posts-grid"><p style="color:var(--text-thread);">Loading activity feed...</p></div>
    `;

    db.collection('projects').orderBy('createdAt', 'desc').get().then(snapshot => {
        const grid = document.getElementById('feed-posts-grid');
        if (!grid) return;
        let items = [];
        snapshot.forEach(doc => items.push(doc.data()));

        if (items.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-thread);">No community activity recorded yet.</p>`;
            return;
        }

        grid.innerHTML = items.map(item => `
            <div class="project-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${item.authorAvatar || 'aetherweave.jpg'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                        <div>
                            <div style="font-weight:bold; color:var(--text-pure);">${item.author || 'Weaver'}</div>
                            <div style="font-size:0.75rem; color:var(--text-thread);">Published a game matrix</div>
                        </div>
                    </div>
                    <button class="btn" onclick="alert('Successfully followed creator!')" style="padding:4px 10px; font-size:0.75rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">+ Follow</button>
                </div>
                <div style="margin:12px 0; font-weight:bold; font-size:1.2rem; color:var(--aether-cyan);">🎮 ${item.name}</div>
                <p style="color:var(--text-thread); font-size:0.9rem;">${item.description || ''}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto;">
                    <div style="display:flex; gap:4px; color:#ffcc00; cursor:pointer;" onclick="rateGameProject('${item.id}')">
                        ★ ★ ★ ★ ★ <span style="color:var(--text-thread); font-size:0.8rem;">(${item.rating || '5.0'})</span>
                    </div>
                    <button class="btn" onclick="navigate('/dashboard/${item.id}/edit')" style="padding:6px 14px; font-size:0.8rem; background:var(--aether-purple); box-shadow:none;">Play</button>
                </div>
            </div>
        `).join('');
    });
}

function rateGameProject(projId) {
    const score = prompt("Rate this game matrix from 1 to 5 stars:");
    if (score && !isNaN(score)) {
        db.collection('projects').doc(projId).update({ rating: parseFloat(score).toFixed(1) }).then(() => {
            alert("Rating submitted successfully!");
            router();
        });
    }
}
// ==========================================
// 9. TAB 4: NOTIFICATIONS & MESSAGING CHAT
// ==========================================
function renderNotificationsChatTab(container) {
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:300px 1fr; gap:20px; height:calc(100vh - 140px);">
            <div style="background:var(--panel-weave); border:1px solid var(--border-glow); border-radius:8px; padding:15px; display:flex; flex-direction:column; gap:10px;">
                <h3>Messages & Chat</h3>
                <input type="text" id="chat-user-search" placeholder="🔍 Search weavers..." style="padding:8px; background:#1a1a24; border:1px solid var(--border-glow); border-radius:6px; color:#fff; outline:none;">
                <div id="chat-user-results" style="flex:1; overflow-y:auto;"></div>
            </div>
            <div style="background:var(--panel-weave); border:1px solid var(--border-glow); border-radius:8px; padding:20px; display:flex; flex-direction:column;">
                <div style="border-bottom:1px solid var(--border-glow); padding-bottom:10px; font-weight:bold;" id="chat-header-title">Select a Weaver to start messaging</div>
                <div id="chat-message-history" style="flex:1; padding:15px 0; overflow-y:auto; color:var(--text-thread);">No active message stream selected.</div>
                <div style="display:flex; gap:10px; border-top:1px solid var(--border-glow); padding-top:10px;">
                    <input type="text" id="chat-message-input" placeholder="Type transmission..." style="flex:1; padding:10px; background:#1a1a24; border:1px solid var(--border-glow); border-radius:6px; color:#fff; outline:none;">
                    <button class="btn" onclick="alert('Message transmitted!')">Send</button>
                </div>
            </div>
        </div>
    `;

    db.collection('users').get().then(snapshot => {
        const list = document.getElementById('chat-user-results');
        if (!list) return;
        snapshot.forEach(doc => {
            const u = doc.data();
            if (u.email && u.email !== currentUser.email) {
                const row = document.createElement('div');
                row.className = 'tool-item';
                row.style.cssText = "padding:8px; margin-bottom:5px; cursor:pointer;";
                row.innerText = u.username || u.email;
                row.onclick = () => { document.getElementById('chat-header-title').innerText = "Encrypted Chat with " + (u.username || u.email); };
                list.appendChild(row);
            }
        });
    });
}

// ==========================================
// 10. USER PROFILES & DRAG-AND-DROP AVATARS
// ==========================================
function renderUserProfileView(container, isEditing) {
    const userSlug = window.location.pathname.substring(1).replace('/edit', '');

    container.innerHTML = `
        <div style="max-width:650px; margin:0 auto; background:var(--panel-weave); border:1px solid var(--border-glow); border-radius:12px; padding:30px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2>👤 Weaver Profile</h2>
                <button class="btn" onclick="navigate('/${userSlug}${isEditing ? '' : '/edit'}')" style="padding:8px 16px; font-size:0.8rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">
                    ${isEditing ? 'Cancel Edit' : '⚙️ Edit Profile'}
                </button>
            </div>

            ${isEditing ? `
                <div id="drop-zone" style="border:2px dashed var(--aether-cyan); border-radius:12px; padding:25px; text-align:center; margin-bottom:20px; background:rgba(0,229,255,0.03); cursor:pointer;">
                    <img id="edit-avatar-preview" src="aetherweave.jpg" style="width:90px; height:90px; border-radius:50%; object-fit:cover; margin-bottom:10px; border:2px solid var(--aether-cyan);">
                    <p style="margin:0; font-size:0.9rem; color:var(--text-thread);">Drag & Drop profile picture here, or <b>click to browse file manager</b></p>
                    <input type="file" id="file-avatar-input" accept="image/*" style="display:none;">
                </div>
                <div class="input-group">
                    <label>Custom Username</label>
                    <input type="text" id="edit-username-input" value="${currentUser.email.split('@')[0]}">
                </div>
                <button class="btn" id="btn-save-profile-changes" style="margin-top:20px; width:100%;">Save Profile Changes</button>
            ` : `
                <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px;">
                    <img id="view-avatar-img" src="aetherweave.jpg" style="width:90px; height:90px; border-radius:50%; object-fit:cover; border:2px solid var(--aether-cyan);">
                    <div>
                        <h3 id="view-username-text" style="margin:0; font-size:1.4rem;">Weaver</h3>
                        <div style="font-size:0.9rem; color:var(--text-thread);">${currentUser.email}</div>
                    </div>
                </div>
            `}
        </div>
    `;

    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        if (isEditing) {
            if (data.avatarUrl) document.getElementById('edit-avatar-preview').src = data.avatarUrl;
            if (data.username) document.getElementById('edit-username-input').value = data.username;

            const dropZone = document.getElementById('drop-zone');
            const fileInput = document.getElementById('file-avatar-input');
            if (dropZone && fileInput) {
                dropZone.onclick = () => fileInput.click();
                fileInput.onchange = (e) => handleAvatarImageFile(e.target.files[0]);
                dropZone.ondragover = (e) => e.preventDefault();
                dropZone.ondrop = (e) => { e.preventDefault(); handleAvatarImageFile(e.dataTransfer.files[0]); };
            }

            document.getElementById('btn-save-profile-changes').onclick = () => {
                const newUsername = document.getElementById('edit-username-input').value;
                const newAvatar = document.getElementById('edit-avatar-preview').src;
                db.collection('users').doc(currentUser.uid).update({
                    username: newUsername,
                    avatarUrl: newAvatar
                }).then(() => navigate(`/${currentUser.email.replace(/[^a-zA-Z0-9]/g, '_')}`));
            };
        } else {
            if (data.avatarUrl) document.getElementById('view-avatar-img').src = data.avatarUrl;
            if (data.username) document.getElementById('view-username-text').innerText = data.username;
        }
    });
}

function handleAvatarImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { document.getElementById('edit-avatar-preview').src = e.target.result; };
    reader.readAsDataURL(file);
}

// ==========================================
// 11. ADMIN DASHBOARD PANEL
// ==========================================
function renderAdminDashboardPage(container) {
    container.innerHTML = `
        <div style="padding:40px; background:var(--bg-space); min-height:100vh; color:#fff; max-width:1000px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:20px;">
                <h1 class="brand-logo" style="font-size:2.5rem; margin:0;">Loom Administration</h1>
                <button class="btn" onclick="navigate('/browse')">← Back to Browse</button>
            </div>
            <p style="margin-top:20px; color:var(--text-thread);">Secure overview of active users synchronized through your cloud Firestore datastore.</p>
            <div id="admin-user-list" style="margin-top:20px;"><p style="color:#8e8ea0;">Retrieving active databases...</p></div>
        </div>
    `;

    db.collection('users').orderBy('registeredAt', 'desc').get().then(snapshot => {
        const listContainer = document.getElementById('admin-user-list');
        if (!listContainer) return;
        listContainer.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const dateDisplay = data.registeredAt ? new Date(data.registeredAt.seconds * 1000).toLocaleDateString() : 'Pending Sync';
            const card = document.createElement('div');
            card.style.cssText = "background:var(--panel-weave); border:1px solid var(--border-glow); padding:16px; border-radius:8px; margin-bottom:10px;";
            card.innerHTML = `<div style="font-weight:bold; color:var(--aether-cyan); margin-bottom:5px;">User Node Instance</div><div style="font-size:0.9rem; margin-bottom:5px;">Email: <b>${data.email}</b></div><div style="font-size:0.8rem; color:#8e8ea0;">Registered On: ${dateDisplay}</div>`;
            listContainer.appendChild(card);
        });
    }).catch(err => {
        const listContainer = document.getElementById('admin-user-list');
        if (listContainer) listContainer.innerHTML = `<p style="color:var(--aether-red);">Database Error: ${err.message}</p>`;
    });
}

// ==========================================
// 12. 2D CANVAS EDITOR & PLATFORMER ENGINE
// ==========================================
function promptCreateNewWorkspaceProject() {
    const nameInput = prompt("Enter a memorable name for your new AetherWeave game:");
    if (!nameInput || nameInput.trim() === "") return;
    const cleanId = "proj-" + Math.floor(1000 + Math.random() * 9000);

    db.collection('users').doc(currentUser.uid).get().then(userDoc => {
        const u = userDoc.data() || {};
        const newRecord = {
            id: cleanId,
            name: nameInput.trim(),
            author: u.username || currentUser.email.split('@')[0],
            ownerUid: currentUser.uid,
            authorAvatar: u.avatarUrl || 'aetherweave.jpg',
            description: "Custom grid game matrix configuration.",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        return db.collection('projects').doc(cleanId).set(newRecord, { merge: true });
    }).then(() => navigate(`/dashboard/${cleanId}/edit`));
}

function renderEditorPage(container, projectId) {
    container.innerHTML = `
        <div class="editor-layout">
            <div class="editor-sidebar">
                <h3>Build Palette</h3>
                <div class="tool-item ${activeTool === 'solid' ? 'active' : ''}" onclick="activeTool='solid'">🟦 Solid Block</div>
                <div class="tool-item ${activeTool === 'ice' ? 'active' : ''}" onclick="activeTool='ice'">🧊 Slippery Ice</div>
                <div class="tool-item ${activeTool === 'jump' ? 'active' : ''}" onclick="activeTool='jump'">⚡ Jump Pad</div>
                <div class="tool-item ${activeTool === 'hazard' ? 'active' : ''}" onclick="activeTool='hazard'">⚠️ Spike Hazard</div>
                <div class="tool-item ${activeTool === 'eraser' ? 'active' : ''}" onclick="activeTool='eraser'">🧹 Eraser</div>
                <hr style="border-color:var(--border-glow);">
                <h3>Area Dimensions</h3>
                <div class="properties-box"><p><b>Width:</b> ${gridWidth}px | <b>Height:</b> ${gridHeight}px</p></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                    <button class="btn" onclick="resizeGridArea('expand-left')" style="padding:6px; font-size:0.75rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">⬅ Expand L</button>
                    <button class="btn" onclick="resizeGridArea('expand-right')" style="padding:6px; font-size:0.75rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">Expand R ➡</button>
                    <button class="btn" onclick="resizeGridArea('expand-up')" style="padding:6px; font-size:0.75rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">⬆ Expand Up</button>
                    <button class="btn" onclick="resizeGridArea('expand-down')" style="padding:6px; font-size:0.75rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">Expand Dn ⬇</button>
                </div>
                <button class="btn" onclick="resizeGridArea('shrink')" style="width:100%; padding:6px; font-size:0.8rem; background:#dc3545; box-shadow:none;">Reset Default</button>
            </div>

            <div class="canvas-viewport" id="canvas-scroll-viewport">
                <canvas id="engineCanvas" width="${gridWidth}" height="${gridHeight}"></canvas>
            </div>

            <div class="editor-sidebar">
                <h3>Simulation</h3>
                <button class="btn" id="btn-test-play" onclick="toggleTestPlayMode()" style="width:100%; background:#28a745; box-shadow:none;">▶ Test Play</button>
                <button class="btn" onclick="saveProjectEntities('${projectId}')" style="width:100%; margin-top:10px;">💾 Save Matrix</button>
                <button class="btn" onclick="navigate('/dashboard/${projectId}/analytics')" style="width:100%; margin-top:10px; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">📊 Analytics</button>
            </div>
        </div>
    `;

    db.collection('projects').doc(projectId).get().then(doc => {
        if (doc.exists && doc.data().entities) {
            gameState.entities = doc.data().entities;
        } else {
            gameState.entities = [];
        }
    });
}

function resizeGridArea(action) {
    if (action === 'expand-right') gridWidth += 256;
    if (action === 'expand-left') {
        gridWidth += 256;
        gameState.entities.forEach(ent => ent.x += 256);
    }
    if (action === 'expand-down') gridHeight += 256;
    if (action === 'expand-up') {
        gridHeight += 256;
        gameState.entities.forEach(ent => ent.y += 256);
    }
    if (action === 'shrink') { gridWidth = 512; gridHeight = 384; }

    const parts = window.location.pathname.split('/');
    const projId = parts[2];
    const container = document.getElementById('dash-subview-content');
    if (container) {
        renderEditorPage(container, projId);
        initEditorEngine();
    }
}

function saveProjectEntities(projectId) {
    db.collection('projects').doc(projectId).update({
        entities: gameState.entities
    }).then(() => alert('Game matrix saved successfully!'));
}

function toggleTestPlayMode() {
    isTestingMode = !isTestingMode;
    const btn = document.getElementById('btn-test-play');
    if (isTestingMode) {
        btn.innerText = "⏹ Stop Test";
        btn.style.background = "#dc3545";
        gameState.player.x = 64;
        gameState.player.y = 64;
        gameState.player.vx = 0;
        gameState.player.vy = 0;
    } else {
        btn.innerText = "▶ Test Play";
        btn.style.background = "#28a745";
    }
}

function initEditorEngine() {
    const canvas = document.getElementById('engineCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const keys = {};
    window.onkeydown = (e) => { keys[e.code] = true; };
    window.onkeyup = (e) => { keys[e.code] = false; };

    canvas.onmousedown = (e) => {
        if (isTestingMode) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = Math.floor((e.clientX - rect.left) / 32) * 32;
        const mouseY = Math.floor((e.clientY - rect.top) / 32) * 32;

        if (activeTool === 'eraser') {
            gameState.entities = gameState.entities.filter(ent => ent.x !== mouseX || ent.y !== mouseY);
        } else {
            gameState.entities = gameState.entities.filter(ent => ent.x !== mouseX || ent.y !== mouseY);
            gameState.entities.push({ x: mouseX, y: mouseY, type: activeTool });
        }
    };

    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Grid Lines
        ctx.strokeStyle = '#181822';
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvas.width; x += 32) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += 32) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Render Entities
        gameState.entities.forEach(ent => {
            if (ent.type === 'solid') ctx.fillStyle = '#00e5ff';
            else if (ent.type === 'ice') ctx.fillStyle = '#66ccff';
            else if (ent.type === 'jump') ctx.fillStyle = '#ffcc00';
            else if (ent.type === 'hazard') ctx.fillStyle = '#ff3366';
            ctx.fillRect(ent.x + 1, ent.y + 1, 30, 30);
        });

        // Test Play Physics
        if (isTestingMode) {
            const p = gameState.player;
            if (keys['ArrowLeft'] || keys['KeyA']) p.vx = -3;
            else if (keys['ArrowRight'] || keys['KeyD']) p.vx = 3;
            else p.vx = 0;

            if ((keys['ArrowUp'] || keys['Space'] || keys['KeyW']) && p.isGrounded) {
                p.vy = -9;
                p.isGrounded = false;
            }

            p.vy += 0.4; // Gravity
            p.x += p.vx;
            p.y += p.vy;

            // Collision check
            gameState.entities.forEach(ent => {
                if (ent.type === 'solid' || ent.type === 'ice') {
                    if (p.x < ent.x + 32 && p.x + p.width > ent.x && p.y < ent.y + 32 && p.y + p.height > ent.y) {
                        if (p.vy > 0 && p.y + p.height - p.vy <= ent.y) {
                            p.y = ent.y - p.height;
                            p.vy = 0;
                            p.isGrounded = true;
                        }
                    }
                } else if (ent.type === 'hazard') {
                    if (p.x < ent.x + 32 && p.x + p.width > ent.x && p.y < ent.y + 32 && p.y + p.height > ent.y) {
                        p.x = 64; p.y = 64; p.vx = 0; p.vy = 0;
                    }
                } else if (ent.type === 'jump') {
                    if (p.x < ent.x + 32 && p.x + p.width > ent.x && p.y < ent.y + 32 && p.y + p.height > ent.y) {
                        p.vy = -12;
                    }
                }
            });

            // Draw Player
            ctx.fillStyle = '#7000ff';
            ctx.fillRect(p.x, p.y, p.width, p.height);
        }

        animationFrameId = requestAnimationFrame(gameLoop);
    }

    gameLoop();
}

function render404Page(container) {
    container.innerHTML = `
        <div class="home-container">
            <h1 class="brand-logo" style="font-size:2.5rem; margin-bottom:15px;">404 - Matrix Not Found</h1>
            <p style="color:var(--text-thread); margin-bottom:20px;">The requested resource link has severed or does not exist.</p>
            <button class="btn" onclick="navigate('/browse')">Return to Browse</button>
        </div>
    `;
}