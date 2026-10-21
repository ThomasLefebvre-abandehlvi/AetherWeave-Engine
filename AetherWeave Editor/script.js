// --- FIREBASE SECURITY REGISTRY ---
const firebaseConfig = {
  apiKey: "AIzaSyAt1zpo19sS0Fm8wMrBcGJwbHpHMIhFag0",
  authDomain: "://firebaseapp.com",
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

// --- SECURE ROUTER INTERCEPTOR ---
// --- UPDATED SECURE ROUTER INTERCEPTOR ---
function router() {
    gameState.currentPath = window.location.pathname;
    const app = document.getElementById('app-view');
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    // 1. CHECK FOR 404 PATHS FIRST
    // If the path isn't home and doesn't start with a project workspace, it's a 404 error!
    if (gameState.currentPath !== '/' && gameState.currentPath !== '' && !gameState.currentPath.startsWith('/new/')) {
        render404Page(app);
        return;
    }

    // 2. CHECK FOR LOGIN VALIDATION SECOND
    // If they are on a valid path but logged out, redirect them to the sign-up page
    if (!currentUser) {
        renderAdvertisementPage(app);
        return;
    }

    // 3. CORE REGISTERED APPLICATION VIEWS
    if (gameState.currentPath === '/' || gameState.currentPath === '') {
        renderHomePage(app);
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
        <img src="aetherweave.jpg" alt="AetherWeave Logo" style="width:120px; height:120px; object-fit:contain; margin-bottom:20px;">
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
// --- NEW ADVERTISEMENT & AUTHENTICATION RENDERING FLOW ---
function renderAdvertisementPage(container) {
    container.innerHTML = `
        <div class="auth-wrapper">
            <div class="ad-side">
                <h2>AetherWeave</h2>
                <div class="quote-box">
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
                    
                    <button class="btn" id="btn-auth-submit" style="width:100%; margin-top:10px;">
                        ${isSignUpView ? 'Weave New Account' : 'Log In to Loom'}
                    </button>
                    
                    <button class="btn" id="btn-google-auth" style="width:100%; margin-top:10px; background:#ffffff; color:#121214; box-shadow:none; display:flex; align-items:center; justify-content:center; gap:10px; border:1px solid #222230;">
                        <img src="google.jpg" alt="Google Logo" style="width:18px; height:18px; object-fit:contain;">
                        <b>Continue with Google</b>
                    </button>
                    
                    <div class="auth-toggle-link" id="auth-toggle" style="margin-top:20px; text-align:center;">
                        ${isSignUpView ? 'Have an Account? Log in!' : 'New to AetherWeave? Sign up here!'}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Re-bind listeners immediately after drawing elements
    document.getElementById('auth-toggle').addEventListener('click', () => {
        isSignUpView = !isSignUpView;
        renderAdvertisementPage(container);
    });
    
    document.getElementById('btn-auth-submit').addEventListener('click', executeEmailAuthAction);
    document.getElementById('btn-google-auth').addEventListener('click', executeGoogleAuthAction);
}

function executeEmailAuthAction() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
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
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((cred) => {
        return db.collection('users').doc(cred.user.uid).set({
            uid: cred.user.uid,
            email: cred.user.email,
            registeredAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }).catch(err => alert("Google Sign-In Error: " + err.message));
}

function renderAdminDashboardPage(container) {
    container.innerHTML = `
        <div class="admin-layout">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:20px;">
                <h1 class="brand-logo" style="font-size:2.5rem; margin:0;">Loom Administration</h1>
                <button class="btn" id="btn-admin-back">← Back to Engine</button>
            </div>
            <p style="margin-top:20px;">Secure overview of users synced through your cloud Firestore datastore clusters.</p>
            <div class="admin-grid" id="admin-user-list"><p style="color:#8e8ea0;">Retrieving active databases...</p></div>
        </div>
    `;
    document.getElementById('btn-admin-back').addEventListener('click', () => navigate('/'));

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

function executeGoogleAuthAction() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((cred) => {
        return db.collection('users').doc(cred.user.uid).set({
            uid: cred.user.uid,
            email: cred.user.email,
            registeredAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }).catch(err => alert("Google Sign-In Error: " + err.message));
}

function renderAdminDashboardPage(container) {
    container.innerHTML = `
        <div class="admin-layout">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:20px;">
                <h1 class="brand-logo" style="font-size:2.5rem; margin:0;">Loom Administration</h1>
                <button class="btn" id="btn-admin-back">← Back to Engine</button>
            </div>
            <p style="margin-top:20px;">Secure overview of users synced through your cloud Firestore datastore clusters.</p>
            <div class="admin-grid" id="admin-user-list"><p style="color:#8e8ea0;">Retrieving active databases...</p></div>
        </div>
    `;
    document.getElementById('btn-admin-back').addEventListener('click', () => navigate('/'));

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
