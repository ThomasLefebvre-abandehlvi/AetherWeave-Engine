// --- FIREBASE SECURITY REGISTRY ---
const firebaseConfig = {
  apiKey: "AIzaSyAt1zpo19sS0Fm8wMrBcGJwbHpHMIhFag0",
  authDomain: "aetherweave-edtor.firebaseapp.com",
  projectId: "aetherweave-edtor",
  storageBucket: "aetherweave-edtor.firebasestorage.app",
  messagingSenderId: "967617394273",
  appId: "1:967617394273:web:f2a797386334f283badc20"
};

// Global Architecture Variables
let auth, db;
let currentUser = null;
let isSignUpView = false;

// Sub-Tab States
let activeBrowseSort = 'New';
let activeFeedTab = 'global'; // 'my', 'featured', 'global'
let activeDashSubTab = 'edit'; // 'edit', 'settings', 'analytics'

// Editor State
let editorTab = 'build'; 
let customTileColor = '#00e5ff'; 
let gridWidth = 512;
let gridHeight = 384;
let editorCamera = { x: 0, y: 0 };
let canvas, ctx, animationFrameId;
const GRID_SIZE = 32;
let keys = {};

let gameState = {
    currentPath: window.location.pathname,
    selectedTool: 'block', 
    isPlaying: false,
    entities: [] 
};

// SAFETY INTERCEPT: DOM Ready Initializer
window.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        auth.onAuthStateChanged(user => {
            currentUser = user;
            router(); 
        });
    } else {
        console.error("Firebase SDK failed to initialize.");
    }
});

