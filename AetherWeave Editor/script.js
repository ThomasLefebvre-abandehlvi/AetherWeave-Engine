// --- FIREBASE SECURITY REGISTRY ---
const firebaseConfig = {
  apiKey: "AIzaSyAt1zpo19sS0Fm8wMrBcGJwbHpHMIhFag0",
  authDomain: "aetherweave-edtor.firebaseapp.com",
  projectId: "aetherweave-edtor",
  storageBucket: "aetherweave-edtor.firebasestorage.app",
  messagingSenderId: "967617394273",
  appId: "1:967617394273:web:f2a797386334f283badc20"
};

// Global variables
let auth;
let db;
let currentUser = null;
let isSignUpView = true;

// SAFETY INTERCEPT: Wait until DOM structure is built before initializing Firebase
window.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();

        auth.onAuthStateChanged(user => {
            currentUser = user;
            router(); 
        });
    } else {
        console.error("Firebase library failed to download. Check your internet connection or HTML CDN links.");
    }
});

// --- ENGINE ARCHITECTURE STATE ---
let gameState = {
    currentPath: window.location.pathname,
    selectedTool: 'block', 
    isPlaying: false,
    entities: [] 
};

// Canvas Engine References
let canvas, ctx, animationFrameId;
const GRID_SIZE = 32;
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 384;
let keys = {};

