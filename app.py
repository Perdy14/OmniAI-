"""
OmniAI - Asistente de IA Universal (Local + Cuentas)
Usa Ollama para IA local + Firebase para sincronizar PC y móvil.
"""

import os
import json
import base64
import uuid
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import PyPDF2
from docx import Document
from PIL import Image
from gtts import gTTS
import requests

app = Flask(__name__, static_folder='static')
CORS(app)

# Configuracion
UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)
PODCASTS_FOLDER = Path('podcasts')
PODCASTS_FOLDER.mkdir(exist_ok=True)
CONVERSATIONS_FOLDER = Path('conversations')
CONVERSATIONS_FOLDER.mkdir(exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

# Configuracion de Ollama (local)
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
MODEL = os.environ.get('MODEL', 'llama3.2')
VISION_MODEL = os.environ.get('VISION_MODEL', 'llava')

# Firebase config
FIREBASE_CONFIG = {
    'apiKey': "AIzaSyAuAzEyn3luxkRBLctQiNa4arTk94f6o",
    'authDomain': "omniai-d081d.firebaseapp.com",
    'projectId': "omniai-d081d",
    'storageBucket': "omniai-d081d.firebasestorage.app",
    'messagingSenderId': "216262332338",
    'appId': "1:216262332338:web:71f597b7476c43da0fdeab",
    'measurementId': "G-NZ1WPLSRMT",
    'databaseURL': "https://omniai-d081d-default-rtdb.firebaseio.com"
}

# Almacen de conversaciones en memoria
conversations = {}
# Usuario actual logueado
current_user = None


def load_conversations():
    """Carga conversaciones guardadas del disco."""
    global conversations
    for file in CONVERSATIONS_FOLDER.glob('*.json'):
        try:
            with open(file, 'r', encoding='utf-8') as f:
                conv = json.load(f)
                conversations[conv['id']] = conv
        except Exception:
            pass


def save_conversation(conv_id):
    """Guarda una conversacion en disco."""
    if conv_id in conversations:
        filepath = CONVERSATIONS_FOLDER / f"{conv_id}.json"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(conversations[conv_id], f, ensure_ascii=False, indent=2)


def extract_text_from_pdf(filepath):
    """Extrae texto de un archivo PDF."""
    text = ""
    try:
        with open(filepath, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        text = f"[Error al leer PDF: {str(e)}]"
    return text


def extract_text_from_docx(filepath):
    """Extrae texto de un archivo Word."""
    text = ""
    try:
        doc = Document(filepath)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        text = f"[Error al leer DOCX: {str(e)}]"
    return text


def encode_image_to_base64(filepath):
    """Codifica una imagen a base64."""
    with open(filepath, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def check_ollama():
    """Verifica si Ollama esta corriendo."""
    try:
        r = requests.get(f'{OLLAMA_URL}/api/tags', timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def get_available_models():
    """Obtiene los modelos disponibles en Ollama."""
    try:
        r = requests.get(f'{OLLAMA_URL}/api/tags', timeout=5)
        if r.status_code == 200:
            data = r.json()
            return [m['name'] for m in data.get('models', [])]
    except Exception:
        pass
    return []


def chat_with_ollama(messages, model=None, images=None):
    """Envia mensajes a Ollama y obtiene respuesta."""
    use_model = model or MODEL

    payload = {
        'model': use_model,
        'messages': messages,
        'stream': False,
        'options': {
            'temperature': 0.7,
            'num_predict': 4096
        }
    }

    if images:
        payload['model'] = VISION_MODEL
        if payload['messages']:
            payload['messages'][-1]['images'] = images

    try:
        r = requests.post(
            f'{OLLAMA_URL}/api/chat',
            json=payload,
            timeout=300
        )

        if r.status_code == 200:
            data = r.json()
            return data.get('message', {}).get('content', 'Sin respuesta')
        else:
            error_data = r.json() if r.text else {}
            error_msg = error_data.get('error', f'Error HTTP {r.status_code}')
            return f"Error de Ollama: {error_msg}"

    except requests.exceptions.ConnectionError:
        return "⚠️ No se puede conectar con Ollama. Asegúrate de que Ollama esté ejecutándose."
    except requests.exceptions.Timeout:
        return "⚠️ La respuesta tardó demasiado. Intenta con una pregunta más corta."
    except Exception as e:
        return f"⚠️ Error: {str(e)}"


# --- RUTAS ESTATICAS ---

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)


# --- API DE ESTADO ---

@app.route('/api/status', methods=['GET'])
def get_status():
    """Verifica el estado de Ollama y modelos disponibles."""
    ollama_running = check_ollama()
    models = get_available_models() if ollama_running else []
    return jsonify({
        'ollama_running': ollama_running,
        'models': models,
        'current_model': MODEL,
        'vision_model': VISION_MODEL
    })


@app.route('/api/firebase-config', methods=['GET'])
def get_firebase_config():
    """Devuelve la configuración de Firebase para el frontend."""
    return jsonify(FIREBASE_CONFIG)


# --- API DE RELAY (para que el móvil se conecte) ---

@app.route('/api/relay/register', methods=['POST'])
def relay_register():
    """Registra este PC como servidor para un usuario."""
    global current_user
    data = request.json
    user_id = data.get('user_id')
    user_email = data.get('email')

    if user_id:
        current_user = {'uid': user_id, 'email': user_email}
        return jsonify({'success': True, 'message': 'PC registrado correctamente'})
    return jsonify({'error': 'No se proporcionó usuario'}), 400


@app.route('/api/relay/status', methods=['GET'])
def relay_status():
    """Verifica si hay un usuario logueado en este PC."""
    if current_user:
        return jsonify({
            'logged_in': True,
            'user': current_user,
            'ollama': check_ollama()
        })
    return jsonify({'logged_in': False})


# --- API DE CONVERSACIONES ---

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """Obtiene todas las conversaciones."""
    conv_list = []
    for conv in conversations.values():
        conv_list.append({
            'id': conv['id'],
            'title': conv['title'],
            'created_at': conv['created_at'],
            'message_count': len(conv['messages'])
        })
    conv_list.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify(conv_list)


@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    """Crea una nueva conversacion."""
    conv_id = str(uuid.uuid4())
    conversations[conv_id] = {
        'id': conv_id,
        'title': 'Nueva conversación',
        'created_at': datetime.now().isoformat(),
        'messages': [],
        'system_prompt': "Eres OmniAI, un asistente de inteligencia artificial experto en absolutamente todos los temas. Respondes de forma clara, detallada y precisa en español. Puedes ayudar con cualquier tarea: programación, matemáticas, ciencias, idiomas, historia, arte, música, cocina, deportes, medicina, derecho, economía, filosofía, y cualquier otro tema. No tienes límites en la cantidad de respuestas."
    }
    save_conversation(conv_id)
    return jsonify(conversations[conv_id])


@app.route('/api/conversations/<conv_id>', methods=['GET'])
def get_conversation(conv_id):
    """Obtiene una conversacion especifica."""
    if conv_id not in conversations:
        return jsonify({'error': 'Conversación no encontrada'}), 404
    return jsonify(conversations[conv_id])


@app.route('/api/conversations/<conv_id>', methods=['DELETE'])
def delete_conversation(conv_id):
    """Elimina una conversacion."""
    if conv_id in conversations:
        del conversations[conv_id]
        filepath = CONVERSATIONS_FOLDER / f"{conv_id}.json"
        if filepath.exists():
            filepath.unlink()
    return jsonify({'success': True})


# --- API DE CHAT ---

@app.route('/api/chat', methods=['POST'])
def chat():
    """Envia un mensaje y obtiene respuesta de la IA local."""
    data = request.json
    conv_id = data.get('conversation_id')
    message = data.get('message', '')
    attachments = data.get('attachments', [])

    if not conv_id or conv_id not in conversations:
        return jsonify({'error': 'Conversación no válida'}), 400

    conv = conversations[conv_id]

    # Construir contenido del mensaje
    content_parts = []
    images = []

    for attachment in attachments:
        file_path = attachment.get('path', '')
        file_type = attachment.get('type', '')

        if file_type == 'pdf':
            text = extract_text_from_pdf(file_path)
            content_parts.append(f"[Contenido del PDF adjunto]:\n{text}\n")
        elif file_type == 'docx':
            text = extract_text_from_docx(file_path)
            content_parts.append(f"[Contenido del documento Word adjunto]:\n{text}\n")
        elif file_type in ('image', 'camera'):
            img_b64 = encode_image_to_base64(file_path)
            images.append(img_b64)
            content_parts.append("[Imagen adjunta - analízala]")
        elif file_type == 'text':
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                content_parts.append(f"[Contenido del archivo de texto adjunto]:\n{text}\n")
            except Exception:
                pass

    if message:
        content_parts.append(message)

    full_message_text = "\n".join(content_parts)

    # Construir mensajes para Ollama
    ollama_messages = [{"role": "system", "content": conv['system_prompt']}]

    recent_messages = conv['messages'][-20:]
    for msg in recent_messages:
        ollama_messages.append({"role": msg['role'], "content": msg['content']})

    ollama_messages.append({"role": "user", "content": full_message_text})

    # Guardar mensaje del usuario
    conv['messages'].append({
        'role': 'user',
        'content': full_message_text,
        'timestamp': datetime.now().isoformat(),
        'attachments': [{'name': a.get('name', ''), 'type': a.get('type', '')} for a in attachments]
    })

    if len(conv['messages']) == 1 and message:
        conv['title'] = message[:50] + ('...' if len(message) > 50 else '')

    # Llamar a Ollama
    assistant_message = chat_with_ollama(ollama_messages, images=images if images else None)

    conv['messages'].append({
        'role': 'assistant',
        'content': assistant_message,
        'timestamp': datetime.now().isoformat()
    })

    save_conversation(conv_id)

    return jsonify({
        'response': assistant_message,
        'conversation_id': conv_id
    })


# --- API DE ARCHIVOS ---

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Sube un archivo al servidor."""
    if 'file' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nombre de archivo vacío'}), 400

    ext = Path(file.filename).suffix
    unique_name = f"{uuid.uuid4()}{ext}"
    filepath = UPLOAD_FOLDER / unique_name
    file.save(str(filepath))

    file_type = 'unknown'
    if ext.lower() == '.pdf':
        file_type = 'pdf'
    elif ext.lower() in ('.doc', '.docx'):
        file_type = 'docx'
    elif ext.lower() in ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'):
        file_type = 'image'
    elif ext.lower() in ('.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.py'):
        file_type = 'text'

    return jsonify({
        'success': True,
        'file': {
            'name': file.filename,
            'path': str(filepath),
            'type': file_type,
            'size': os.path.getsize(str(filepath))
        }
    })


# --- API DE CAMARA ---

@app.route('/api/camera', methods=['POST'])
def camera_capture():
    """Recibe una imagen capturada desde la cámara."""
    data = request.json
    image_data = data.get('image', '')

    if not image_data:
        return jsonify({'error': 'No se recibió imagen'}), 400

    if ',' in image_data:
        image_data = image_data.split(',')[1]

    image_bytes = base64.b64decode(image_data)
    unique_name = f"{uuid.uuid4()}.png"
    filepath = UPLOAD_FOLDER / unique_name

    with open(filepath, 'wb') as f:
        f.write(image_bytes)

    return jsonify({
        'success': True,
        'file': {
            'name': 'captura_camara.png',
            'path': str(filepath),
            'type': 'camera',
            'size': len(image_bytes)
        }
    })


# --- API DE PODCAST ---

@app.route('/api/podcast', methods=['POST'])
def create_podcast():
    """Genera un podcast (audio) a partir de texto."""
    data = request.json
    text = data.get('text', '')
    title = data.get('title', 'Podcast sin título')
    language = data.get('language', 'es')

    if not text:
        return jsonify({'error': 'No se proporcionó texto para el podcast'}), 400

    try:
        tts = gTTS(text=text, lang=language, slow=False)
        unique_name = f"{uuid.uuid4()}.mp3"
        filepath = PODCASTS_FOLDER / unique_name
        tts.save(str(filepath))

        return jsonify({
            'success': True,
            'podcast': {
                'id': unique_name.replace('.mp3', ''),
                'title': title,
                'filename': unique_name,
                'created_at': datetime.now().isoformat(),
                'size': os.path.getsize(str(filepath))
            }
        })
    except Exception as e:
        return jsonify({'error': f'Error al generar podcast: {str(e)}'}), 500


@app.route('/api/podcast/generate', methods=['POST'])
def generate_podcast_script():
    """Genera un guion de podcast usando la IA local."""
    data = request.json
    topic = data.get('topic', '')
    duration = data.get('duration', '5')
    style = data.get('style', 'informativo')

    if not topic:
        return jsonify({'error': 'No se proporcionó un tema'}), 400

    prompt = f"""Genera un guion de podcast sobre el tema: "{topic}".
Duración aproximada: {duration} minutos.
Estilo: {style}.
El guion debe ser natural, como si estuvieras hablando directamente al oyente.
Incluye una introducción, desarrollo del tema y conclusión.
No incluyas indicaciones de producción, solo el texto que se leerá."""

    messages = [
        {"role": "system", "content": "Eres un experto creador de contenido de podcast. Generas guiones naturales y atractivos en español."},
        {"role": "user", "content": prompt}
    ]

    script = chat_with_ollama(messages)

    if script.startswith("⚠️"):
        return jsonify({'error': script}), 500

    return jsonify({'success': True, 'script': script})


@app.route('/api/podcasts', methods=['GET'])
def list_podcasts():
    """Lista todos los podcasts generados."""
    podcasts = []
    for file in PODCASTS_FOLDER.glob('*.mp3'):
        podcasts.append({
            'id': file.stem,
            'filename': file.name,
            'size': file.stat().st_size,
            'created_at': datetime.fromtimestamp(file.stat().st_mtime).isoformat()
        })
    podcasts.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify(podcasts)


@app.route('/api/podcasts/<filename>', methods=['GET'])
def get_podcast(filename):
    """Descarga un podcast."""
    filepath = PODCASTS_FOLDER / filename
    if not filepath.exists():
        return jsonify({'error': 'Podcast no encontrado'}), 404
    return send_file(str(filepath), mimetype='audio/mpeg')


# --- INICIO ---

load_conversations()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5000'))
    print(f"\n{'='*50}")
    print(f"  OmniAI - Asistente de IA Universal")
    print(f"  Con cuentas de Google + IA Local")
    print(f"{'='*50}")
    print(f"\n  Servidor: http://localhost:{port}")
    print(f"  Modelo: {MODEL}")

    if check_ollama():
        models = get_available_models()
        print(f"  Ollama: ✓ Conectado")
        print(f"  Modelos: {', '.join(models) if models else 'ninguno'}")
    else:
        print(f"  Ollama: ✗ No detectado")
        print(f"  Ejecuta: ollama serve")

    print(f"\n{'='*50}\n")
    app.run(host='0.0.0.0', port=port, debug=True)
