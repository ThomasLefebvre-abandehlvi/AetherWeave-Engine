const firebaseConfig = {
  apiKey: "AIzaSyAt1zpo19sS0Fm8wMrBcGJwbHpHMIhFag0",
  authDomain: "aetherweave-edtor.firebaseapp.com", // Fixed: Added project name prefix
  projectId: "aetherweave-edtor",
  storageBucket: "aetherweave-edtor.firebasestorage.app",
  messagingSenderId: "967617394273",
  appId: "1:967617394273:web:f2a797386334f283badc20"
};

// Global variables declared cleanly out in the open
let auth;
let db;
let currentUser = null;
let isSignUpView = true;

// SAFETY INTERCEPT: Wait until the browser DOM structure is 100% built before setting up Firebase
window.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();

        // Safe continuous authentication listener check
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
    selectedTool: 'block', // 'player', 'block', 'coin', 'spike', 'erase'
    isPlaying: false,
    entities: [] 
};

// Canvas Engine References
let canvas, ctx, animationFrameId;
const GRID_SIZE = 32;
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 384;

// Play-Mode Physics Properties
let runtimePlayer = { x: 0, y: 0, vx: 0, vy: 0, spawnX: 0, spawnY: 0 };
let keys = {};

// --- DYNAMIC DISCOVERY DATABASE STATES ---
let dashboardActiveTab = 'feed'; // Tracks 'feed' or 'my-projects' layout profiles
let localProjectsMemory = [
    { id: 'proj-8912', name: 'Aether Runner', author: ' ThomasLefebvre', timestamp: 'Just Now', description: 'Test physics simulator grids.' }
];

// --- SECURE ROUTER INTERCEPTOR ---
function router() {
    gameState.currentPath = window.location.pathname;
    const app = document.getElementById('app-view');
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    // 1. HIGH-PRIORITY INTERCEPT: Handshake Authorization Page Bridge 
    if (gameState.currentPath === '/google-sign-in') {
        renderGoogleHandshakePage(app);
        return;
    }

    // 2. CHECK FOR 404 PATHS FIRST
    if (gameState.currentPath !== '/' && gameState.currentPath !== '' && !gameState.currentPath.startsWith('/new/') && gameState.currentPath !== '/admin') {
        render404Page(app);
        return;
    }

    // 3. CHECK FOR LOGIN VALIDATION SECOND
    if (!currentUser) {
        renderAdvertisementPage(app);
        return;
    }

    // 4. CORE REGISTERED HUB ROUTING CHANNELS
    if (gameState.currentPath === '/' || gameState.currentPath === '') {
        renderPlatformDashboardPage(app);
    } else if (gameState.currentPath === '/admin') {
        if (isAdmin(currentUser.email)) {
            renderAdminDashboardPage(app);
        } else {
            navigate('/');
        }
    } else if (gameState.currentPath.startsWith('/new/')) {
        const projectId = gameState.currentPath.split('/new/');
        renderEditorPage(app, projectId);
        initEditorEngine();
    }
}


function isAdmin(email) {
    if (!email) return false;
    const target = email.toLowerCase().trim();
    return target === 'abandehlvi542@gmail.com' || target === 'lyrabelrose5@gmail.com';
}


function renderHomePage(container) {
    let adminButtonSnippet = "";
    
    if (isAdmin(currentUser.email)) {
        adminButtonSnippet = `<button class="btn admin-btn" id="btn-admin-panel" style="margin-left:15px;">🛡️ Admin Dashboard</button>`;
    }

    container.innerHTML = `
        <div class="home-container">
            <h1 class="brand-logo">AetherWeave</h1>
            <p>Woven Profile Account Active: <b>${currentUser.email}</b></p>
            <p>An elegant, web-native 2D grid builder. Weave your tiles, simulate your game loop instantly, and compile code arrays.</p>
            <div style="display:flex; justify-content:center; align-items:center;">
                <button class="btn" id="btn-create">Weave New Workspace</button>
                ${adminButtonSnippet}
            </div>
            <p id="btn-logout" style="margin-top:30px; text-decoration:underline; cursor:pointer; font-size:0.9rem; color:#8e8ea0;">Sign Out of Account</p>
        </div>
    `;

    document.getElementById('btn-create').addEventListener('click', () => {
        const randomId = Math.floor(1000 + Math.random() * 9000);
        navigate(`/new/project-${randomId}`);
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        auth.signOut().then(() => navigate('/'));
    });

    if (isAdmin(currentUser.email)) {
        document.getElementById('btn-admin-panel').addEventListener('click', () => {
            navigate('/admin');
        });
    }
}