// --- DYNAMIC DISCOVERY DATABASE STATES ---
let dashboardActiveTab = 'feed'; 
let localProjectsMemory = [];
/* 



Router function to handle navigation and rendering




*/
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

    if (path === '/' || path === '') {
        navigate('/browse');
        return;
    }

    if (path === '/admin' || path === '/admin/') {
        if (isAdmin(currentUser.email)) renderAdminDashboardPage(app);
        else navigate('/browse');
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

function navigate(url) {
    window.history.pushState({}, '', url);
    router();
}
window.addEventListener('popstate', router);
window.addEventListener('DOMContentLoaded', router);

function isAdmin(email) {
    if (!email) return false;
    const target = email.toLowerCase().trim();
    return target === 'abandehlvi542@gmail.com' || target === 'lyrabelrose5@gmail.com';
}

// --- UNBREAKABLE ADVERTISEMENT PAGE ---
function renderAdvertisementPage(container) {
    container.innerHTML = `
        <div class="auth-wrapper">
            <div class="ad-side">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                    <img src="aetherweave.jpg" alt="AetherWeave Icon Logo" style="width: 60px; height: 60px; border-radius: 12px; border: 1px solid var(--border-glow); box-shadow: 0 0 20px var(--aether-cyan-glow); object-fit: cover;">
                    <h2 style="font-size: 2.8rem; font-weight: 900; margin: 0; background: linear-gradient(45deg, var(--aether-cyan), var(--aether-purple)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">AetherWeave</h2>
                </div>
                
                <div class="quote-box" style="margin-top: 5px;">
                    "Weave your imagination into playable 2D worlds instantly. Don't just play games—build them."
                </div>
                <p>Join thousands of solo developers crafting high-performance, grid-based games entirely inside their web browsers completely for free.</p>
            </div>
            <div class="form-side">
                <div class="auth-card">
                    <h3>${isSignUpView ? 'Create an Account' : 'Welcome Back'}</h3>
                    <div class="input-group"><label>Email Address</label><input type="email" id="auth-email" placeholder="name@example.com"></div>
                    <div class="input-group"><label>Secure Password</label><input type="password" id="auth-password" placeholder="••••••••"></div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="auth-remember" checked>
                        <label for="auth-remember">Remember password on this device</label>
                    </div>
                    
                    <button class="btn" onclick="executeEmailAuthAction()" style="width:100%; margin-top:10px;">
                        ${isSignUpView ? 'Weave New Account' : 'Log In to Loom'}
                    </button>
                    
                    <button class="btn" onclick="executeGoogleAuthAction()" style="width:100%; margin-top:10px; background:#ffffff; color:#121214; box-shadow:none; display:flex; align-items:center; justify-content:center; gap:10px; border:1px solid #222230;">
                        <img src="google.jpg" alt="Google Logo" style="width:18px; height:18px; object-fit:contain;">
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
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
        alert("Please enter both an email address and password.");
        return;
    }

    const remember = document.getElementById('auth-remember').checked;
    const persistenceMode = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;

    auth.setPersistence(persistenceMode).then(() => {
        if (isSignUpView) {
            return auth.createUserWithEmailAndPassword(email, password).then((cred) => {
                return db.collection('users').doc(cred.user.uid).set({
                    uid: cred.user.uid,
                    email: cred.user.email,
                    registeredAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        } else {
            return auth.signInWithEmailAndPassword(email, password);
        }
    }).catch(err => alert("Authentication Error: " + err.message));
}

function executeGoogleAuthAction() {
    navigate('/google-sign-in');
}

// --- GOOGLE HANDSHAKE SCREEN ---
function renderGoogleHandshakePage(container) {
    container.innerHTML = `
        <div class="handshake-container" style="position: relative;">
            <button class="btn" id="btn-handshake-back" style="position: absolute; top: 30px; left: 30px; background: rgba(255,255,255,0.08); border: 1px solid var(--border-glow); box-shadow: none;">
                ← Back to Login
            </button>

            <div class="handshake-bridge">
                <img src="aetherweave.jpg" class="handshake-logo" alt="AetherWeave Icon">
                <div class="meeting-hands">🤝</div>
                <img src="google.jpg" class="handshake-logo" style="background:#fff; padding:10px; width:70px; height:70px;" alt="Google Icon">
            </div>
            
            <h2 class="brand-logo" style="font-size: 2.2rem; margin-bottom:10px;">Authorizing Safe Connection</h2>
            <p style="color:var(--text-thread); font-size:1.1rem; margin:0;" id="handshake-status">Synchronizing authentication security token meshes...</p>
        </div>
    `;

    document.getElementById('btn-handshake-back').addEventListener('click', () => navigate('/'));

    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((cred) => {
        return db.collection('users').doc(cred.user.uid).set({
            uid: cred.user.uid,
            email: cred.user.email,
            registeredAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(() => {
            const statusEl = document.getElementById('handshake-status');
            if (statusEl) statusEl.innerText = "Security verified! Redirecting to dashboard loom...";
            setTimeout(() => navigate('/dashboard/feed/'), 1200);
        });
    }).catch(err => {
        if (err.code !== 'auth/popup-closed-by-user') {
            alert("Google Authentication Intercept Error: " + err.message);
        }
        navigate('/');
    });
}

// --- ADMIN DASHBOARD ---
function renderAdminDashboardPage(container) {
    container.innerHTML = `
        <div class="admin-layout">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:20px;">
                <h1 class="brand-logo" style="font-size:2.5rem; margin:0;">Loom Administration</h1>
                <button class="btn" id="btn-admin-back">← Back to Dashboard</button>
            </div>
            <p style="margin-top:20px;">Secure overview of users synced through your cloud Firestore datastore clusters.</p>
            <div class="admin-grid" id="admin-user-list"><p style="color:#8e8ea0;">Retrieving active databases...</p></div>
        </div>
    `;
    document.getElementById('btn-admin-back').addEventListener('click', () => navigate('/dashboard/feed/'));

    db.collection('users').orderBy('registeredAt', 'desc').get().then(snapshot => {
        const listContainer = document.getElementById('admin-user-list');
        listContainer.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const dateDisplay = data.registeredAt ? new Date(data.registeredAt.seconds * 1000).toLocaleDateString() : 'Pending Sync';
            const card = document.createElement('div');
            card.className = "user-row";
            card.innerHTML = `<div style="font-weight:bold; color:var(--aether-cyan); margin-bottom:5px;">User Node Instance</div><div style="font-size:0.9rem; margin-bottom:5px;">Email: <b>${data.email}</b></div><div style="font-size:0.8rem; color:#8e8ea0;">Registered On: ${dateDisplay}</div>`;
            listContainer.appendChild(card);
        });
    }).catch(err => {
        document.getElementById('admin-user-list').innerHTML = `<p style="color:var(--aether-red);">Database Error: ${err.message}</p>`;
    });
}

// --- PLATFORM DASHBOARD & TABS ---
function renderPlatformDashboardPage(container) {
    let adminNavSnippet = isAdmin(currentUser.email) ? `<button class="tab-btn" onclick="navigate('/admin')">🛡️ Admin</button>` : '';

    container.innerHTML = `
        <div class="dashboard-wrapper">
            <nav class="dashboard-nav">
                <div style="display:flex; align-items:center; gap:12px;">
                    <svg width="32" height="32" viewBox="0 0 100 100" style="border-radius:6px; background:#13131a; border:1px solid var(--border-glow);">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="url(#aetherGrad)" stroke-width="8" />
                    <path d="M 30 50 Q 50 20 70 50 T 30 50" fill="none" stroke="#00e5ff" stroke-width="6" />
                    <defs>
                    <linearGradient id="aetherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#00e5ff" />
                      <stop offset="100%" stop-color="#7000ff" />
                    </linearGradient>
                  </defs>
                </svg>
                    <span class="project-title" style="font-size:1.3rem;">AetherWeave</span>
                </div>
                <div class="nav-tabs">
                    <button class="tab-btn ${dashboardActiveTab === 'feed' ? 'active' : ''}" onclick="switchDashboardTab('feed')">🌍 Global Feed</button>
                    <button class="tab-btn ${dashboardActiveTab === 'my-projects' ? 'active' : ''}" onclick="switchDashboardTab('my-projects')">📂 My Projects</button>
                    <button class="tab-btn ${dashboardActiveTab === 'profile' ? 'active' : ''}" onclick="switchDashboardTab('profile')">👤 Profile</button>
                    ${adminNavSnippet}
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span style="font-size:0.85rem; color:var(--text-thread);">Active: <b>${currentUser.email}</b></span>
                    <button class="btn" onclick="auth.signOut().then(() => navigate('/'))" style="padding:8px 16px; font-size:0.8rem; background:#dc3545; box-shadow:none;">Sign Out</button>
                </div>
            </nav>
            <div class="dashboard-content" id="dashboard-tab-view"></div>
        </div>
    `;

    renderActiveTabContent();
}

function switchDashboardTab(tabId) {
    dashboardActiveTab = tabId;
    if (tabId === 'feed') {
        navigate('/dashboard/feed/');
    } else if (tabId === 'my-projects') {
        navigate('/dashboard/projects/');
    } else if (tabId === 'profile') {
        const cleanEmail = currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
        navigate(`/dashboard/${cleanEmail}/`);
    }
}

function renderActiveTabContent() {
    const contentArea = document.getElementById('dashboard-tab-view');
    if (!contentArea) return;
    
    if (dashboardActiveTab === 'feed') {
        contentArea.innerHTML = `<p style="color:var(--text-thread);">Retrieving live global projects from cloud loom...</p>`;

        db.collection('projects').orderBy('createdAt', 'desc').get().then(snapshot => {
            if (snapshot.empty) {
                contentArea.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:15px; margin-bottom:20px;">
                        <h2 style="margin:0; font-size:1.8rem;">Global Project Loom</h2>
                    </div>
                    <p style="color:var(--text-thread);">No global projects found yet. Be the first to publish one!</p>
                `;
                return;
            }

            let gridHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:15px; margin-bottom:20px;">
                    <h2 style="margin:0; font-size:1.8rem;">Global Project Loom</h2>
                    <span style="color:var(--text-thread); font-size:0.9rem;">Explore Community Creations</span>
                </div>
                <div class="project-card-grid">
            `;

            snapshot.forEach(doc => {
                const proj = doc.data();
                const dateDisplay = proj.createdAt ? new Date(proj.createdAt.seconds * 1000).toLocaleDateString() : 'Recently Weaved';
                const isOwner = currentUser && proj.ownerUid === currentUser.uid;

                gridHTML += `
                    <div class="project-card">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                            <svg width="28" height="28" viewBox="0 0 100 100" style="border-radius:50%; background:#13131a; border:1px solid var(--border-glow);">
                                <circle cx="50" cy="50" r="40" fill="none" stroke="url(#aetherGrad)" stroke-width="8" />
                                <path d="M 30 50 Q 50 20 70 50 T 30 50" fill="none" stroke="#00e5ff" stroke-width="6" />
                                <defs>
                                    <linearGradient id="aetherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#00e5ff" />
                                        <stop offset="100%" stop-color="#7000ff" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div style="font-weight:bold; font-size:1.2rem; color:var(--aether-cyan);">🎮 ${proj.name}</div>
                        </div>
                        <div class="card-meta"><span>By: ${proj.author || 'Anonymous'}</span> <span>${dateDisplay}</span></div>
                        <p style="color:var(--text-thread); font-size:0.9rem; margin:5px 0;">${proj.description || 'Custom grid matrix sandbox level.'}</p>
                        
                        <div style="display:grid; grid-template-columns: 1fr; gap:8px; margin-top:auto;">
                            <button class="btn" onclick="navigate('/dashboard/projects/edit/${proj.id}')" style="width:100%; padding:10px; font-size:0.85rem; background:${isOwner ? 'var(--aether-purple)' : '#28a745'}; box-shadow:none;">
                                ${isOwner ? '🛠️ Edit Matrix' : '▶️ Play Sandbox'}
                            </button>
                        </div>
                    </div>
                `;
            });

            gridHTML += `</div>`;
            contentArea.innerHTML = gridHTML;
        }).catch(err => {
            contentArea.innerHTML = `<p style="color:var(--aether-red);">Cloud Sync Error: ${err.message}</p>`;
        });

    } else if (dashboardActiveTab === 'my-projects') {
        contentArea.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:15px; margin-bottom:20px;">
                <h2 style="margin:0; font-size:1.8rem;">My Development Repositories</h2>
                <button class="btn" onclick="promptCreateNewWorkspaceProject()" style="padding:10px 20px; font-size:0.9rem;">➕ Weave New Project</button>
            </div>
            <div class="project-card-grid" id="my-projects-grid"><p style="color:var(--text-thread);">Loading your personal repositories...</p></div>
        `;

        db.collection('projects').where('ownerUid', '==', currentUser.uid).get().then(snapshot => {
            const gridContainer = document.getElementById('my-projects-grid');
            if (!gridContainer) return;

            if (snapshot.empty) {
                gridContainer.innerHTML = `<p style="color:var(--text-thread);">You haven't created any projects yet. Click "Weave New Project" above!</p>`;
                return;
            }

            let myHtml = '';
            snapshot.forEach(doc => {
                const proj = doc.data();
                myHtml += `
                    <div class="project-card" style="border-left: 4px solid var(--aether-cyan);">
                        <div style="font-weight:bold; font-size:1.3rem;">${proj.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-thread); font-family:monospace;">Workspace ID: ${proj.id}</div>
                        <hr style="border:0; border-top:1px solid var(--border-glow); width:100%; margin:10px 0;">
                        
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:auto;">
                            <button class="btn" onclick="navigate('/dashboard/projects/edit/${proj.id}')" style="padding:8px; font-size:0.85rem; background:#28a745; box-shadow:none;">🛠️ Edit Matrix</button>
                            <button class="btn" onclick="renderProjectOverviewSettingsCard('${proj.id}')" style="padding:8px; font-size:0.85rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">⚙️ Settings</button>
                        </div>
                    </div>
                `;
            });
            gridContainer.innerHTML = myHtml;
        }).catch(err => {
            const gridContainer = document.getElementById('my-projects-grid');
            if (gridContainer) gridContainer.innerHTML = `<p style="color:var(--aether-red);">Error loading your projects: ${err.message}</p>`;
        });

    } else if (dashboardActiveTab === 'profile') {
        contentArea.innerHTML = `
            <div style="max-width: 600px; margin: 0 auto; background: var(--panel-weave); border: 1px solid var(--border-glow); border-radius: 12px; padding: 30px; text-align: left;">
                <h2 style="margin-top: 0; color: var(--aether-cyan);">👤 User Profile Settings</h2>
                <p style="color: var(--text-thread); font-size: 0.9rem; margin-bottom: 20px;">Manage your public weaver identity and avatar profile picture.</p>
                
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                    <img id="profile-avatar-preview" src="aetherweave.jpg" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--aether-cyan);">
                    <div>
                        <div style="font-weight: bold; font-size: 1.1rem; color: var(--text-pure);">${currentUser.email}</div>
                        <div style="font-size: 0.85rem; color: var(--text-thread); font-family: monospace;">UID: ${currentUser.uid}</div>
                    </div>
                </div>

                <div class="input-group">
                    <label>Profile Avatar Image URL</label>
                    <input type="text" id="input-avatar-url" placeholder="https://example.com/your-avatar.jpg">
                </div>

                <button class="btn" id="btn-save-profile" style="margin-top: 20px;">Save Profile Settings</button>
            </div>
        `;

        db.collection('users').doc(currentUser.uid).get().then(doc => {
            if (doc.exists && doc.data().avatarUrl) {
                document.getElementById('input-avatar-url').value = doc.data().avatarUrl;
                document.getElementById('profile-avatar-preview').src = doc.data().avatarUrl;
            }
        });

        document.getElementById('btn-save-profile').addEventListener('click', () => {
            const avatarUrl = document.getElementById('input-avatar-url').value.trim();
            db.collection('users').doc(currentUser.uid).set({
                avatarUrl: avatarUrl
            }, { merge: true }).then(() => {
                alert("Profile settings saved successfully!");
                document.getElementById('profile-avatar-preview').src = avatarUrl || 'aetherweave.jpg';
            }).catch(err => {
                alert("Error saving profile: " + err.message);
            });
        });
    }
}