// --- CENTRAL ROUTER SUBSYSTEM ---
function router() {
    const path = window.location.pathname;
    gameState.currentPath = path;
    const app = document.getElementById('app-view');
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    if (path === '/google-sign-in') {
        renderGoogleHandshakePage(app);
        return;
    }

    if (!currentUser) {
        renderAdvertisementPage(app);
        return;
    }

    // Default route redirect to Browse
    if (path === '/' || path === '') {
        navigate('/browse');
        return;
    }

    // Tab 1: Browse Routes
    if (path === '/browse' || path.startsWith('/browse/sorting/')) {
        if (path.startsWith('/browse/sorting/')) {
            activeBrowseSort = path.split('/browse/sorting/')[1] || 'New';
        }
        renderMainPlatformLayout(app, 'browse');
    }
    // Tab 2: Dashboard Routes
    else if (path === '/dashboard' || path === '/dashboard/') {
        renderMainPlatformLayout(app, 'dashboard');
    }
    else if (path.startsWith('/dashboard/')) {
        const parts = path.split('/'); // /dashboard/{projectid}/{subtab}
        const projId = parts[2];
        const subTab = parts[3] || 'edit';
        activeDashSubTab = subTab;
        renderDashboardProjectView(app, projId);
    }
    // Tab 3: Feed Routes
    else if (path === '/feed' || path.startsWith('/feed/')) {
        if (path.startsWith('/feed/')) {
            activeFeedTab = path.split('/feed/')[1] || 'global';
        }
        renderMainPlatformLayout(app, 'feed');
    }
    // Tab 4: Notifications / Chat Route
    else if (path === '/chat' || path === '/chat/') {
        renderMainPlatformLayout(app, 'chat');
    }
    // Admin Route
    else if (path === '/admin') {
        if (isAdmin(currentUser.email)) renderAdminDashboardPage(app);
        else navigate('/browse');
    }
    // Tab 5: Profile Routes (e.g. /email@domain.com or /email@domain.com/edit)
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

function navigate(url) {
    window.history.pushState({}, '', url);
    router();
}
window.addEventListener('popstate', router);

function isAdmin(email) {
    if (!email) return false;
    const target = email.toLowerCase().trim();
    return target === 'abandehlvi542@gmail.com' || target === 'lyrabelrose5@gmail.com';
}

function getCleanEmailSlug(email) {
    return email ? email.replace(/[^a-zA-Z0-9]/g, '_') : 'user';
}

// --- SIGN IN & AUTHENTICATION PAGES ---
function renderAdvertisementPage(container) {
    container.innerHTML = `
        <div class="auth-wrapper">
            <div class="ad-side">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                    <img src="aetherweave.jpg" alt="AetherWeave Icon" style="width: 60px; height: 60px; border-radius: 12px; border: 1px solid var(--border-glow); box-shadow: 0 0 20px var(--aether-cyan-glow); object-fit: cover;">
                    <h2 style="font-size: 2.8rem; font-weight: 900; margin: 0; background: linear-gradient(45deg, var(--aether-cyan), var(--aether-purple)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">AetherWeave</h2>
                </div>
                <div class="quote-box">"Weave your imagination into playable 2D worlds instantly."</div>
            </div>
            <div class="form-side">
                <div class="auth-card">
                    <h3>${isSignUpView ? 'Create Account' : 'Welcome Back'}</h3>
                    ${isSignUpView ? `
                        <div class="input-group"><label>Username</label><input type="text" id="auth-username" placeholder="WeaverName"></div>
                    ` : ''}
                    <div class="input-group"><label>Email Address</label><input type="email" id="auth-email" placeholder="name@example.com"></div>
                    <div class="input-group"><label>Secure Password</label><input type="password" id="auth-password" placeholder="••••••••"></div>
                    
                    <button class="btn" onclick="executeEmailAuthAction()" style="width:100%; margin-top:10px;">
                        ${isSignUpView ? 'Weave New Account' : 'Log In to Loom'}
                    </button>
                    
                    <button class="btn" onclick="executeGoogleAuthAction()" style="width:100%; margin-top:10px; background:#ffffff; color:#121214; box-shadow:none; display:flex; align-items:center; justify-content:center; gap:10px; border:1px solid #222230;">
                        <img src="google.jpg" alt="Google" style="width:18px; height:18px; object-fit:contain;">
                        <b>Continue with Google</b>
                    </button>
                    
                    <div class="auth-toggle-link" onclick="toggleAuthSubView()" style="margin-top:20px; text-align:center;">
                        ${isSignUpView ? 'Have an Account? Log in!' : 'New to AetherWeave? Sign up here!'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function toggleAuthSubView() {
    isSignUpView = !isSignUpView;
    renderAdvertisementPage(document.getElementById('app-view'));
}

function executeEmailAuthAction() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const username = isSignUpView ? (document.getElementById('auth-username').value.trim() || email.split('@')[0]) : '';

    if (!email || !password) return alert("Please enter email and password.");

    if (isSignUpView) {
        auth.createUserWithEmailAndPassword(email, password).then(cred => {
            return db.collection('users').doc(cred.user.uid).set({
                uid: cred.user.uid,
                email: cred.user.email,
                username: username,
                avatarUrl: 'aetherweave.jpg',
                registeredAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).then(() => navigate('/browse')).catch(err => alert(err.message));
    } else {
        auth.signInWithEmailAndPassword(email, password).then(() => navigate('/browse')).catch(err => alert(err.message));
    }
}

function executeGoogleAuthAction() { navigate('/google-sign-in'); }

function renderGoogleHandshakePage(container) {
    container.innerHTML = `
        <div class="handshake-container" style="position: relative;">
            <button class="btn" onclick="navigate('/')" style="position: absolute; top: 30px; left: 30px; background: rgba(255,255,255,0.08);">← Back</button>
            <div class="handshake-bridge">
                <img src="aetherweave.jpg" class="handshake-logo">
                <div class="meeting-hands">🤝</div>
                <img src="google.jpg" class="handshake-logo" style="background:#fff; padding:10px;">
            </div>
            <h2 class="brand-logo" style="font-size: 2.2rem;">Authorizing Connection</h2>
            <p style="color:var(--text-thread);" id="handshake-status">Synchronizing authentication...</p>
        </div>
    `;

    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((cred) => {
        return db.collection('users').doc(cred.user.uid).set({
            uid: cred.user.uid,
            email: cred.user.email,
            username: cred.user.email.split('@')[0],
            registeredAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(() => navigate('/browse'));
    }).catch(err => { navigate('/'); });
}

// --- GLOBAL PLATFORM SHELL LAYOUT ---
function renderMainPlatformLayout(container, activeTab) {
    const userSlug = getCleanEmailSlug(currentUser.email);
    const adminNav = isAdmin(currentUser.email) ? `<button class="tab-btn" onclick="navigate('/admin')">🛡️ Admin</button>` : '';

    container.innerHTML = `
        <div class="dashboard-wrapper">
            <nav class="dashboard-nav">
                <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="navigate('/browse')">
                    <img src="aetherweave.jpg" style="width:32px; height:32px; border-radius:6px;" alt="Loom Logo">
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

    // Fetch user details for header display
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.avatarUrl) document.getElementById('header-user-avatar').src = data.avatarUrl;
            if (data.username) document.getElementById('header-user-name').innerText = data.username;
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

// =========================================================================
// TAB 1: BROWSE HUB (ITCH.IO SEARCH & SORTING)
// =========================================================================
function renderBrowseTab(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:15px; flex-wrap:wrap;">
            <input type="text" id="browse-search-input" placeholder="🔍 Search games, mechanics, or weavers..." style="flex:1; max-width:400px; padding:10px 15px; background:#1a1a24; border:1px solid var(--border-glow); border-radius:8px; color:#fff; outline:none;">
            
            <div style="display:flex; gap:8px;">
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

        // Filter search
        if (query) {
            projects = projects.filter(p => (p.name && p.name.toLowerCase().includes(query)) || (p.description && p.description.toLowerCase().includes(query)));
        }

        // Sorting logic
        if (activeBrowseSort === 'Top Rated') projects.sort((a,b) => (b.rating || 0) - (a.rating || 0));
        else if (activeBrowseSort === 'Top Played') projects.sort((a,b) => (b.plays || 0) - (a.plays || 0));

        if (projects.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-thread);">No games found matching your filter parameters.</p>`;
            return;
        }

        grid.innerHTML = projects.map(proj => `
            <div class="project-card">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                    <img src="${proj.authorAvatar || 'aetherweave.jpg'}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid var(--aether-cyan);">
                    <div style="font-weight:bold; font-size:1.2rem; color:var(--aether-cyan);">🎮 ${proj.name}</div>
                </div>
                <div class="card-meta"><span>By: ${proj.author || 'Anonymous'}</span> <span>⭐ ${proj.rating || '5.0'}</span></div>
                <p style="color:var(--text-thread); font-size:0.9rem; margin:8px 0;">${proj.description || 'Custom grid game.'}</p>
                <button class="btn" onclick="navigate('/dashboard/${proj.id}/edit')" style="width:100%; padding:10px; font-size:0.85rem; margin-top:auto; background:var(--aether-purple); box-shadow:none;">▶️ Launch Game</button>
            </div>
        `).join('');
    });
}