function renderEditorPage(container, id) {
    container.innerHTML = `
        <div class="editor-layout">
            <!-- Left Panel: Matrix Palette -->
            <div class="panel panel-left">
                <h3>Weave Palette</h3>
                <div class="tool-list">
                    <button class="tool-item active" data-tool="block">🧱 Solid Block</button>
                    <button class="tool-item" data-tool="player">🕹️ Player Spawn</button>
                    <button class="tool-item" data-tool="coin">🟡 Core Coin</button>
                    <button class="tool-item" data-tool="spike">🔺 Hazard Spike</button>
                    <button class="tool-item" data-tool="erase">❌ Thread Eraser</button>
                </div>
            </div>

            <!-- Center Panel: Live Viewport Grid -->
            <div class="canvas-area">
                <div class="canvas-toolbar">
                    <span class="project-title">${decodeURIComponent(id).toUpperCase()}</span>
                    <div>
                        <button class="btn" id="btn-play" style="padding: 8px 16px; font-size:0.85rem; margin:0; background:#28a745; box-shadow:none;">▶️ Run Grid</button>
                        <button class="btn" id="btn-export" style="padding: 8px 16px; font-size:0.85rem; margin:0; background:#007bff; box-shadow:none;">💾 Export Code</button>
                    </div>
                </div>
                <div class="canvas-container">
                    <canvas id="engineCanvas" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></canvas>
                </div>
            </div>

            <!-- Right Panel: Matrix Properties -->
            <div class="panel panel-right">
                <h3>Node Properties</h3>
                <div class="properties-box">
                    <p><b>Left Click:</b> Weave selected tile into alignment coordinate grid.</p>
                    <p><b>Controls:</b> Move active runner using <b>W, A, S, D</b> or <b>Arrow Keys</b>.</p>
                </div>
                <hr style="border:0; border-top:1px solid var(--border-glow); width:100%; margin:10px 0;">
                <button class="btn" id="btn-exit" style="background:linear-gradient(135deg, #dc3545, #9c1525); box-shadow:none; margin-top:auto;">Disconnect Loom</button>
            </div>
        </div>
    `;

    // Hook tool selection logic
    document.querySelectorAll('.tool-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tool-item').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            gameState.selectedTool = e.target.getAttribute('data-tool');
        });
    });

    document.getElementById('btn-play').addEventListener('click', toggleRuntimeMode);
    document.getElementById('btn-export').addEventListener('click', compileProjectJSON);
    document.getElementById('btn-exit').addEventListener('click', () => navigate('/'));
}

// --- UPDATED BRANDED ERROR 404 SCREEN ---
function render404Page(container) {
    container.innerHTML = `
        <div class="home-container" style="background: radial-gradient(circle at center, #1b0a1a 0%, var(--bg-space) 80%);">
            
            <!-- Branded Broken Loom Graphical Wrapper -->
            <div style="position: relative; max-width: 450px; margin-bottom: 20px;">
                <img src="404notfound.jpg" alt="Thread Severed - 404 Not Found" style="width: 100%; border-radius: 12px; border: 1px solid var(--border-glow); box-shadow: 0 10px 30px rgba(255, 51, 102, 0.15); max-height: 450px; object-fit: cover;">
            </div>

            <p style="color: var(--text-thread); font-size: 1.1rem; max-width: 400px; line-height: 1.4; margin-bottom: 24px;">
                The connection matrix to this specific path has been frayed or deleted from our grid datastore loom.
            </p>

            <button class="btn" onclick="navigate('/')">Return to Safe Loom</button>
        </div>
    `;
}