function promptCreateNewWorkspaceProject() {
    const nameInput = prompt("Enter a memorable name for your new AetherWeave project:");
    if (!nameInput || nameInput.trim() === "") return;

    const cleanId = "proj-" + Math.floor(1000 + Math.random() * 9000);
    const authorName = currentUser && currentUser.email ? currentUser.email.split('@')[0] : 'Weaver';

    db.collection('users').doc(currentUser.uid).get().then(userDoc => {
        const avatarUrl = (userDoc.exists && userDoc.data().avatarUrl) ? userDoc.data().avatarUrl : 'aetherweave.jpg';

        const newRecord = {
            id: cleanId,
            name: nameInput.trim(),
            author: authorName,
            ownerUid: currentUser.uid,
            authorAvatar: avatarUrl,
            description: "Custom user grid matrix configuration canvas blueprint.",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        return db.collection('projects').doc(cleanId).set(newRecord, { merge: true });
    }).then(() => {
        switchDashboardTab('my-projects');
    }).catch(err => {
        alert("Error creating project: " + err.message);
    });
}

function renderProjectOverviewSettingsCard(projectId) {
    db.collection('projects').doc(projectId).get().then(doc => {
        if (!doc.exists) return;
        const targetProject = doc.data();

        const contentArea = document.getElementById('dashboard-tab-view');
        contentArea.innerHTML = `
            <div style="background:var(--panel-weave); border:1px solid var(--border-glow); border-radius:12px; padding:30px; text-align:left; max-width:600px; margin:0 auto;">
                <h2 style="margin:0 0 10px 0; color:var(--aether-cyan);">⚙️ Project Overview Settings</h2>
                <p style="font-size:0.9rem; margin-bottom:20px;">Manage metadata parameters for workspace: <b>${targetProject.name}</b></p>
                
                <div class="input-group">
                    <label>Display Project Name</label>
                    <input type="text" id="edit-proj-name" value="${targetProject.name}">
                </div>
                
                <div class="input-group" style="margin-top: 15px;">
                    <label>Project Description</label>
                    <textarea id="edit-proj-desc" style="background:#1a1a24; border:1px solid var(--border-glow); color:white; padding:12px; border-radius:6px; font-size:1rem; width:100%; height:80px; outline:none; resize:vertical;">${targetProject.description || ''}</textarea>
                </div>

                <button class="btn" id="btn-save-project-settings" style="margin-top:20px;">Save Changes</button>
            </div>
        `;

        document.getElementById('btn-save-project-settings').addEventListener('click', () => {
            const newName = document.getElementById('edit-proj-name').value;
            const newDesc = document.getElementById('edit-proj-desc').value;
            db.collection('projects').doc(projectId).update({
                name: newName,
                description: newDesc
            }).then(() => {
                switchDashboardTab('my-projects');
            });
        });
    });
}

function render404Page(container) {
    container.innerHTML = `
        <div class="home-container" style="background: radial-gradient(circle at center, #1b0a1a 0%, var(--bg-space) 80%);">
            <div style="position: relative; max-width: 450px; margin-bottom: 20px;">
                <img src="404notfound.jpg" alt="Thread Severed - 404 Not Found" style="width: 100%; border-radius: 12px; border: 1px solid var(--border-glow); box-shadow: 0 10px 30px rgba(255, 51, 102, 0.15); max-height: 450px; object-fit: cover;">
            </div>
            <p style="color: var(--text-thread); font-size: 1.1rem; max-width: 400px; line-height: 1.4; margin-bottom: 24px;">
                The connection matrix to this specific path has been frayed or deleted from our grid datastore loom.
            </p>
            <button class="btn" onclick="navigate('/dashboard/feed/')">Return to Safe Loom</button>
        </div>
    `;
}

// --- EDITOR STATE & MULTI-TAB CONTROLS ---
let editorTab = 'build'; 
let customTileColor = '#00e5ff'; 
let gridWidth = 512;
let gridHeight = 384;
let editorCamera = { x: 0, y: 0 };

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

                    <div style="margin-top:15px;">
                        <h3>Block Hex Tint</h3>
                        <input type="color" id="tile-color-picker" value="${customTileColor}" style="width:100%; height:35px; background:none; border:1px solid var(--border-glow); cursor:pointer; border-radius:6px;">
                    </div>
                ` : `
                    <h3>Area Dimensions</h3>
                    <div class="properties-box">
                        <p><b>Width:</b> ${gridWidth}px | <b>Height:</b> ${gridHeight}px</p>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button class="btn" onclick="resizeGridArea('expand-right')" style="padding:8px; font-size:0.8rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">Expand Right ➡</button>
                        <button class="btn" onclick="resizeGridArea('expand-down')" style="padding:8px; font-size:0.8rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">Expand Down ⬇</button>
                        <button class="btn" onclick="resizeGridArea('shrink')" style="padding:8px; font-size:0.8rem; background:#dc3545; box-shadow:none;">Shrink / Reset Default</button>
                    </div>
                `}
            </div>

            <div class="canvas-area">
                <div class="canvas-toolbar">
                    <span class="project-title">${decodeURIComponent(id).toUpperCase()}</span>
                    <div>
                        <button class="btn" id="btn-play" style="padding: 8px 16px; font-size:0.85rem; margin:0; background:#28a745; box-shadow:none;">▶️ Run Grid</button>
                        <button class="btn" id="btn-export" style="padding: 8px 16px; font-size:0.85rem; margin:0; background:#007bff; box-shadow:none;">💾 Export Code</button>
                    </div>
                </div>
                <div class="canvas-container" style="position:relative; overflow:hidden;">
                    <canvas id="engineCanvas" width="512" height="384"></canvas>
                </div>
            </div>

            <div class="panel panel-right">
                <h3>Node Properties</h3>
                <div class="properties-box">
                    <p><b>Controls (Play):</b> <b>A/D</b> or <b>Left/Right Arrows</b> to move. <b>Space</b> or <b>W</b> to jump.</p>
                    <p><b>Editor Navigation:</b> Use <b>W, A, S, D</b> to scroll camera when area exceeds screen bounds.</p>
                </div>
                <button class="btn" id="btn-exit" style="background:linear-gradient(135deg, #dc3545, #9c1525); box-shadow:none; margin-top:auto;">Disconnect Loom</button>
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

    const colorPicker = document.getElementById('tile-color-picker');
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => { customTileColor = e.target.value; });
    }

    document.getElementById('btn-play').addEventListener('click', toggleRuntimeMode);
    document.getElementById('btn-export').addEventListener('click', compileProjectJSON);
    document.getElementById('btn-exit').addEventListener('click', () => navigate('/dashboard/projects/'));
}

function switchEditorTab(tab) {
    editorTab = tab;
    const currentPath = window.location.pathname;
    const projectId = currentPath.split('/').pop();
    renderEditorPage(document.getElementById('app-view'), projectId);
    initEditorEngine();
}

function resizeGridArea(action) {
    if (action === 'expand-right') gridWidth += 256;
    if (action === 'expand-down') gridHeight += 256;
    if (action === 'shrink') { gridWidth = 512; gridHeight = 384; }
    const currentPath = window.location.pathname;
    const projectId = currentPath.split('/').pop();
    renderEditorPage(document.getElementById('app-view'), projectId);
    initEditorEngine();
}

// --- CANVAS ENGINE & PLATFORMER PHYSICS ---
let runtimePlayer = { x: 32, y: 32, vx: 0, vy: 0, grounded: false, spawnX: 32, spawnY: 32 };

function initEditorEngine() {
    canvas = document.getElementById('engineCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.addEventListener('mousedown', executeGridDraw);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    drawViewport();
}

function handleKeyDown(e) { keys[e.key] = true; }
function handleKeyUp(e) { keys[e.key] = false; }

function executeGridDraw(e) {
    if (gameState.isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left + editorCamera.x) / GRID_SIZE) * GRID_SIZE;
    const y = Math.floor((e.clientY - rect.top + editorCamera.y) / GRID_SIZE) * GRID_SIZE;

    gameState.entities = gameState.entities.filter(ent => ent.x !== x || ent.y !== y);

    if (gameState.selectedTool !== 'erase') {
        if (gameState.selectedTool === 'player') {
            gameState.entities = gameState.entities.filter(ent => ent.type !== 'player');
        }
        gameState.entities.push({ type: gameState.selectedTool, x: x, y: y, color: customTileColor });
    }
    drawViewport();
}

function drawViewport() {
    ctx.fillStyle = '#0c0c10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-editorCamera.x, -editorCamera.y);

    if (!gameState.isPlaying) {
        ctx.strokeStyle = '#181822';
        ctx.lineWidth = 1;
        for (let x = 0; x < gridWidth; x += GRID_SIZE) {
            for (let y = 0; y < gridHeight; y += GRID_SIZE) {
                ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
            }
        }
    }

    gameState.entities.forEach(ent => {
        if (ent.type === 'block') {
            ctx.fillStyle = ent.color || '#1e1e2a';
            ctx.fillRect(ent.x, ent.y, GRID_SIZE, GRID_SIZE);
            ctx.strokeStyle = '#33334c';
            ctx.strokeRect(ent.x, ent.y, GRID_SIZE, GRID_SIZE);
        } else if (ent.type === 'ice-block') {
            ctx.fillStyle = '#a0e0ff';
            ctx.fillRect(ent.x, ent.y, GRID_SIZE, GRID_SIZE);
        } else if (ent.type === 'jump-pad') {
            ctx.fillStyle = '#00ff66';
            ctx.fillRect(ent.x, ent.y + 24, GRID_SIZE, 8);
        } else if (ent.type === 'coin') {
            ctx.fillStyle = '#00e5ff';
            ctx.beginPath();
            ctx.arc(ent.x + GRID_SIZE/2, ent.y + GRID_SIZE/2, 6, 0, Math.PI * 2);
            ctx.fill();
        } else if (ent.type === 'spike') {
            ctx.fillStyle = '#ff3366';
            ctx.beginPath();
            ctx.moveTo(ent.x + GRID_SIZE/2, ent.y + 4);
            ctx.lineTo(ent.x + 4, ent.y + GRID_SIZE - 4);
            ctx.lineTo(ent.x + GRID_SIZE - 4, ent.y + GRID_SIZE - 4);
            ctx.closePath();
            ctx.fill();
        } else if (ent.type === 'sawblade') {
            ctx.fillStyle = '#ff9900';
            ctx.beginPath();
            ctx.arc(ent.x + GRID_SIZE/2, ent.y + GRID_SIZE/2, 12, 0, Math.PI * 2);
            ctx.fill();
        } else if (ent.type === 'player' && !gameState.isPlaying) {
            ctx.fillStyle = '#7000ff';
            ctx.fillRect(ent.x + 6, ent.y + 6, GRID_SIZE - 12, GRID_SIZE - 12);
        }
    });

    if (gameState.isPlaying) {
        processPlatformerPhysics();

        ctx.fillStyle = '#7000ff';
        ctx.fillRect(runtimePlayer.x + 6, runtimePlayer.y + 6, GRID_SIZE - 12, GRID_SIZE - 12);
        ctx.strokeStyle = '#00e5ff';
        ctx.strokeRect(runtimePlayer.x + 6, runtimePlayer.y + 6, GRID_SIZE - 12, GRID_SIZE - 12);

        editorCamera.x = runtimePlayer.x - canvas.width / 2 + GRID_SIZE / 2;
        editorCamera.y = runtimePlayer.y - canvas.height / 2 + GRID_SIZE / 2;
        editorCamera.x = Math.max(0, Math.min(editorCamera.x, gridWidth - canvas.width));
        editorCamera.y = Math.max(0, Math.min(editorCamera.y, gridHeight - canvas.height));

        animationFrameId = requestAnimationFrame(drawViewport);
    } else {
        if (keys['d'] || keys['D']) editorCamera.x += 5;
        if (keys['a'] || keys['A']) editorCamera.x -= 5;
        if (keys['s'] || keys['S']) editorCamera.y += 5;
        if (keys['w'] || keys['W']) editorCamera.y -= 5;
        editorCamera.x = Math.max(0, Math.min(editorCamera.x, gridWidth - canvas.width));
        editorCamera.y = Math.max(0, Math.min(editorCamera.y, gridHeight - canvas.height));
        
        animationFrameId = requestAnimationFrame(drawViewport);
    }

    ctx.restore();
}

function toggleRuntimeMode() {
    const playBtn = document.getElementById('btn-play');
    if (!gameState.isPlaying) {
        const spawnPoint = gameState.entities.find(e => e.type === 'player');
        runtimePlayer.spawnX = spawnPoint ? spawnPoint.x : 32;
        runtimePlayer.spawnY = spawnPoint ? spawnPoint.y : 32;
        runtimePlayer.x = runtimePlayer.spawnX;
        runtimePlayer.y = runtimePlayer.spawnY;
        runtimePlayer.vx = 0;
        runtimePlayer.vy = 0;
        runtimePlayer.grounded = false;

        gameState.isPlaying = true;
        playBtn.innerText = '⏹️ Stop Loop';
        playBtn.style.background = '#ff3366';
    } else {
        gameState.isPlaying = false;
        playBtn.innerText = '▶️ Run Grid';
        playBtn.style.background = '#28a745';
        cancelAnimationFrame(animationFrameId);
    }
    drawViewport();
}

function processPlatformerPhysics() {
    let moveSpeed = 4;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) runtimePlayer.vx = moveSpeed;
    else if (keys['ArrowLeft'] || keys['a'] || keys['A']) runtimePlayer.vx = -moveSpeed;
    else runtimePlayer.vx *= 0.8;

    runtimePlayer.vy += 0.5;

    if ((keys[' '] || keys['w'] || keys['W'] || keys['ArrowUp']) && runtimePlayer.grounded) {
        runtimePlayer.vy = -10;
        runtimePlayer.grounded = false;
    }

    runtimePlayer.x += runtimePlayer.vx;
    gameState.entities.forEach(ent => {
        if (ent.type === 'block' || ent.type === 'ice-block') {
            if (runtimePlayer.x + 6 < ent.x + GRID_SIZE && runtimePlayer.x + GRID_SIZE - 6 > ent.x &&
                runtimePlayer.y + 6 < ent.y + GRID_SIZE && runtimePlayer.y + GRID_SIZE - 6 > ent.y) {
                if (runtimePlayer.vx > 0) runtimePlayer.x = ent.x - (GRID_SIZE - 6);
                else if (runtimePlayer.vx < 0) runtimePlayer.x = ent.x + GRID_SIZE - 6;
                runtimePlayer.vx = 0;
            }
        }
    });

    runtimePlayer.grounded = false;
    runtimePlayer.y += runtimePlayer.vy;
    gameState.entities.forEach(ent => {
        if (ent.type === 'block' || ent.type === 'ice-block') {
            if (runtimePlayer.x + 6 < ent.x + GRID_SIZE && runtimePlayer.x + GRID_SIZE - 6 > ent.x &&
                runtimePlayer.y + 6 < ent.y + GRID_SIZE && runtimePlayer.y + GRID_SIZE - 6 > ent.y) {
                if (runtimePlayer.vy > 0) {
                    runtimePlayer.y = ent.y - (GRID_SIZE - 6);
                    runtimePlayer.vy = 0;
                    runtimePlayer.grounded = true;
                } else if (runtimePlayer.vy < 0) {
                    runtimePlayer.y = ent.y + GRID_SIZE - 6;
                    runtimePlayer.vy = 0;
                }
            }
        } else if (ent.type === 'jump-pad') {
            if (runtimePlayer.x + 6 < ent.x + GRID_SIZE && runtimePlayer.x + GRID_SIZE - 6 > ent.x &&
                runtimePlayer.y + GRID_SIZE - 6 >= ent.y && runtimePlayer.y <= ent.y + GRID_SIZE) {
                runtimePlayer.vy = -15;
            }
        } else if (ent.type === 'spike' || ent.type === 'sawblade') {
            const dist = Math.hypot(runtimePlayer.x - ent.x, runtimePlayer.y - ent.y);
            if (dist < 16) {
                runtimePlayer.x = runtimePlayer.spawnX;
                runtimePlayer.y = runtimePlayer.spawnY;
                runtimePlayer.vx = 0;
                runtimePlayer.vy = 0;
            }
        }
    });

    if (runtimePlayer.x < 0) runtimePlayer.x = 0;
    if (runtimePlayer.x > gridWidth - GRID_SIZE) runtimePlayer.x = gridWidth - GRID_SIZE;
    if (runtimePlayer.y > gridHeight) {
        runtimePlayer.x = runtimePlayer.spawnX;
        runtimePlayer.y = runtimePlayer.spawnY;
        runtimePlayer.vy = 0;
    }
}

function compileProjectJSON() {
    const projectStructureOutput = {
        loomMetadata: {
            engineIdentifier: "AetherWeave-V1",
            compiledTimestamp: new Date().toISOString(),
            canvasMatrix: { windowWidth: gridWidth, windowHeight: gridHeight, nodeGridStride: GRID_SIZE }
        },
        entitiesMatrix: gameState.entities
    };

    const dataBufferStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectStructureOutput, null, 2));
    const trackingAnchorNode = document.createElement('a');
    trackingAnchorNode.setAttribute("href", dataBufferStr);
    trackingAnchorNode.setAttribute("download", "aetherweave-project.json");
    document.body.appendChild(trackingAnchorNode);
    trackingAnchorNode.click();
    trackingAnchorNode.remove();
}
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
function renderBrowseTab(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:15px; flex-wrap:wrap;">
            <input type="text" id="browse-search-input" placeholder="🔍 Search games..." style="flex:1; max-width:400px; padding:10px 15px; background:#1a1a24; border:1px solid var(--border-glow); border-radius:8px; color:#fff; outline:none;">
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
        if (query) projects = projects.filter(p => p.name && p.name.toLowerCase().includes(query));
        
        grid.innerHTML = projects.map(proj => `
            <div class="project-card">
                <div style="font-weight:bold; font-size:1.2rem; color:var(--aether-cyan);">🎮 ${proj.name}</div>
                <div class="card-meta"><span>By: ${proj.author || 'Anonymous'}</span></div>
                <button class="btn" onclick="navigate('/dashboard/${proj.id}/edit')" style="width:100%; padding:8px; margin-top:auto; background:var(--aether-purple); box-shadow:none;">Launch</button>
            </div>
        `).join('');
    });
}

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
        let html = '';
        snapshot.forEach(doc => {
            const proj = doc.data();
            html += `
                <div class="project-card" style="border-left: 4px solid var(--aether-cyan);">
                    <div style="font-weight:bold; font-size:1.3rem;">${proj.name}</div>
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
// --- DASHBOARD PROJECT SUB-VIEWS (Edit, Settings, Analytics) ---
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

// --- TAB 3: COMMUNITY FEED (My Feed, Featured, Global + Rating/Follow) ---
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
                    <button class="btn" onclick="alert('Followed!')" style="padding:4px 10px; font-size:0.75rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">+ Follow</button>
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
    const score = prompt("Rate this game from 1 to 5 stars:");
    if (score && !isNaN(score)) {
        db.collection('projects').doc(projId).update({ rating: parseFloat(score).toFixed(1) });
        alert("Thank you for rating!");
    }
}
// --- TAB 4: NOTIFICATIONS & MESSAGING SYSTEM ---
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
                    <button class="btn" onclick="alert('Message sent!')">Send</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('chat-user-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) return;
        db.collection('users').get().then(snapshot => {
            const list = document.getElementById('chat-user-results');
            if (!list) return;
            list.innerHTML = '';
            snapshot.forEach(doc => {
                const u = doc.data();
                if (u.email && u.email.toLowerCase().includes(query)) {
                    const row = document.createElement('div');
                    row.className = 'tool-item';
                    row.style.cssText = "padding:8px; margin-bottom:5px; cursor:pointer;";
                    row.innerText = u.username || u.email;
                    row.onclick = () => { document.getElementById('chat-header-title').innerText = "Chat with " + (u.username || u.email); };
                    list.appendChild(row);
                }
            });
        });
    });
}

// --- TAB 5: USER PROFILE & DRAG/DROP AVATAR ---
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