// =========================================================================
// TAB 2: STUDIO DASHBOARD
// =========================================================================
function renderStudioDashboardTab(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:15px; margin-bottom:20px;">
            <h2 style="margin:0; font-size:1.8rem;">Studio Dashboard</h2>
            <button class="btn" onclick="promptCreateNewWorkspaceProject()" style="padding:10px 20px; font-size:0.9rem;">➕ Create New Game</button>
        </div>
        <div class="project-card-grid" id="studio-projects-grid"><p style="color:var(--text-thread);">Loading your games...</p></div>
    `;

    db.collection('projects').where('ownerUid', '==', currentUser.uid).get().then(snapshot => {
        const grid = document.getElementById('studio-projects-grid');
        if (!grid) return;

        if (snapshot.empty) {
            grid.innerHTML = `<p style="color:var(--text-thread);">You have no created games yet. Click "Create New Game" to start weaving!</p>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const proj = doc.data();
            html += `
                <div class="project-card" style="border-left: 4px solid var(--aether-cyan);">
                    <div style="font-weight:bold; font-size:1.3rem;">${proj.name}</div>
                    <div style="font-size:0.8rem; color:var(--text-thread); font-family:monospace;">ID: ${proj.id}</div>
                    <hr style="border:0; border-top:1px solid var(--border-glow); width:100%; margin:10px 0;">
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-top:auto;">
                        <button class="btn" onclick="navigate('/dashboard/${proj.id}/edit')" style="padding:6px; font-size:0.75rem; background:#28a745; box-shadow:none;">🛠️ Edit</button>
                        <button class="btn" onclick="navigate('/dashboard/${proj.id}/settings')" style="padding:6px; font-size:0.75rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">⚙️ Settings</button>
                        <button class="btn" onclick="navigate('/dashboard/${proj.id}/analytics')" style="padding:6px; font-size:0.75rem; background:var(--aether-purple); box-shadow:none;">📊 Stats</button>
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
            <div style="padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:10px; margin-bottom:20px;">
                    <h2 style="margin:0; color:var(--aether-cyan);">${proj.name}</h2>
                    <div style="display:flex; gap:8px;">
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
                <div style="max-width:500px; background:var(--panel-weave); padding:20px; border-radius:8px; border:1px solid var(--border-glow);">
                    <h3>Game Metadata</h3>
                    <div class="input-group"><label>Name</label><input type="text" id="setting-name" value="${proj.name}"></div>
                    <div class="input-group" style="margin-top:10px;"><label>Description</label><textarea id="setting-desc" style="width:100%; height:80px; background:#1a1a24; border:1px solid var(--border-glow); color:#fff; padding:8px;">${proj.description || ''}</textarea></div>
                    <button class="btn" id="btn-save-settings" style="margin-top:15px;">Save Metadata</button>
                </div>
            `;
            document.getElementById('btn-save-settings').addEventListener('click', () => {
                db.collection('projects').doc(projectId).update({
                    name: document.getElementById('setting-name').value,
                    description: document.getElementById('setting-desc').value
                }).then(() => navigate('/dashboard'));
            });
        } else if (activeDashSubTab === 'analytics') {
            subView.innerHTML = `
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; max-width:800px;">
                    <div class="properties-box" style="text-align:center;"><h1 style="color:var(--aether-cyan); margin:0;">${proj.plays || 0}</h1><p>Total Plays</p></div>
                    <div class="properties-box" style="text-align:center;"><h1 style="color:var(--aether-purple); margin:0;">${proj.likes || 0}</h1><p>Likes</p></div>
                    <div class="properties-box" style="text-align:center;"><h1 style="color:#28a745; margin:0;">${proj.rating || '5.0'}</h1><p>Average Rating</p></div>
                </div>
            `;
        }
    });
}