// --- EDITOR RENDERING LOOPS ---
function initEditorEngine() {
    canvas = document.getElementById('engineCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // Attach interaction mapping listeners
    canvas.addEventListener('mousedown', executeGridDraw);
    
    // Global inputs listeners 
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initial draft view drawing pass
    drawViewport();
}

function handleKeyDown(e) { keys[e.key] = true; }
function handleKeyUp(e) { keys[e.key] = false; }

function executeGridDraw(e) {
    if (gameState.isPlaying) return; 

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / GRID_SIZE) * GRID_SIZE;
    const y = Math.floor((e.clientY - rect.top) / GRID_SIZE) * GRID_SIZE;

    // Filter array to strip existing structural components at node address
    gameState.entities = gameState.entities.filter(ent => ent.x !== x || ent.y !== y);

    if (gameState.selectedTool !== 'erase') {
        // Enforce single-player setup rule
        if (gameState.selectedTool === 'player') {
            gameState.entities = gameState.entities.filter(ent => ent.type !== 'player');
        }
        gameState.entities.push({ type: gameState.selectedTool, x: x, y: y });
    }
    drawViewport();
}

function drawViewport() {
    // Clear canvas
    ctx.fillStyle = '#0c0c10';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid background (only during editing mode)
    if (!gameState.isPlaying) {
        ctx.strokeStyle = '#181822';
        ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += GRID_SIZE) {
            for (let y = 0; y < CANVAS_HEIGHT; y += GRID_SIZE) {
                ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
            }
        }
    }

    // Render all elements in our array list
    gameState.entities.forEach(ent => {
        if (ent.type === 'block') {
            ctx.fillStyle = '#1e1e2a';
            ctx.fillRect(ent.x, ent.y, GRID_SIZE, GRID_SIZE);
            ctx.strokeStyle = '#33334c';
            ctx.lineWidth = 2;
            ctx.strokeRect(ent.x, ent.y, GRID_SIZE, GRID_SIZE);
        } else if (ent.type === 'coin') {
            ctx.fillStyle = '#00e5ff';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = gameState.isPlaying ? 8 : 0;
            ctx.beginPath();
            ctx.arc(ent.x + GRID_SIZE/2, ent.y + GRID_SIZE/2, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset
        } else if (ent.type === 'spike') {
            ctx.fillStyle = '#ff3366';
            ctx.beginPath();
            ctx.moveTo(ent.x + GRID_SIZE/2, ent.y + 4);
            ctx.lineTo(ent.x + 4, ent.y + GRID_SIZE - 4);
            ctx.lineTo(ent.x + GRID_SIZE - 4, ent.y + GRID_SIZE - 4);
            ctx.closePath();
            ctx.fill();
        } else if (ent.type === 'player' && !gameState.isPlaying) {
            ctx.fillStyle = '#7000ff';
            ctx.fillRect(ent.x + 6, ent.y + 6, GRID_SIZE - 12, GRID_SIZE - 12);
            ctx.strokeStyle = '#00e5ff';
            ctx.strokeRect(ent.x + 6, ent.y + 6, GRID_SIZE - 12, GRID_SIZE - 12);
        }
    });

    // Run active game runtime loop sequences
    if (gameState.isPlaying) {
        processPhysicsUpdate();
        
        ctx.fillStyle = '#7000ff';
        ctx.shadowColor = '#7000ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(runtimePlayer.x + 6, runtimePlayer.y + 6, GRID_SIZE - 12, GRID_SIZE - 12);
        ctx.strokeStyle = '#00e5ff';
        ctx.strokeRect(runtimePlayer.x + 6, runtimePlayer.y + 6, GRID_SIZE - 12, GRID_SIZE - 12);
        ctx.shadowBlur = 0; // reset

        animationFrameId = requestAnimationFrame(drawViewport);
    }
}

// --- ACTIVE EMULATOR PLAY SYSTEMS ---
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

        gameState.isPlaying = true;
        playBtn.innerText = '⏹️ Stop Loop';
        playBtn.style.background = '#ff3366';
        drawViewport();
    } else {
        gameState.isPlaying = false;
        playBtn.innerText = '▶️ Run Grid';
        playBtn.style.background = '#28a745';
        cancelAnimationFrame(animationFrameId);
        drawViewport();
    }
}

