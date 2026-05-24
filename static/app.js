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
        console.log('Firebase no disponible, modo offline:', e);
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
        showApp();
        // Registrar en background, sin bloquear
        setTimeout(() => registerPC(), 1000);
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
        try {
            const pcRef = firebaseDb.ref(`users/${state.user.uid}/pc`);
            pcRef.set({
                online: true,
                lastSeen: Date.now(),
                url: window.location.origin
            }).catch(e => console.log('Firebase write error:', e));

            // Marcar como offline al cerrar
            pcRef.onDisconnect().update({
                online: false,
                lastSeen: Date.now()
            }).catch(e => {});
        } catch (e) {
            console.log('Firebase register error:', e);
        }

        // También registrar en el backend
        fetch('/api/relay/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.user.uid,
                email: state.user.email
            })
        }).catch(e => {});
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

    const actionsHTML = !isUser ? `
        <div class="message-actions">
            <button class="msg-action-btn" onclick="copyMessage(this)" title="Copiar">
                <i class="fas fa-copy"></i>
            </button>
            <button class="msg-action-btn" onclick="translateMessage(this)" title="Traducir">
                <i class="fas fa-language"></i>
            </button>
            <button class="msg-action-btn" onclick="regenerateMessage(this)" title="Regenerar">
                <i class="fas fa-redo"></i>
            </button>
        </div>
    ` : `
        <div class="message-actions">
            <button class="msg-action-btn" onclick="editMessage(this)" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
        </div>
    `;

    return `
        <div class="message ${isUser ? 'user' : 'assistant'}" data-content="${encodeURIComponent(msg.content || '')}">
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                ${attachmentsHTML}
                ${content}
                ${actionsHTML}
            </div>
        </div>
    `;
}

function copyMessage(btn) {
    const msgEl = btn.closest('.message');
    const content = decodeURIComponent(msgEl.dataset.content);
    navigator.clipboard.writeText(content).then(() => {
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
    });
}

async function translateMessage(btn) {
    const msgEl = btn.closest('.message');
    const content = decodeURIComponent(msgEl.dataset.content);

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const result = await api.sendMessage(
            state.currentConversation.id,
            `Traduce el siguiente texto al inglés (si está en español) o al español (si está en otro idioma). Solo devuelve la traducción, nada más:\n\n${content}`,
            []
        );

        if (result.response) {
            const translationDiv = document.createElement('div');
            translationDiv.className = 'translation-box';
            translationDiv.innerHTML = `<p><strong>🌐 Traducción:</strong></p><p>${formatMessage(result.response)}</p>`;
            const contentEl = msgEl.querySelector('.message-content');
            const existing = contentEl.querySelector('.translation-box');
            if (existing) existing.remove();
            contentEl.appendChild(translationDiv);
        }
    } catch (e) {
        alert('Error al traducir');
    }

    btn.innerHTML = '<i class="fas fa-language"></i>';
}

async function regenerateMessage(btn) {
    if (!state.currentConversation || state.isLoading) return;

    const msgEl = btn.closest('.message');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // Buscar el último mensaje del usuario
    const messages = state.currentConversation.messages;
    let lastUserMsg = '';
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
            lastUserMsg = messages[i].content;
            break;
        }
    }

    if (!lastUserMsg) return;

    try {
        const result = await api.sendMessage(
            state.currentConversation.id,
            lastUserMsg + '\n\n(Genera una respuesta diferente a la anterior)',
            []
        );

        if (result.response) {
            // Reemplazar contenido del mensaje
            const contentEl = msgEl.querySelector('.message-content');
            const actionsEl = contentEl.querySelector('.message-actions');
            const translationEl = contentEl.querySelector('.translation-box');
            if (translationEl) translationEl.remove();
            
            // Actualizar contenido
            msgEl.dataset.content = encodeURIComponent(result.response);
            contentEl.innerHTML = formatMessage(result.response) + `
                <div class="message-actions">
                    <button class="msg-action-btn" onclick="copyMessage(this)" title="Copiar"><i class="fas fa-copy"></i></button>
                    <button class="msg-action-btn" onclick="translateMessage(this)" title="Traducir"><i class="fas fa-language"></i></button>
                    <button class="msg-action-btn" onclick="regenerateMessage(this)" title="Regenerar"><i class="fas fa-redo"></i></button>
                </div>`;
        }
    } catch (e) {
        alert('Error al regenerar');
    }

    btn.innerHTML = '<i class="fas fa-redo"></i>';
}