// =========================================================================
// TAB 3: COMMUNITY FEED (MY, FEATURED, GLOBAL + FOLLOW & RATING)
// =========================================================================
function renderCommunityFeedTab(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:15px; margin-bottom:20px;">
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

        grid.innerHTML = items.map(item => `
            <div class="project-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${item.authorAvatar || 'aetherweave.jpg'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                        <div>
                            <div style="font-weight:bold; color:var(--text-pure);">${item.author || 'Weaver'}</div>
                            <div style="font-size:0.75rem; color:var(--text-thread);">Published a new game matrix</div>
                        </div>
                    </div>
                    <button class="btn" onclick="toggleFollowUser('${item.ownerUid}')" style="padding:4px 10px; font-size:0.75rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">+ Follow</button>
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

function toggleFollowUser(targetUid) {
    alert("Follow status updated for weaver!");
}

function rateGameProject(projId) {
    const score = prompt("Rate this game from 1 to 5 stars:");
    if (score && !isNaN(score)) {
        db.collection('projects').doc(projId).update({ rating: parseFloat(score).toFixed(1) });
        alert("Thank you for rating!");
    }
}

// =========================================================================
// TAB 4: NOTIFICATIONS & MESSAGING SYSTEM
// =========================================================================
function renderNotificationsChatTab(container) {
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:300px 1fr; gap:20px; height:calc(100vh - 140px);">
            <div style="background:var(--panel-weave); border:1px solid var(--border-glow); border-radius:8px; padding:15px; display:flex; flex-direction:column; gap:10px;">
                <h3>Messages & Direct Chat</h3>
                <input type="text" id="chat-user-search" placeholder="🔍 Search user email/username..." style="padding:8px; background:#1a1a24; border:1px solid var(--border-glow); border-radius:6px; color:#fff; outline:none;">
                <div id="chat-user-results" style="flex:1; overflow-y:auto;"></div>
            </div>

            <div style="background:var(--panel-weave); border:1px solid var(--border-glow); border-radius:8px; padding:20px; display:flex; flex-direction:column;">
                <div style="border-bottom:1px solid var(--border-glow); padding-bottom:10px; font-weight:bold;" id="chat-header-title">Select a Weaver to start messaging</div>
                <div id="chat-message-history" style="flex:1; padding:15px 0; overflow-y:auto; color:var(--text-thread);">No messages selected.</div>
                
                <div style="display:flex; gap:10px; border-top:1px solid var(--border-glow); padding-top:10px;">
                    <input type="text" id="chat-message-input" placeholder="Type message..." style="flex:1; padding:10px; background:#1a1a24; border:1px solid var(--border-glow); border-radius:6px; color:#fff; outline:none;">
                    <label class="btn" style="padding:10px; background:#1a1a24; border:1px solid var(--border-glow); cursor:pointer;">
                        📎 <input type="file" id="chat-attachment-file" style="display:none;">
                    </label>
                    <button class="btn" id="btn-send-message">Send</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('chat-user-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) return;
        db.collection('users').get().then(snapshot => {
            const list = document.getElementById('chat-user-results');
            list.innerHTML = '';
            snapshot.forEach(doc => {
                const u = doc.data();
                if (u.email && u.email.toLowerCase().includes(query)) {
                    const row = document.createElement('div');
                    row.className = 'tool-item';
                    row.innerText = u.username || u.email;
                    row.onclick = () => { document.getElementById('chat-header-title').innerText = "Chat with " + (u.username || u.email); };
                    list.appendChild(row);
                }
            });
        });
    });
}

// =========================================================================
// TAB 5: USER PROFILE VIEW & DRAG/DROP AVATAR EDITING
// =========================================================================
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
                <div id="drop-zone" style="border:2px dashed var(--aether-cyan); border-radius:12px; padding:20px; text-align:center; margin-bottom:20px; background:rgba(0,229,255,0.03); cursor:pointer;">
                    <img id="edit-avatar-preview" src="aetherweave.jpg" style="width:90px; height:90px; border-radius:50%; object-fit:cover; margin-bottom:10px;">
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
            dropZone.onclick = () => fileInput.click();

            fileInput.onchange = (e) => handleAvatarImageFile(e.target.files[0]);
            dropZone.ondragover = (e) => { e.preventDefault(); };
            dropZone.ondrop = (e) => { e.preventDefault(); handleAvatarImageFile(e.dataTransfer.files[0]); };

            document.getElementById('btn-save-profile-changes').onclick = () => {
                const newUsername = document.getElementById('edit-username-input').value;
                const newAvatar = document.getElementById('edit-avatar-preview').src;
                db.collection('users').doc(currentUser.uid).update({
                    username: newUsername,
                    avatarUrl: newAvatar
                }).then(() => navigate(`/${getCleanEmailSlug(currentUser.email)}`));
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
    reader.onload = (e) => {
        document.getElementById('edit-avatar-preview').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

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

function render404Page(container) {
    container.innerHTML = `
        <div class="home-container">
            <img src="404notfound.jpg" style="max-width:350px; border-radius:12px; margin-bottom:20px;">
            <p>Matrix Connection Severed - Page Not Found</p>
            <button class="btn" onclick="navigate('/browse')">Return to Browse</button>
        </div>
    `;
}

// =========================================================================
// CANVAS ENGINE & PLATFORMER PHYSICS SYSTEM
// =========================================================================
let runtimePlayer = { x: 32, y: 32, vx: 0, vy: 0, grounded: false, spawnX: 32, spawnY: 32 };

function renderEditorPage(container, id) {
    container.innerHTML = `
        <div class="editor-layout">
            <div class="panel panel-left" style="overflow-y:auto;">
                <div style="display:flex; gap:5px; margin-bottom:10px;">
                    <button class="btn" onclick="switchEditorTab('build')" style="flex:1; padding:8px; font-size:0.8rem; background:${editorTab === 'build' ? 'var(--aether-cyan)' : '#1a1a24'}; color:${editorTab === 'build' ? '#000' : '#fff'}; box-shadow:none;">🧱 Build</button>
                    <button class="btn" onclick="switchEditorTab('area')" style="flex:1; padding:8px; font-size:0.8rem; background:${editorTab === 'area' ? 'var(--aether-cyan)' : '#1a1a24'}; color:${editorTab === 'area' ? '#000' : '#fff'}; box-shadow:none;">🗺️ Area</button>
                </div>

                ${editorTab === 'build' ? `
                    <h3>Build Palette</h3>
                    <div class="tool-list">
                        <button class="tool-item ${gameState.selectedTool === 'block' ? 'active' : ''}" data-tool="block">🧱 Solid Block</button>
                        <button class="tool-item ${gameState.selectedTool === 'ice-block' ? 'active' : ''}" data-tool="ice-block">🧊 Slippery Ice</button>
                        <button class="tool-item ${gameState.selectedTool === 'jump-pad' ? 'active' : ''}" data-tool="jump-pad">🟢 Jump Pad</button>
                        <button class="tool-item ${gameState.selectedTool === 'player' ? 'active' : ''}" data-tool="player">🕹️ Player Spawn</button>
                        <button class="tool-item ${gameState.selectedTool === 'coin' ? 'active' : ''}" data-tool="coin">🟡 Core Coin</button>
                        <button class="tool-item ${gameState.selectedTool === 'spike' ? 'active' : ''}" data-tool="spike">🔺 Hazard Spike</button>
                        <button class="tool-item ${gameState.selectedTool === 'sawblade' ? 'active' : ''}" data-tool="sawblade">⚙️ Spinning Saw</button>
                        <button class="tool-item ${gameState.selectedTool === 'erase' ? 'active' : ''}" data-tool="erase">❌ Thread Eraser</button>
                    </div>
                ` : `
                    <h3>Area Dimensions</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <button class="btn" onclick="resizeGridArea('expand-left')" style="padding:8px; font-size:0.75rem;">⬅ Expand L</button>
                        <button class="btn" onclick="resizeGridArea('expand-right')" style="padding:8px; font-size:0.75rem;">Expand R ➡</button>
                        <button class="btn" onclick="resizeGridArea('expand-up')" style="padding:8px; font-size:0.75rem;">⬆ Expand Up</button>
                        <button class="btn" onclick="resizeGridArea('expand-down')" style="padding:8px; font-size:0.75rem;">Expand Dn ⬇</button>
                    </div>
                `}
            </div>

            <div class="canvas-area">
                <div class="canvas-toolbar">
                    <span class="project-title">${decodeURIComponent(id).toUpperCase()}</span>
                    <div>
                        <button class="btn" id="btn-play" style="padding: 8px 16px; font-size:0.85rem; background:#28a745;">▶️ Run Grid</button>
                    </div>
                </div>
                <div class="canvas-container" style="position:relative; overflow:auto;">
                    <canvas id="engineCanvas" width="${gridWidth}" height="${gridHeight}"></canvas>
                </div>
            </div>
        </div>
    `;

    document.querySelectorAll('.tool-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tool-item').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            gameState.selectedTool = e.target.getAttribute('data-tool');
        });
    });

    document.getElementById('btn-play').addEventListener('click', toggleRuntimeMode);
}

function switchEditorTab(tab) {
    editorTab = tab;
    const projId = window.location.pathname.split('/')[2];
    renderEditorPage(document.getElementById('dash-subview-content'), projId);
    initEditorEngine();
}

function resizeGridArea(action) {
    if (action === 'expand-right') gridWidth += 256;
    if (action === 'expand-down') gridHeight += 256;
    const projId = window.location.pathname.split('/')[2];
    renderEditorPage(document.getElementById('dash-subview-content'), projId);
    initEditorEngine();
}

function initEditorEngine() {
    canvas = document.getElementById('engineCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.addEventListener('mousedown', executeGridDraw);
    window.addEventListener('keydown', (e) => keys[e.key] = true);
    window.addEventListener('keyup', (e) => keys[e.key] = false);
    drawViewport();
}

function executeGridDraw(e) {
    if (gameState.isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / GRID_SIZE) * GRID_SIZE;
    const y = Math.floor((e.clientY - rect.top) / GRID_SIZE) * GRID_SIZE;

    gameState.entities = gameState.entities.filter(ent => ent.x !== x || ent.y !== y);
    if (gameState.selectedTool !== 'erase') {
        gameState.entities.push({ type: gameState.selectedTool, x: x, y: y, color: customTileColor });
    }
    drawViewport();
}

function drawViewport() {
    if (!ctx) return;
    ctx.fillStyle = '#0c0c10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    gameState.entities.forEach(ent => {
        if (ent.type === 'block') {
            ctx.fillStyle = ent.color || '#1e1e2a';
            ctx.fillRect(ent.x, ent.y, GRID_SIZE, GRID_SIZE);
        } else if (ent.type === 'player') {
            ctx.fillStyle = '#7000ff';
            ctx.fillRect(ent.x + 6, ent.y + 6, GRID_SIZE - 12, GRID_SIZE - 12);
        }
    });

    if (gameState.isPlaying) {
        processPlatformerPhysics();
        ctx.fillStyle = '#7000ff';
        ctx.fillRect(runtimePlayer.x + 6, runtimePlayer.y + 6, GRID_SIZE - 12, GRID_SIZE - 12);
        animationFrameId = requestAnimationFrame(drawViewport);
    }
}

function toggleRuntimeMode() {
    const playBtn = document.getElementById('btn-play');
    if (!gameState.isPlaying) {
        const spawn = gameState.entities.find(e => e.type === 'player');
        runtimePlayer.x = spawn ? spawn.x : 32;
        runtimePlayer.y = spawn ? spawn.y : 32;
        gameState.isPlaying = true;
        playBtn.innerText = '⏹️ Stop';
        drawViewport();
    } else {
        gameState.isPlaying = false;
        playBtn.innerText = '▶️ Run Grid';
        cancelAnimationFrame(animationFrameId);
        drawViewport();
    }
}

function processPlatformerPhysics() {
    if (keys['d'] || keys['ArrowRight']) runtimePlayer.x += 4;
    if (keys['a'] || keys['ArrowLeft']) runtimePlayer.x -= 4;
}