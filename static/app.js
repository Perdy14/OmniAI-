/**
 * OmniAI - Frontend Application
 * Con autenticación Google + sincronización PC/Móvil
 */

// ===== STATE =====
const state = {
    currentConversation: null,
    conversations: [],
    attachments: [],
    cameraStream: null,
    capturedImage: null,
    isLoading: false,
    ollamaConnected: false,
    availableModels: [],
    user: null,
    serverUrl: '', // URL del servidor (PC)
    isRemote: false // Si estamos conectados a un PC remoto
};

// ===== DOM ELEMENTS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== FIREBASE =====
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

async function initFirebase() {
    try {
        const response = await fetch('/api/firebase-config');
        const config = await response.json();

        firebaseApp = firebase.initializeApp(config);
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.database();

        // Escuchar cambios de autenticación
        firebaseAuth.onAuthStateChanged(handleAuthStateChanged);
    } catch (e) {
        console.log('Firebase no disponible, modo offline');
        // Si no hay Firebase, permitir uso sin cuenta
        showApp();
    }
}

function handleAuthStateChanged(user) {
    if (user) {
        state.user = {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photo: user.photoURL
        };
        showUserInfo();
        registerPC();
        showApp();
    }
}

async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebaseAuth.signInWithPopup(provider);
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            alert('Error al iniciar sesión: ' + error.message);
        }
    }
}

async function logout() {
    try {
        if (firebaseAuth) {
            await firebaseAuth.signOut();
        }
        state.user = null;
        hideUserInfo();
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

function registerPC() {
    // Registrar este PC en Firebase para que el móvil lo encuentre
    if (state.user && firebaseDb) {
        const pcRef = firebaseDb.ref(`users/${state.user.uid}/pc`);
        pcRef.set({
            online: true,
            lastSeen: Date.now(),
            url: window.location.origin
        });

        // Marcar como offline al cerrar
        pcRef.onDisconnect().update({
            online: false,
            lastSeen: Date.now()
        });

        // También registrar en el backend
        fetch('/api/relay/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.user.uid,
                email: state.user.email
            })
        });

        // Escuchar mensajes del móvil
        listenForMobileMessages();
    }
}

function listenForMobileMessages() {
    if (!state.user || !firebaseDb) return;

    const messagesRef = firebaseDb.ref(`users/${state.user.uid}/messages`);
    messagesRef.on('child_added', async (snapshot) => {
        const data = snapshot.val();
        if (data && data.from === 'mobile' && !data.responded) {
            // Procesar mensaje del móvil
            try {
                // Asegurar que hay conversación
                if (!state.currentConversation) {
                    await createNewConversation();
                }

                const result = await api.sendMessage(
                    state.currentConversation.id,
                    data.message,
                    []
                );

                // Enviar respuesta de vuelta
                snapshot.ref.update({
                    responded: true,
                    response: result.response || result.error || 'Sin respuesta'
                });
            } catch (e) {
                snapshot.ref.update({
                    responded: true,
                    response: '⚠️ Error al procesar: ' + e.message
                });
            }
        }
    });
}

function showUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (state.user && userInfo) {
        userInfo.hidden = false;
        document.getElementById('user-avatar').src = state.user.photo || '';
        document.getElementById('user-name').textContent = state.user.name || '';
        document.getElementById('user-email').textContent = state.user.email || '';
    }
}

function hideUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (userInfo) userInfo.hidden = true;
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}

function skipLogin() {
    showApp();
}