function editMessage(btn) {
    const msgEl = btn.closest('.message');
    const content = decodeURIComponent(msgEl.dataset.content);

    // Poner el texto en el input para editarlo
    $('#message-input').value = content;
    $('#message-input').focus();
    autoResizeTextarea();

    // Eliminar el mensaje y la respuesta que le sigue
    const allMessages = [...$$('#chat-messages .message')];
    const idx = allMessages.indexOf(msgEl);
    
    // Eliminar desde este mensaje en adelante
    for (let i = allMessages.length - 1; i >= idx; i--) {
        allMessages[i].remove();
    }

    // También eliminar del estado
    if (state.currentConversation) {
        const convMessages = state.currentConversation.messages;
        // Buscar el mensaje correspondiente y eliminar desde ahí
        for (let i = convMessages.length - 1; i >= 0; i--) {
            if (convMessages[i].content === content && convMessages[i].role === 'user') {
                state.currentConversation.messages = convMessages.slice(0, i);
                break;
            }
        }
    }
}

// ===== VOICE INPUT =====
let voiceRecognition = null;
let isRecording = false;

function initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    voiceRecognition = new SpeechRecognition();
    voiceRecognition.lang = 'es-ES';
    voiceRecognition.continuous = false;
    voiceRecognition.interimResults = true;

    voiceRecognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        $('#message-input').value = transcript;
        autoResizeTextarea();
    };

    voiceRecognition.onend = () => {
        isRecording = false;
        $('#voice-btn').innerHTML = '<i class="fas fa-microphone"></i>';
        $('#voice-btn').style.color = '';
    };

    voiceRecognition.onerror = () => {
        isRecording = false;
        $('#voice-btn').innerHTML = '<i class="fas fa-microphone"></i>';
        $('#voice-btn').style.color = '';
    };
}

function toggleVoice() {
    if (!voiceRecognition) {
        alert('Tu navegador no soporta entrada por voz');
        return;
    }

    if (isRecording) {
        voiceRecognition.stop();
        isRecording = false;
        $('#voice-btn').innerHTML = '<i class="fas fa-microphone"></i>';
        $('#voice-btn').style.color = '';
    } else {
        voiceRecognition.start();
        isRecording = true;
        $('#voice-btn').innerHTML = '<i class="fas fa-stop"></i>';
        $('#voice-btn').style.color = 'var(--error)';
    }
}