function processPhysicsUpdate() {
    // Process input velocity adjustments
    if (keys['ArrowRight'] || keys['d']) runtimePlayer.vx = 4;
    else if (keys['ArrowLeft'] || keys['a']) runtimePlayer.vx = -4;
    else runtimePlayer.vx = 0;

    if (keys['ArrowDown'] || keys['s']) runtimePlayer.vy = 4;
    else if (keys['ArrowUp'] || keys['w']) runtimePlayer.vy = -4;
    else runtimePlayer.vy = 0;

    // Boundary check overrides before movement step runs
    let targetX = runtimePlayer.x + runtimePlayer.vx;
    let targetY = runtimePlayer.y + runtimePlayer.vy;

    // Basic solid collision handling logic
    let collisionX = false;
    let collisionY = false;

    gameState.entities.forEach(ent => {
        if (ent.type === 'block') {
            // Check bounding boxes overlap
            if (targetX + 6 < ent.x + GRID_SIZE && targetX + GRID_SIZE - 6 > ent.x &&
                runtimePlayer.y + 6 < ent.y + GRID_SIZE && runtimePlayer.y + GRID_SIZE - 6 > ent.y) {
                collisionX = true;
            }
            if (runtimePlayer.x + 6 < ent.x + GRID_SIZE && runtimePlayer.x + GRID_SIZE - 6 > ent.x &&
                targetY + 6 < ent.y + GRID_SIZE && targetY + GRID_SIZE - 6 > ent.y) {
                collisionY = true;
            }
        }
    });

    if (!collisionX) runtimePlayer.x = targetX;
    if (!collisionY) runtimePlayer.y = targetY;

    // Canvas boundary clamps
    if (runtimePlayer.x < 0) runtimePlayer.x = 0;
    if (runtimePlayer.x > CANVAS_WIDTH - GRID_SIZE) runtimePlayer.x = CANVAS_WIDTH - GRID_SIZE;
    if (runtimePlayer.y < 0) runtimePlayer.y = 0;
    if (runtimePlayer.y > CANVAS_HEIGHT - GRID_SIZE) runtimePlayer.y = CANVAS_HEIGHT - GRID_SIZE;

    // Dynamic item overlap detection queries
    gameState.entities = gameState.entities.filter(ent => {
        if (ent.type === 'coin') {
            const distance = Math.hypot((runtimePlayer.x - ent.x), (runtimePlayer.y - ent.y));
            return distance > 18; // Drop from list array if collection threshold crossed
        }
        if (ent.type === 'spike') {
            const distance = Math.hypot((runtimePlayer.x - ent.x), (runtimePlayer.y - ent.y));
            if (distance < 16) {
                // Instantly respawn if hit hazard tile
                runtimePlayer.x = runtimePlayer.spawnX;
                runtimePlayer.y = runtimePlayer.spawnY;
                runtimePlayer.vx = 0;
                runtimePlayer.vy = 0;
            }
        }
        return true;
    });
}