// ===== API =====
const api = {
    async fetch(url, options = {}) {
        const baseUrl = state.serverUrl || '';
        const response = await fetch(baseUrl + url, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        return response.json();
    },

    getStatus() {
        return this.fetch('/api/status');
    },

    getConversations() {
        return this.fetch('/api/conversations');
    },

    createConversation() {
        return this.fetch('/api/conversations', { method: 'POST' });
    },

    getConversation(id) {
        return this.fetch(`/api/conversations/${id}`);
    },

    deleteConversation(id) {
        return this.fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    },

    sendMessage(conversationId, message, attachments) {
        return this.fetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ conversation_id: conversationId, message, attachments })
        });
    },

    async uploadFile(file) {
        const baseUrl = state.serverUrl || '';
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(baseUrl + '/api/upload', { method: 'POST', body: formData });
        return response.json();
    },

    sendCameraImage(imageData) {
        return this.fetch('/api/camera', {
            method: 'POST',
            body: JSON.stringify({ image: imageData })
        });
    },

    generatePodcastScript(topic, duration, style) {
        return this.fetch('/api/podcast/generate', {
            method: 'POST',
            body: JSON.stringify({ topic, duration, style })
        });
    },

    createPodcast(text, title, language) {
        return this.fetch('/api/podcast', {
            method: 'POST',
            body: JSON.stringify({ text, title, language })
        });
    },

    getPodcasts() {
        return this.fetch('/api/podcasts');
    }
};

// ===== THEME =====
function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const icon = $('#toggle-theme').querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ===== NAVIGATION =====
function switchSection(section) {
    $$('.section').forEach(s => s.classList.remove('active'));
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    $(`#section-${section}`).classList.add('active');
    $(`.nav-item[data-section="${section}"]`).classList.add('active');

    if (window.innerWidth <= 768) {
        $('#sidebar').classList.remove('open');
    }
}

// ===== CONVERSATIONS =====
async function loadConversations() {
    try {
        state.conversations = await api.getConversations();
        renderConversationsList();
    } catch (e) {
        console.error('Error loading conversations:', e);
    }
}

function renderConversationsList() {
    const el = $('#conv-items');
    if (!el) return;
    el.innerHTML = state.conversations.map(conv => `
        <button class="conv-item ${state.currentConversation?.id === conv.id ? 'active' : ''}" 
                data-id="${conv.id}" aria-label="${conv.title}">
            <i class="fas fa-message"></i>
            <span>${conv.title}</span>
        </button>
    `).join('');

    el.querySelectorAll('.conv-item').forEach(item => {
        item.addEventListener('click', () => selectConversation(item.dataset.id));
    });
}

async function selectConversation(id) {
    const conv = await api.getConversation(id);
    state.currentConversation = conv;
    $('#chat-title').textContent = conv.title;
    renderMessages(conv.messages);
    renderConversationsList();
    switchSection('chat');
}

async function createNewConversation() {
    const conv = await api.createConversation();
    state.currentConversation = conv;
    state.conversations.unshift({ id: conv.id, title: conv.title, created_at: conv.created_at, message_count: 0 });
    $('#chat-title').textContent = conv.title;
    renderMessages([]);
    renderConversationsList();
    switchSection('chat');
}

async function deleteCurrentConversation() {
    if (!state.currentConversation) return;
    if (!confirm('¿Eliminar esta conversación?')) return;

    await api.deleteConversation(state.currentConversation.id);
    state.currentConversation = null;
    $('#chat-title').textContent = 'Nueva conversación';
    renderMessages([]);
    await loadConversations();
}