// ===== SUGGESTIONS =====
function useSuggestion(btn) {
    const text = btn.textContent.replace(/^[^\s]+\s/, ''); // Quitar emoji
    $('#message-input').value = text;
    autoResizeTextarea();
    $('#message-input').focus();
    // Ocultar sugerencias
    $('#suggestions').style.display = 'none';
}
function formatMessage(text) {
    if (!text) return '';
    
    // Code blocks
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Headers
    text = text.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    text = text.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--primary)">$1</a>');
    // Unordered lists
    text = text.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    // Ordered lists
    text = text.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // Horizontal rule
    text = text.replace(/^---$/gm, '<hr style="border-color:var(--border);margin:0.5rem 0;">');
    // Line breaks (but not inside pre/code)
    text = text.replace(/\n/g, '<br>');
    // Clean up double br in lists
    text = text.replace(/<\/li><br>/g, '</li>');
    text = text.replace(/<br><li>/g, '<li>');

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
    // Ocultar sugerencias
    const suggestions = $('#suggestions');
    if (suggestions) suggestions.style.display = 'none';

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
        $('#camera-stop-btn').hidden = false;
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
    $('#camera-stop-btn').hidden = true;
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
                    <h4>${p.title || p.filename}</h4>
                    <p>${new Date(p.created_at).toLocaleDateString('es-ES')} · ${(p.size / 1024).toFixed(0)} KB</p>
                </div>
                <audio controls preload="none">
                    <source src="/api/podcasts/${p.filename}" type="audio/mpeg">
                </audio>
            </div>
        `).join('');
    } catch (e) { console.error('Error loading podcasts:', e); }
}

// ===== MINDS (Personalidades IA) =====
const defaultMinds = [
    { id: 'general', name: 'OmniAI', icon: '🧠', color: '#667eea', desc: 'Asistente general que sabe de todo', prompt: 'Eres OmniAI, un asistente experto en todos los temas. Responde en español de forma clara y útil.', custom: false },
    { id: 'code', name: 'CodeMaster', icon: '💻', color: '#10b981', desc: 'Experto en programación y código', prompt: 'Eres CodeMaster, un experto programador. Ayudas con código, debugging, arquitectura y cualquier lenguaje de programación. Responde en español con ejemplos de código.', custom: false },
    { id: 'creative', name: 'Creativa', icon: '🎨', color: '#f59e0b', desc: 'Escritora creativa, poemas, historias', prompt: 'Eres Creativa, una escritora y artista. Generas poemas, historias, guiones, letras de canciones y contenido creativo. Responde en español con estilo artístico.', custom: false },
    { id: 'teacher', name: 'Profe', icon: '📚', color: '#8b5cf6', desc: 'Profesor que explica todo fácil', prompt: 'Eres Profe, un profesor paciente y didáctico. Explicas cualquier tema de forma sencilla con ejemplos, como si hablaras con un estudiante. Responde en español.', custom: false },
    { id: 'fitness', name: 'FitCoach', icon: '💪', color: '#ef4444', desc: 'Entrenador personal y nutrición', prompt: 'Eres FitCoach, un entrenador personal y nutricionista. Creas rutinas de ejercicio, planes de alimentación y consejos de salud. Responde en español.', custom: false },
    { id: 'chef', name: 'ChefIA', icon: '👨‍🍳', color: '#f97316', desc: 'Chef experto en cocina y recetas', prompt: 'Eres ChefIA, un chef profesional. Creas recetas, explicas técnicas de cocina y sugieres platos según ingredientes disponibles. Responde en español.', custom: false },
    { id: 'travel', name: 'Viajero', icon: '✈️', color: '#06b6d4', desc: 'Guía de viajes y aventuras', prompt: 'Eres Viajero, un experto en viajes. Recomiendas destinos, itinerarios, consejos de viaje, presupuestos y experiencias. Responde en español.', custom: false },
    { id: 'science', name: 'Científica', icon: '🔬', color: '#ec4899', desc: 'Experta en ciencia y tecnología', prompt: 'Eres Científica, una experta en ciencias. Explicas física, química, biología, astronomía y tecnología de forma accesible. Responde en español.', custom: false }
];

// Cargar mentes personalizadas del localStorage
let minds = [...defaultMinds, ...(JSON.parse(localStorage.getItem('custom_minds') || '[]'))];
let activeMind = minds[0];

function saveCustomMinds() {
    const custom = minds.filter(m => m.custom);
    localStorage.setItem('custom_minds', JSON.stringify(custom));
}

function createMind() {
    const name = $('#mind-name').value.trim();
    const desc = $('#mind-desc').value.trim();
    const instructions = $('#mind-instructions').value.trim();
    const icon = $('#mind-icon').value.trim() || '✨';

    if (!name) { alert('Ponle un nombre a tu Mente'); return; }
    if (!instructions) { alert('Escribe las instrucciones'); return; }

    const colors = ['#667eea','#10b981','#f59e0b','#8b5cf6','#ef4444','#f97316','#06b6d4','#ec4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const newMind = {
        id: 'custom_' + Date.now(),
        name: name,
        icon: icon,
        color: color,
        desc: desc || name,
        prompt: instructions + ' Responde siempre en español.',
        custom: true
    };

    minds.push(newMind);
    saveCustomMinds();
    renderMinds();

    // Limpiar formulario
    $('#mind-name').value = '';
    $('#mind-desc').value = '';
    $('#mind-instructions').value = '';
    $('#mind-icon').value = '';
}

function deleteMind(id) {
    if (!confirm('¿Eliminar esta Mente?')) return;
    minds = minds.filter(m => m.id !== id);
    if (activeMind.id === id) activeMind = minds[0];
    saveCustomMinds();
    renderMinds();
}

function renderMinds() {
    const grid = $('#minds-grid');
    if (!grid) return;
    grid.innerHTML = minds.map(m => `
        <div class="mind-card ${m.id === activeMind.id ? 'active' : ''}" data-id="${m.id}" style="border-color:${m.id === activeMind.id ? m.color : ''}">
            <div class="mind-icon">${m.icon}</div>
            <h4 style="color:${m.color}">${m.name}</h4>
            <p>${m.desc}</p>
            ${m.id === activeMind.id ? '<div class="mind-active">✓ Activa</div>' : ''}
            ${m.custom ? `<button class="msg-action-btn" onclick="event.stopPropagation();deleteMind('${m.id}')" title="Eliminar" style="position:absolute;top:0.5rem;right:0.5rem;"><i class="fas fa-trash"></i></button>` : ''}
        </div>
    `).join('');

    grid.querySelectorAll('.mind-card').forEach(card => {
        card.addEventListener('click', () => {
            const mind = minds.find(m => m.id === card.dataset.id);
            if (mind) {
                activeMind = mind;
                renderMinds();
                createNewConversation();
                switchSection('chat');
                setTimeout(() => {
                    addMessageToChat('assistant', `${mind.icon} ¡Hola! Soy <strong>${mind.name}</strong>. ${mind.desc}. ¿En qué puedo ayudarte?`);
                }, 300);
            }
        });
    });
}

// ===== IMAGE HISTORY =====
async function loadImageHistory() {
    try {
        const images = await api.fetch('/api/image-history');
        const container = $('#generated-images');
        if (images.length > 0 && container.children.length === 0) {
            container.innerHTML = images.map(img => `
                <div class="generated-image-card">
                    <img src="${img.url}" alt="${img.prompt}">
                    <div class="image-info">
                        <p>${img.prompt}</p>
                    </div>
                    <div class="image-actions">
                        <a href="${img.url}" target="_blank" download>⬇️ Descargar</a>
                        <span style="font-size:0.75rem;color:var(--text-muted);">${new Date(img.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {}
}

// ===== EXPORT CONVERSATION =====
function exportConversation() {
    if (!state.currentConversation || !state.currentConversation.messages || state.currentConversation.messages.length === 0) {
        alert('No hay mensajes para exportar');
        return;
    }

    const conv = state.currentConversation;
    let text = `=== ${conv.title} ===\nFecha: ${new Date(conv.created_at).toLocaleDateString('es-ES')}\n\n`;

    conv.messages.forEach(msg => {
        const role = msg.role === 'user' ? '👤 Tú' : '🤖 OmniAI';
        text += `${role}:\n${msg.content}\n\n---\n\n`;
    });

    // Descargar como TXT
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.replace(/[^a-zA-Z0-9 ]/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== IMAGE GENERATION =====
async function generateImage() {
    const prompt = $('#image-prompt').value.trim();
    if (!prompt) { alert('Describe la imagen que quieres generar'); return; }

    $('#generate-image-btn').disabled = true;
    $('#generate-image-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

    try {
        const result = await api.fetch('/api/generate-image', {
            method: 'POST',
            body: JSON.stringify({ prompt })
        });

        if (result.error) {
            alert(result.error);
        } else {
            const container = $('#generated-images');
            const card = document.createElement('div');
            card.className = 'generated-image-card';
            card.innerHTML = `
                <img src="${result.image.url}" alt="${prompt}">
                <div class="image-info">
                    <p>${prompt}</p>
                </div>
                <div class="image-actions">
                    <a href="${result.image.url}" target="_blank" download="omniai-image.png">⬇️ Descargar</a>
                </div>
            `;
            container.insertBefore(card, container.firstChild);
            $('#image-prompt').value = '';
        }
    } catch (error) {
        alert('Error de conexión: ' + error.message);
    }

    $('#generate-image-btn').disabled = false;
    $('#generate-image-btn').innerHTML = '<i class="fas fa-magic"></i> Generar imagen';
}

// ===== UTILITIES =====
function showLoading(text = 'Procesando...') {
    const el = $('#loading-overlay');
    $('#loading-text').textContent = text;
    el.hidden = false;
    el.style.display = 'flex';
}

function hideLoading() {
    const el = $('#loading-overlay');
    el.hidden = true;
    el.style.display = 'none';
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

        const statusEl = document.getElementById('ollama-status');
        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');

        if (status.status === 'online') {
            dot.className = 'status-dot connected';
            text.textContent = `IA: ${status.current_model}`;
        } else {
            dot.className = 'status-dot disconnected';
            text.textContent = 'IA offline';
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
    $('#export-conv-btn').addEventListener('click', exportConversation);
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

    // Voice
    $('#voice-btn').addEventListener('click', toggleVoice);
    initVoice();

    // Camera
    $('#camera-start-btn').addEventListener('click', startCamera);
    $('#camera-stop-btn').addEventListener('click', stopCamera);
    $('#camera-capture-btn').addEventListener('click', capturePhoto);
    $('#camera-retake-btn').addEventListener('click', retakePhoto);
    $('#camera-use-btn').addEventListener('click', usePhoto);
    $('#camera-send-btn').addEventListener('click', sendCameraQuestion);

    // Podcast
    $('#generate-script-btn').addEventListener('click', generatePodcastScript);
    $('#create-podcast-btn').addEventListener('click', createPodcast);

    // Image generation
    $('#generate-image-btn').addEventListener('click', generateImage);

    // Minds
    $('#create-mind-btn').addEventListener('click', createMind);

    // Load image history when switching to images section
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (item.dataset.section === 'images') loadImageHistory();
            if (item.dataset.section === 'minds') renderMinds();
        });
    });

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
    // Asegurar que el loading está oculto al inicio
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.hidden = true;

    initTheme();
    initEventListeners();
    renderMinds();

    // Iniciar Firebase sin bloquear
    initFirebase().catch(e => console.log('Firebase init error:', e));

    // Cargar datos sin bloquear la UI
    try { await checkOllamaStatus(); } catch(e) {}
    try { await loadConversations(); } catch(e) {}
    try { await loadPodcasts(); } catch(e) {}

    // Asegurar que loading está oculto
    hideLoading();

    setInterval(checkOllamaStatus, 30000);

    if ('serviceWorker' in navigator) {
        try { await navigator.serviceWorker.register('/sw.js'); } catch (e) {}
    }
}

document.addEventListener('DOMContentLoaded', init);
