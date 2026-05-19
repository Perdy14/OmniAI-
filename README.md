# 🧠 OmniAI - Asistente de IA Universal

Un asistente de inteligencia artificial que sabe de **absolutamente todo**, con interfaz moderna y disponible en **todas las plataformas**.

![OmniAI](https://img.shields.io/badge/OmniAI-v3.0-667eea)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Características

- 🤖 **Chat con IA** — Pregunta cualquier cosa, sobre cualquier tema, sin límites
- 📷 **Análisis de imágenes** — Sube una foto y la IA te explica qué ve
- 🎨 **Generador de imágenes** — Crea imágenes con IA describiendo lo que quieres
- 🎙️ **Creador de podcasts** — Genera guiones con IA y conviértelos en audio
- 📄 **Análisis de documentos** — Sube PDFs, Word, código y otros archivos
- 🎤 **Entrada por voz** — Habla en vez de escribir
- 🌐 **Traducción automática** — Traduce respuestas al instante
- 💾 **Exportar conversaciones** — Guarda tus chats como TXT
- 🌙 **Tema oscuro/claro** — Interfaz adaptable
- 🔐 **Login con Google** — Sincroniza tus conversaciones

## 📥 Descargas

Ve a la pestaña [**Releases**](../../releases) y descarga la versión para tu dispositivo:

| Plataforma | Archivo | Cómo usarlo |
|------------|---------|-------------|
| 🪟 **Windows** | `OmniAI_Setup.exe` | Doble clic, instala como cualquier programa |
| 🐧 **Linux** | Código fuente + `iniciar.sh` | Ver instrucciones abajo |
| 🍎 **macOS** | Código fuente + `iniciar.sh` | Ver instrucciones abajo |
| 🤖 **Android** | `OmniAI.apk` | Permitir orígenes desconocidos e instalar |
| 📱 **iPhone/iPad** | PWA | Abrir web y añadir a pantalla de inicio |

## 🚀 Instalación por sistema

### 🪟 Windows

1. Descarga `OmniAI_Setup.exe` desde Releases
2. Doble clic para instalar
3. Se creará un acceso directo en el escritorio
4. Listo, doble clic y se abre en tu navegador

### 🐧 Linux / 🍎 macOS

```bash
# Clonar el repositorio
git clone https://github.com/Perdy14/OmniAI-.git
cd OmniAI-

# Dar permisos al script
chmod +x iniciar.sh

# Ejecutar
./iniciar.sh
```

El script instala todo automáticamente y abre el navegador.

### 🤖 Android

1. Descarga `OmniAI.apk` desde Releases
2. En tu móvil ve a **Ajustes → Seguridad** y permite "Instalar apps desconocidas"
3. Abre el archivo descargado
4. Listo

### 📱 iPhone / iPad

Como Apple no permite instalar apps fuera de la App Store sin pagar, usa la versión web:

1. Abre Safari y ve a la URL donde tengas alojado OmniAI
2. Toca el botón compartir
3. Selecciona **"Añadir a pantalla de inicio"**
4. Se instala como una app nativa

## 📋 Requisitos

- **Windows**: Windows 10/11
- **Linux**: Cualquier distribución con Python 3.9+
- **macOS**: macOS 11+ con Python 3.9+
- **Android**: Android 7.0+
- **Conexión a internet**: Sí (la IA funciona en la nube via Groq, gratis)

## 🎯 Funcionalidades

### 💬 Chat Universal
- Responde sobre cualquier tema
- Mantiene contexto de la conversación
- Soporta Markdown (código, listas, formato)
- Botones para copiar, traducir, regenerar y editar mensajes

### 📷 Cámara y Visión
- Toma fotos en tiempo real
- Analiza imágenes con IA (vision)
- Describe lo que ve, identifica objetos, lee texto

### 🎨 Generador de Imágenes
- Describe la imagen en español
- La IA traduce y la genera
- Historial de imágenes creadas
- Descarga directa

### 🎙️ Podcasts
- Genera guiones con IA sobre cualquier tema
- Conviértelos en audio con voces realistas
- Reproduce desde el dispositivo

## 🔧 Configuración

La app usa **Groq** (IA en la nube, gratuita) por defecto. No necesitas configurar nada.

Si quieres usar tu propia API key de Groq, edita `config.py`:
```python
GROQ_API_KEY = "tu_api_key_aqui"
```

Obtén una gratis en: https://console.groq.com

## 📂 Estructura del Proyecto

```
OmniAI/
├── app.py              # Servidor Flask
├── requirements.txt    # Dependencias Python
├── iniciar.bat         # Script Windows
├── iniciar.sh          # Script Linux/Mac
├── installer.iss       # Configuración Inno Setup
├── static/             # Frontend web
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── ...
└── android/            # Proyecto Android Studio
    └── app/...
```

## 🤝 Contribuir

Este es un proyecto personal pero las contribuciones son bienvenidas. Abre un issue o pull request.

## 📄 Licencia

MIT - Usa este proyecto como quieras.

## 👤 Autor

Antonio Beltrán - [@Perdy14](https://github.com/Perdy14)