// ===== MESSAGES =====
function renderMessages(messages) {
    const el = $('#chat-messages');
    if (!messages || messages.length === 0) {
        el.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon"><i class="fas fa-brain"></i></div>
                <h2>¡Hola! Soy OmniAI</h2>
                <p>Tu asistente de IA universal. Pregúntame lo que quieras.</p>
                <div class="welcome-features">
                    <div class="feature-card"><i class="fas fa-file-alt"></i><span>Analiza documentos</span></div>
                    <div class="feature-card"><i class="fas fa-image"></i><span>Interpreta imágenes</span></div>
                    <div class="feature-card"><i class="fas fa-camera"></i><span>Usa tu cámara</span></div>
                    <div class="feature-card"><i class="fas fa-podcast"></i><span>Crea podcasts</span></div>
                </div>
            </div>
        `;
        return;
    }

    el.innerHTML = messages.map(msg => createMessageHTML(msg)).join('');
    scrollToBottom();
}

function createMessageHTML(msg) {
    const isUser = msg.role === 'user';
    const avatar = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-brain"></i>';
    const content = formatMessage(msg.content);

    let attachmentsHTML = '';
    if (msg.attachments && msg.attachments.length > 0) {
        attachmentsHTML = `<div class="message-attachments">
            ${msg.attachments.map(a => `<span class="attachment-badge"><i class="fas fa-paperclip"></i> ${a.name || a.type}</span>`).join('')}
        </div>`;
    }

    return `
        <div class="message ${isUser ? 'user' : 'assistant'}">
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                ${attachmentsHTML}
                ${content}
            </div>
        </div>
    `;
}

function formatMessage(text) {
    if (!text) return '';
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/\n/g, '<br>');
    return text;
}

function addMessageToChat(role, content, attachments = []) {
    const msg = { role, content, attachments };
    const html = createMessageHTML(msg);
    const welcome = $('#chat-messages').querySelector('.welcome-message');
    if (welcome) welcome.remove();
    $('#chat-messages').insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

function showTypingIndicator() {
    const html = `
        <div class="message assistant" id="typing-msg">
            <div class="message-avatar"><i class="fas fa-brain"></i></div>
            <div class="message-content">
                <div class="typing-indicator"><span></span><span></span><span></span></div>
            </div>
        </div>
    `;
    $('#chat-messages').insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typing = $('#typing-msg');
    if (typing) typing.remove();
}

function scrollToBottom() {
    const el = $('#chat-messages');
    el.scrollTop = el.scrollHeight;
}

// ===== SEND MESSAGE =====
async function sendMessage() {
    const message = $('#message-input').value.trim();
    if (!message && state.attachments.length === 0) return;
    if (state.isLoading) return;

    if (!state.currentConversation) {
        await createNewConversation();
    }

    const attachments = [...state.attachments];
    state.attachments = [];
    $('#attachments-preview').innerHTML = '';

    const attachmentNames = attachments.map(a => ({ name: a.name, type: a.type }));
    addMessageToChat('user', message, attachmentNames);
    $('#message-input').value = '';
    autoResizeTextarea();

    state.isLoading = true;
    $('#send-btn').disabled = true;
    showTypingIndicator();

    try {
        const result = await api.sendMessage(
            state.currentConversation.id,
            message,
            attachments
        );

        removeTypingIndicator();

        if (result.error) {
            addMessageToChat('assistant', `⚠️ Error: ${result.error}`);
        } else {
            addMessageToChat('assistant', result.response);
            if (state.currentConversation.title === 'Nueva conversación' && message) {
                state.currentConversation.title = message.substring(0, 50);
                $('#chat-title').textContent = state.currentConversation.title;
                loadConversations();
            }
        }
    } catch (error) {
        removeTypingIndicator();
        addMessageToChat('assistant', `⚠️ Error de conexión: ${error.message}`);
    }

    state.isLoading = false;
    $('#send-btn').disabled = false;
}

// ===== FILE UPLOAD =====
async function handleFileUpload(files) {
    for (const file of files) {
        showLoading(`Subiendo ${file.name}...`);
        try {
            const result = await api.uploadFile(file);
            if (result.success) {
                state.attachments.push(result.file);
                renderAttachments();
            }
        } catch (error) {
            console.error('Error uploading file:', error);
        }
        hideLoading();
    }
}

function renderAttachments() {
    $('#attachments-preview').innerHTML = state.attachments.map((att, i) => `
        <div class="attachment-chip">
            <i class="fas fa-${getFileIcon(att.type)}"></i>
            <span>${att.name}</span>
            <span class="remove-attachment" data-index="${i}"><i class="fas fa-times"></i></span>
        </div>
    `).join('');

    $('#attachments-preview').querySelectorAll('.remove-attachment').forEach(btn => {
        btn.addEventListener('click', () => {
            state.attachments.splice(parseInt(btn.dataset.index), 1);
            renderAttachments();
        });
    });
}

function getFileIcon(type) {
    switch (type) {
        case 'pdf': return 'file-pdf';
        case 'docx': return 'file-word';
        case 'image': return 'file-image';
        case 'text': return 'file-code';
        default: return 'file';
    }
}

// ===== CAMERA =====
async function startCamera() {
    try {
        state.cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        $('#camera-video').srcObject = state.cameraStream;
        $('#camera-video').hidden = false;
        $('#camera-preview').hidden = true;
        $('#camera-start-btn').hidden = true;
        $('#camera-capture-btn').hidden = false;
        $('#camera-retake-btn').hidden = true;
        $('#camera-use-btn').hidden = true;
        $('#camera-question').hidden = true;
    } catch (error) {
        alert('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
    }
}

function capturePhoto() {
    const video = $('#camera-video');
    const canvas = $('#camera-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    state.capturedImage = canvas.toDataURL('image/png');
    $('#camera-preview').src = state.capturedImage;
    $('#camera-preview').hidden = false;
    $('#camera-video').hidden = true;
    $('#camera-capture-btn').hidden = true;
    $('#camera-retake-btn').hidden = false;
    $('#camera-use-btn').hidden = false;
}

function retakePhoto() {
    $('#camera-preview').hidden = true;
    $('#camera-video').hidden = false;
    $('#camera-capture-btn').hidden = false;
    $('#camera-retake-btn').hidden = true;
    $('#camera-use-btn').hidden = true;
    $('#camera-question').hidden = true;
    state.capturedImage = null;
}

function usePhoto() {
    $('#camera-question').hidden = false;
    $('#camera-message').focus();
}

async function sendCameraQuestion() {
    const message = $('#camera-message').value.trim();
    if (!message || !state.capturedImage) return;

    showLoading('Analizando imagen...');

    try {
        const uploadResult = await api.sendCameraImage(state.capturedImage);

        if (uploadResult.success) {
            if (!state.currentConversation) {
                await createNewConversation();
            }

            const result = await api.sendMessage(
                state.currentConversation.id,
                message,
                [uploadResult.file]
            );

            hideLoading();
            switchSection('chat');
            addMessageToChat('user', `📷 [Foto de cámara] ${message}`, [{ name: 'Foto', type: 'camera' }]);

            if (result.error) {
                addMessageToChat('assistant', `⚠️ Error: ${result.error}`);
            } else {
                addMessageToChat('assistant', result.response);
            }

            stopCamera();
        }
    } catch (error) {
        hideLoading();
        alert('Error al procesar la imagen: ' + error.message);
    }
}

function stopCamera() {
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach(track => track.stop());
        state.cameraStream = null;
    }
    $('#camera-video').hidden = true;
    $('#camera-preview').hidden = true;
    $('#camera-start-btn').hidden = false;
    $('#camera-capture-btn').hidden = true;
    $('#camera-retake-btn').hidden = true;
    $('#camera-use-btn').hidden = true;
    $('#camera-question').hidden = true;
    state.capturedImage = null;
}

// ===== PODCAST =====
async function generatePodcastScript() {
    const topic = $('#podcast-topic').value.trim();
    if (!topic) { alert('Introduce un tema'); return; }

    showLoading('Generando guion con IA...');
    $('#generate-script-btn').disabled = true;

    try {
        const result = await api.generatePodcastScript(topic, $('#podcast-duration').value, $('#podcast-style').value);
        hideLoading();
        if (result.error) { alert('Error: ' + result.error); }
        else {
            $('#podcast-script-text').value = result.script;
            $('#podcast-script-area').hidden = false;
        }
    } catch (error) {
        hideLoading();
        alert('Error: ' + error.message);
    }
    $('#generate-script-btn').disabled = false;
}

async function createPodcast() {
    const text = $('#podcast-script-text').value.trim();
    if (!text) { alert('El guion está vacío'); return; }

    showLoading('Creando podcast...');
    $('#create-podcast-btn').disabled = true;

    try {
        const result = await api.createPodcast(text, $('#podcast-topic').value || 'Podcast', $('#podcast-language').value);
        hideLoading();
        if (result.error) { alert('Error: ' + result.error); }
        else {
            alert('¡Podcast creado!');
            loadPodcasts();
            $('#podcast-script-area').hidden = true;
            $('#podcast-topic').value = '';
        }
    } catch (error) {
        hideLoading();
        alert('Error: ' + error.message);
    }
    $('#create-podcast-btn').disabled = false;
}

async function loadPodcasts() {
    try {
        const podcasts = await api.getPodcasts();
        $('#podcast-items').innerHTML = podcasts.map(p => `
            <div class="podcast-item">
                <div class="podcast-item-icon"><i class="fas fa-podcast"></i></div>
                <div class="podcast-item-info">
                    <h4>${p.filename}</h4>
                    <p>${new Date(p.created_at).toLocaleDateString('es-ES')} · ${(p.size / 1024).toFixed(0)} KB</p>
                </div>
                <audio controls preload="none">
                    <source src="/api/podcasts/${p.filename}" type="audio/mpeg">
                </audio>
            </div>
        `).join('');
    } catch (e) { console.error('Error loading podcasts:', e); }
}

// ===== UTILITIES =====
function showLoading(text = 'Procesando...') {
    $('#loading-text').textContent = text;
    $('#loading-overlay').hidden = false;
}

function hideLoading() {
    $('#loading-overlay').hidden = true;
}

function autoResizeTextarea() {
    const textarea = $('#message-input');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

// ===== OLLAMA STATUS =====
async function checkOllamaStatus() {
    try {
        const status = await api.getStatus();
        state.ollamaConnected = status.ollama_running;
        state.availableModels = status.models || [];

        const statusEl = document.getElementById('ollama-status');
        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');

        if (status.ollama_running && status.models.length > 0) {
            dot.className = 'status-dot connected';
            text.textContent = `IA: ${status.current_model}`;
        } else if (status.ollama_running) {
            dot.className = 'status-dot disconnected';
            text.textContent = 'Sin modelos';
        } else {
            dot.className = 'status-dot disconnected';
            text.textContent = 'Ollama offline';
        }
    } catch (e) {
        const statusEl = document.getElementById('ollama-status');
        if (statusEl) {
            statusEl.querySelector('.status-dot').className = 'status-dot disconnected';
            statusEl.querySelector('.status-text').textContent = 'Sin conexión';
        }
    }
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
    // Login
    $('#google-login-btn').addEventListener('click', loginWithGoogle);
    $('#skip-login-btn').addEventListener('click', skipLogin);
    $('#logout-btn').addEventListener('click', logout);

    // Navigation
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
    });

    // Mobile menu
    $('#mobile-menu-btn').addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            !$('#sidebar').contains(e.target) &&
            !$('#mobile-menu-btn').contains(e.target)) {
            $('#sidebar').classList.remove('open');
        }
    });

    // Theme
    $('#toggle-theme').addEventListener('click', toggleTheme);

    // Chat
    $('#new-chat-btn').addEventListener('click', createNewConversation);
    $('#delete-conv-btn').addEventListener('click', deleteCurrentConversation);
    $('#send-btn').addEventListener('click', sendMessage);
    $('#message-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    $('#message-input').addEventListener('input', autoResizeTextarea);

    // Files
    $('#attach-btn').addEventListener('click', () => $('#file-input').click());
    $('#file-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) { handleFileUpload(e.target.files); e.target.value = ''; }
    });

    // Camera
    $('#camera-start-btn').addEventListener('click', startCamera);
    $('#camera-capture-btn').addEventListener('click', capturePhoto);
    $('#camera-retake-btn').addEventListener('click', retakePhoto);
    $('#camera-use-btn').addEventListener('click', usePhoto);
    $('#camera-send-btn').addEventListener('click', sendCameraQuestion);

    // Podcast
    $('#generate-script-btn').addEventListener('click', generatePodcastScript);
    $('#create-podcast-btn').addEventListener('click', createPodcast);

    // Drag and drop
    const chatArea = $('#chat-messages');
    chatArea.addEventListener('dragover', (e) => { e.preventDefault(); chatArea.style.border = '2px dashed var(--primary)'; });
    chatArea.addEventListener('dragleave', () => { chatArea.style.border = 'none'; });
    chatArea.addEventListener('drop', (e) => {
        e.preventDefault(); chatArea.style.border = 'none';
        if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
    });
}

// ===== INIT =====
async function init() {
    initTheme();
    initEventListeners();
    await initFirebase();
    await checkOllamaStatus();
    await loadConversations();
    await loadPodcasts();

    setInterval(checkOllamaStatus, 30000);

    if ('serviceWorker' in navigator) {
        try { await navigator.serviceWorker.register('/sw.js'); } catch (e) {}
    }
}

document.addEventListener('DOMContentLoaded', init);
