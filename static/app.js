/**
 * OmniAI - Frontend Application
 * Asistente de IA Universal
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
    availableModels: []
};

// ===== DOM ELEMENTS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const elements = {
    sidebar: $('#sidebar'),
    mobileMenuBtn: $('#mobile-menu-btn'),
    newChatBtn: $('#new-chat-btn'),
    convItems: $('#conv-items'),
    chatTitle: $('#chat-title'),
    chatMessages: $('#chat-messages'),
    messageInput: $('#message-input'),
    sendBtn: $('#send-btn'),
    attachBtn: $('#attach-btn'),
    fileInput: $('#file-input'),
    attachmentsPreview: $('#attachments-preview'),
    deleteConvBtn: $('#delete-conv-btn'),
    toggleTheme: $('#toggle-theme'),
    loadingOverlay: $('#loading-overlay'),
    loadingText: $('#loading-text'),
    // Camera
    cameraVideo: $('#camera-video'),
    cameraCanvas: $('#camera-canvas'),
    cameraPreview: $('#camera-preview'),
    cameraStartBtn: $('#camera-start-btn'),
    cameraCaptureBtn: $('#camera-capture-btn'),
    cameraRetakeBtn: $('#camera-retake-btn'),
    cameraUseBtn: $('#camera-use-btn'),
    cameraQuestion: $('#camera-question'),
    cameraMessage: $('#camera-message'),
    cameraSendBtn: $('#camera-send-btn'),
    // Podcast
    podcastTopic: $('#podcast-topic'),
    podcastDuration: $('#podcast-duration'),
    podcastStyle: $('#podcast-style'),
    podcastLanguage: $('#podcast-language'),
    generateScriptBtn: $('#generate-script-btn'),
    podcastScriptArea: $('#podcast-script-area'),
    podcastScriptText: $('#podcast-script-text'),
    createPodcastBtn: $('#create-podcast-btn'),
    podcastItems: $('#podcast-items')
};

// ===== API =====
const api = {
    async fetch(url, options = {}) {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        return response.json();
    },

    getConversations() {
        return this.fetch('/api/conversations');
    },

    getStatus() {
        return this.fetch('/api/status');
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
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
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
    const icon = elements.toggleTheme.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ===== NAVIGATION =====
function switchSection(section) {
    $$('.section').forEach(s => s.classList.remove('active'));
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    $(`#section-${section}`).classList.add('active');
    $(`.nav-item[data-section="${section}"]`).classList.add('active');

    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('open');
    }
}

// ===== CONVERSATIONS =====
async function loadConversations() {
    state.conversations = await api.getConversations();
    renderConversationsList();
}

function renderConversationsList() {
    elements.convItems.innerHTML = state.conversations.map(conv => `
        <button class="conv-item ${state.currentConversation?.id === conv.id ? 'active' : ''}" 
                data-id="${conv.id}" aria-label="${conv.title}">
            <i class="fas fa-message"></i>
            <span>${conv.title}</span>
        </button>
    `).join('');

    // Add click handlers
    elements.convItems.querySelectorAll('.conv-item').forEach(item => {
        item.addEventListener('click', () => selectConversation(item.dataset.id));
    });
}

async function selectConversation(id) {
    const conv = await api.getConversation(id);
    state.currentConversation = conv;
    elements.chatTitle.textContent = conv.title;
    renderMessages(conv.messages);
    renderConversationsList();
    switchSection('chat');
}

async function createNewConversation() {
    const conv = await api.createConversation();
    state.currentConversation = conv;
    state.conversations.unshift({ id: conv.id, title: conv.title, created_at: conv.created_at, message_count: 0 });
    elements.chatTitle.textContent = conv.title;
    renderMessages([]);
    renderConversationsList();
    switchSection('chat');
}

async function deleteCurrentConversation() {
    if (!state.currentConversation) return;
    if (!confirm('¿Eliminar esta conversación?')) return;

    await api.deleteConversation(state.currentConversation.id);
    state.currentConversation = null;
    elements.chatTitle.textContent = 'Nueva conversación';
    renderMessages([]);
    await loadConversations();
}

// ===== MESSAGES =====
function renderMessages(messages) {
    if (!messages || messages.length === 0) {
        elements.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon"><i class="fas fa-brain"></i></div>
                <h2>¡Hola! Soy OmniAI</h2>
                <p>Tu asistente de inteligencia artificial universal. Puedo ayudarte con absolutamente cualquier tema.</p>
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

    elements.chatMessages.innerHTML = messages.map(msg => createMessageHTML(msg)).join('');
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

    // Code blocks
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    // Wrap in paragraphs (simple)
    if (!text.includes('<pre>') && !text.includes('<br>')) {
        text = `<p>${text}</p>`;
    }

    return text;
}

function addMessageToChat(role, content, attachments = []) {
    const msg = { role, content, attachments };
    const html = createMessageHTML(msg);

    // Remove welcome message if present
    const welcome = elements.chatMessages.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    elements.chatMessages.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

function showTypingIndicator() {
    const html = `
        <div class="message assistant" id="typing-msg">
            <div class="message-avatar"><i class="fas fa-brain"></i></div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `;
    elements.chatMessages.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typing = $('#typing-msg');
    if (typing) typing.remove();
}

function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// ===== SEND MESSAGE =====
async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message && state.attachments.length === 0) return;
    if (state.isLoading) return;

    // Ensure we have a conversation
    if (!state.currentConversation) {
        await createNewConversation();
    }

    const attachments = [...state.attachments];
    state.attachments = [];
    elements.attachmentsPreview.innerHTML = '';

    // Show user message
    const attachmentNames = attachments.map(a => ({ name: a.name, type: a.type }));
    addMessageToChat('user', message, attachmentNames);
    elements.messageInput.value = '';
    autoResizeTextarea();

    // Show typing
    state.isLoading = true;
    elements.sendBtn.disabled = true;
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
            // Update title
            if (state.currentConversation.title === 'Nueva conversación' && message) {
                state.currentConversation.title = message.substring(0, 50);
                elements.chatTitle.textContent = state.currentConversation.title;
                loadConversations();
            }
        }
    } catch (error) {
        removeTypingIndicator();
        addMessageToChat('assistant', `⚠️ Error de conexión: ${error.message}`);
    }

    state.isLoading = false;
    elements.sendBtn.disabled = false;
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
    elements.attachmentsPreview.innerHTML = state.attachments.map((att, i) => `
        <div class="attachment-chip">
            <i class="fas fa-${getFileIcon(att.type)}"></i>
            <span>${att.name}</span>
            <span class="remove-attachment" data-index="${i}"><i class="fas fa-times"></i></span>
        </div>
    `).join('');

    elements.attachmentsPreview.querySelectorAll('.remove-attachment').forEach(btn => {
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
        elements.cameraVideo.srcObject = state.cameraStream;
        elements.cameraVideo.hidden = false;
        elements.cameraPreview.hidden = true;
        elements.cameraStartBtn.hidden = true;
        elements.cameraCaptureBtn.hidden = false;
        elements.cameraRetakeBtn.hidden = true;
        elements.cameraUseBtn.hidden = true;
        elements.cameraQuestion.hidden = true;
    } catch (error) {
        alert('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
    }
}

function capturePhoto() {
    const video = elements.cameraVideo;
    const canvas = elements.cameraCanvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    state.capturedImage = canvas.toDataURL('image/png');
    elements.cameraPreview.src = state.capturedImage;
    elements.cameraPreview.hidden = false;
    elements.cameraVideo.hidden = true;

    elements.cameraCaptureBtn.hidden = true;
    elements.cameraRetakeBtn.hidden = false;
    elements.cameraUseBtn.hidden = false;
}

function retakePhoto() {
    elements.cameraPreview.hidden = true;
    elements.cameraVideo.hidden = false;
    elements.cameraCaptureBtn.hidden = false;
    elements.cameraRetakeBtn.hidden = true;
    elements.cameraUseBtn.hidden = true;
    elements.cameraQuestion.hidden = true;
    state.capturedImage = null;
}

function usePhoto() {
    elements.cameraQuestion.hidden = false;
    elements.cameraMessage.focus();
}

async function sendCameraQuestion() {
    const message = elements.cameraMessage.value.trim();
    if (!message || !state.capturedImage) return;

    showLoading('Analizando imagen...');

    try {
        // Upload camera image
        const uploadResult = await api.sendCameraImage(state.capturedImage);

        if (uploadResult.success) {
            // Ensure conversation exists
            if (!state.currentConversation) {
                await createNewConversation();
            }

            // Send message with image
            const result = await api.sendMessage(
                state.currentConversation.id,
                message,
                [uploadResult.file]
            );

            hideLoading();

            // Switch to chat and show result
            switchSection('chat');
            addMessageToChat('user', `📷 [Foto de cámara] ${message}`, [{ name: 'Foto', type: 'camera' }]);

            if (result.error) {
                addMessageToChat('assistant', `⚠️ Error: ${result.error}`);
            } else {
                addMessageToChat('assistant', result.response);
            }

            // Reset camera
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
    elements.cameraVideo.hidden = true;
    elements.cameraPreview.hidden = true;
    elements.cameraStartBtn.hidden = false;
    elements.cameraCaptureBtn.hidden = true;
    elements.cameraRetakeBtn.hidden = true;
    elements.cameraUseBtn.hidden = true;
    elements.cameraQuestion.hidden = true;
    state.capturedImage = null;
}

// ===== PODCAST =====
async function generatePodcastScript() {
    const topic = elements.podcastTopic.value.trim();
    if (!topic) {
        alert('Por favor, introduce un tema para el podcast');
        return;
    }

    const duration = elements.podcastDuration.value;
    const style = elements.podcastStyle.value;

    showLoading('Generando guion con IA...');
    elements.generateScriptBtn.disabled = true;

    try {
        const result = await api.generatePodcastScript(topic, duration, style);
        hideLoading();

        if (result.error) {
            alert('Error: ' + result.error);
        } else {
            elements.podcastScriptText.value = result.script;
            elements.podcastScriptArea.hidden = false;
        }
    } catch (error) {
        hideLoading();
        alert('Error al generar guion: ' + error.message);
    }

    elements.generateScriptBtn.disabled = false;
}

async function createPodcast() {
    const text = elements.podcastScriptText.value.trim();
    if (!text) {
        alert('El guion está vacío');
        return;
    }

    const title = elements.podcastTopic.value || 'Podcast sin título';
    const language = elements.podcastLanguage.value;

    showLoading('Creando podcast (audio)...');
    elements.createPodcastBtn.disabled = true;

    try {
        const result = await api.createPodcast(text, title, language);
        hideLoading();

        if (result.error) {
            alert('Error: ' + result.error);
        } else {
            alert('¡Podcast creado exitosamente!');
            loadPodcasts();
            elements.podcastScriptArea.hidden = true;
            elements.podcastTopic.value = '';
        }
    } catch (error) {
        hideLoading();
        alert('Error al crear podcast: ' + error.message);
    }

    elements.createPodcastBtn.disabled = false;
}

async function loadPodcasts() {
    try {
        const podcasts = await api.getPodcasts();
        elements.podcastItems.innerHTML = podcasts.map(p => `
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
    } catch (error) {
        console.error('Error loading podcasts:', error);
    }
}

// ===== UTILITIES =====
function showLoading(text = 'Procesando...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.hidden = false;
}

function hideLoading() {
    elements.loadingOverlay.hidden = true;
}

function autoResizeTextarea() {
    const textarea = elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
    // Navigation
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
    });

    // Mobile menu
    elements.mobileMenuBtn.addEventListener('click', () => {
        elements.sidebar.classList.toggle('open');
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            !elements.sidebar.contains(e.target) &&
            !elements.mobileMenuBtn.contains(e.target)) {
            elements.sidebar.classList.remove('open');
        }
    });

    // Theme
    elements.toggleTheme.addEventListener('click', toggleTheme);

    // New chat
    elements.newChatBtn.addEventListener('click', createNewConversation);

    // Delete conversation
    elements.deleteConvBtn.addEventListener('click', deleteCurrentConversation);

    // Send message
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    elements.messageInput.addEventListener('input', autoResizeTextarea);

    // File upload
    elements.attachBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files);
            e.target.value = '';
        }
    });

    // Camera
    elements.cameraStartBtn.addEventListener('click', startCamera);
    elements.cameraCaptureBtn.addEventListener('click', capturePhoto);
    elements.cameraRetakeBtn.addEventListener('click', retakePhoto);
    elements.cameraUseBtn.addEventListener('click', usePhoto);
    elements.cameraSendBtn.addEventListener('click', sendCameraQuestion);

    // Podcast
    elements.generateScriptBtn.addEventListener('click', generatePodcastScript);
    elements.createPodcastBtn.addEventListener('click', createPodcast);

    // Drag and drop
    const chatArea = elements.chatMessages;
    chatArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        chatArea.style.border = '2px dashed var(--primary)';
    });
    chatArea.addEventListener('dragleave', () => {
        chatArea.style.border = 'none';
    });
    chatArea.addEventListener('drop', (e) => {
        e.preventDefault();
        chatArea.style.border = 'none';
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    });
}

// ===== INIT =====
async function init() {
    initTheme();
    initEventListeners();
    await checkOllamaStatus();
    await loadConversations();
    await loadPodcasts();

    // Verificar estado de Ollama cada 30 segundos
    setInterval(checkOllamaStatus, 30000);

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
        } catch (e) {
            console.log('SW registration failed:', e);
        }
    }
}

async function checkOllamaStatus() {
    try {
        const status = await api.getStatus();
        state.ollamaConnected = status.ollama_running;
        state.availableModels = status.models || [];

        const statusEl = document.getElementById('ollama-status');
        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');

        if (status.ollama_running) {
            dot.className = 'status-dot connected';
            if (status.models.length > 0) {
                text.textContent = `IA: ${status.current_model}`;
            } else {
                dot.className = 'status-dot disconnected';
                text.textContent = 'Sin modelos';
            }
        } else {
            dot.className = 'status-dot disconnected';
            text.textContent = 'Ollama offline';
        }
    } catch (e) {
        const statusEl = document.getElementById('ollama-status');
        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');
        dot.className = 'status-dot disconnected';
        text.textContent = 'Sin conexión';
    }
}

// Start app
document.addEventListener('DOMContentLoaded', init);