// --- STRUCTURAL DATA COMPILER ---
function compileProjectJSON() {
    const projectStructureOutput = {
        loomMetadata: {
            engineIdentifier: "AetherWeave-V1",
            compiledTimestamp: new Date().toISOString(),
            canvasMatrix: { windowWidth: CANVAS_WIDTH, windowHeight: CANVAS_HEIGHT, nodeGridStride: GRID_SIZE }
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

// --- APP ROUTING CONTROLLER UTILITIES ---
function navigate(url) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Keeps local machine preview tabs stable without folder hunting crashes
        window.history.pushState({}, '', '/index.html');
        router();
    } else {
        // Keeps clean web path extensions working flawlessly on live Netlify cloud servers
        window.history.pushState({}, '', url);
        router();
    }
}
window.addEventListener('popstate', router);
window.addEventListener('DOMContentLoaded', router);
// --- UNBREAKABLE ADVERTISEMENT PAGE WITH EMBEDDED BRAND LOGO GRAPHIC ---
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

// Toggle between Sign Up & Log In view states
function toggleAuthSubView() {
    isSignUpView = !isSignUpView;
    const app = document.getElementById('app-view');
    renderAdvertisementPage(app);
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

// =========================================================================
// 1. INTERACTIVE GOOGLE HANDSHAKE PORTAL SCREEN (WITH BACK BUTTON)
// =========================================================================
function renderGoogleHandshakePage(container) {
    container.innerHTML = `
        <div class="handshake-container" style="position: relative;">
            <!-- BACK BUTTON -->
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
            
            <footer style="position:absolute; bottom:40px; font-family:monospace; letter-spacing:1px; color:var(--aether-cyan); text-shadow: 0 0 10px var(--aether-cyan-glow);">
                Connecting to Google...
            </footer>
        </div>
    `;

    // Attach Back Button Click Event
    document.getElementById('btn-handshake-back').addEventListener('click', () => {
        navigate('/');
    });

    // Initialize Google Pop-up window authentication actions
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((cred) => {
        return db.collection('users').doc(cred.user.uid).set({
            uid: cred.user.uid,
            email: cred.user.email,
            registeredAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(() => {
            const statusEl = document.getElementById('handshake-status');
            if (statusEl) statusEl.innerText = "Security verified! Redirecting to dashboard loom...";
            setTimeout(() => navigate('/'), 1200);
        });
    }).catch(err => {
        // Only alert if the user didn't intentionally close the popup or press back
        if (err.code !== 'auth/popup-closed-by-user') {
            alert("Google Authentication Intercept Error: " + err.message);
        }
        navigate('/');
    });
}
// Redirect trigger for your ad screen button layout
function executeGoogleAuthAction() {
    navigate('/google-sign-in');
}

// =========================================================================
// 2. MULTI-TAB DISCOVERY CORE DASHBOARD SYSTEM
// =========================================================================
function renderPlatformDashboardPage(container) {
    let adminNavSnippet = isAdmin(currentUser.email) ? `<button class="tab-btn" onclick="navigate('/admin')">🛡️ Admin</button>` : '';

    container.innerHTML = `
        <div class="dashboard-wrapper">
            <!-- Global Platform Navigation Header -->
            <nav class="dashboard-nav">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="aetherweave.jpg" style="width:32px; height:32px; border-radius:6px;" alt="Loom Logo">
                    <span class="project-title" style="font-size:1.3rem;">AetherWeave</span>
                </div>
                <div class="nav-tabs">
                    <button class="tab-btn ${dashboardActiveTab === 'feed' ? 'active' : ''}" onclick="switchDashboardTab('feed')">🌍 Global Feed</button>
                    <button class="tab-btn ${dashboardActiveTab === 'my-projects' ? 'active' : ''}" onclick="switchDashboardTab('my-projects')">📂 My Projects</button>
                    ${adminNavSnippet}
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span style="font-size:0.85rem; color:var(--text-thread);">Active: <b>${currentUser.email}</b></span>
                    <button class="btn" onclick="auth.signOut()" style="padding:8px 16px; font-size:0.8rem; background:#dc3545; box-shadow:none;">Sign Out</button>
                </div>
            </nav>

            <!-- Dynamic Viewport Injection Workspace -->
            <div class="dashboard-content" id="dashboard-tab-view"></div>
        </div>
    `;

    renderActiveTabContent();
}

function switchDashboardTab(tabId) {
    dashboardActiveTab = tabId;
    renderPlatformDashboardPage(document.getElementById('app-view'));
}

function renderActiveTabContent() {
    const contentArea = document.getElementById('dashboard-tab-view');
    
    if (dashboardActiveTab === 'feed') {
        // GLOBAL COMMUNITY GAME DISCOVERY TILES
        contentArea.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:15px; margin-bottom:20px;">
                <h2 style="margin:0; font-size:1.8rem;">Global Project Loom</h2>
                <span style="color:var(--text-thread); font-size:0.9rem;">Auto-Sorted by Latest Creations</span>
            </div>
            <div class="project-card-grid">
                <!-- Sandbox Level Sample Tile -->
                <div class="project-card">
                    <div style="font-weight:bold; font-size:1.2rem; color:var(--aether-cyan);">🚀 Neon Labyrinth</div>
                    <div class="card-meta"><span>By: AlphaDev</span> <span>Oct 21, 2026</span></div>
                    <p style="color:var(--text-thread); font-size:0.9rem; margin:5px 0;">Test your reflex parameters across a dense grid coordinate array sequence layout.</p>
                    <button class="btn" onclick="navigate('/new/neon-labyrinth')" style="width:100%; padding:10px; font-size:0.85rem; margin-top:auto; background:var(--aether-purple); box-shadow:none;">▶️ Play Sandbox</button>
                </div>
                
                <!-- Dynamic Player Projects Synchronized Loop -->
                ${localProjectsMemory.map(proj => `
                    <div class="project-card">
                        <div style="font-weight:bold; font-size:1.2rem; color:var(--aether-cyan);">🎮 ${proj.name}</div>
                        <div class="card-meta"><span>By: ${proj.author}</span> <span>${proj.timestamp}</span></div>
                        <p style="color:var(--text-thread); font-size:0.9rem; margin:5px 0;">${proj.description}</p>
                        <button class="btn" onclick="navigate('/new/${proj.id}')" style="width:100%; padding:10px; font-size:0.85rem; margin-top:auto; background:var(--aether-purple); box-shadow:none;">▶️ Play Sandbox</button>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (dashboardActiveTab === 'my-projects') {
        // PERSONAL PROJECT REPOSITORY WITH ACTION TOOLBARS
        contentArea.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:15px; margin-bottom:20px;">
                <h2 style="margin:0; font-size:1.8rem;">My Development Repositories</h2>
                <button class="btn" onclick="promptCreateNewWorkspaceProject()" style="padding:10px 20px; font-size:0.9rem;">➕ Weave New Project</button>
            </div>
            
            <div class="project-card-grid">
                ${localProjectsMemory.map(proj => `
                    <div class="project-card" style="border-left: 4px solid var(--aether-cyan);">
                        <div style="font-weight:bold; font-size:1.3rem;">${proj.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-thread); font-family:monospace;">Workspace ID: ${proj.id}</div>
                        <hr style="border:0; border-top:1px solid var(--border-glow); width:100%; margin:10px 0;">
                        
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:auto;">
                            <button class="btn" onclick="navigate('/new/${proj.id}')" style="padding:8px; font-size:0.85rem; background:#28a745; box-shadow:none;">🛠️ Edit Matrix</button>
                            <button class="btn" onclick="renderProjectOverviewSettingsCard('${proj.id}')" style="padding:8px; font-size:0.85rem; background:#1a1a24; border:1px solid var(--border-glow); box-shadow:none;">⚙️ Settings</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// =========================================================================
// 3. INTERACTION FORM PROMPTS & SETTINGS MODAL PANELS
// =========================================================================
function promptCreateNewWorkspaceProject() {
    const nameInput = prompt("Enter a memorable name for your new AetherWeave project:");
    if (!nameInput || nameInput.trim() === "") return;

    const cleanId = "proj-" + Math.floor(1000 + Math.random() * 9000);
    const newRecord = {
        id: cleanId,
        name: nameInput.trim(),
        author: currentUser.email.split('@')[0],
        timestamp: "Just Now",
        description: "Custom user grid matrix configuration canvas blueprint."
    };

    localProjectsMemory.unshift(newRecord); // Prepend to sort by latest auto
    renderActiveTabContent();
}

function renderProjectOverviewSettingsCard(projectId) {
    const targetProject = localProjectsMemory.find(p => p.id === projectId);
    if (!targetProject) return;

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

    // Hook up the save event listener properly
    document.getElementById('btn-save-project-settings').addEventListener('click', () => {
        saveProjectMetadataChanges(projectId);
    });
}

function saveProjectMetadataChanges(projectId) {
    const targetProject = localProjectsMemory.find(p => p.id === projectId);
    if (targetProject) {
        targetProject.name = document.getElementById('edit-proj-name').value;
        targetProject.description = document.getElementById('edit-proj-desc').value;
    }
    switchDashboardTab('my-projects');
}