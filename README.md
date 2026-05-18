# 🧠 OmniAI - Asistente de IA Universal (100% Local)

Un asistente de inteligencia artificial que sabe de **absolutamente todo**, funciona **sin internet**, **sin API**, **sin costes**. Todo se ejecuta en tu propio PC.

![OmniAI](https://img.shields.io/badge/OmniAI-v1.0.0-667eea)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Ollama](https://img.shields.io/badge/Ollama-Local_AI-green)

## ✨ Características

- 🤖 **IA 100% Local** - Sin API, sin internet, sin costes, totalmente privado
- 💬 **Chat ilimitado** - Sin restricciones de preguntas ni respuestas
- 📄 **Archivos** - Sube PDFs, Word, imágenes, código y más
- 📷 **Cámara** - Toma fotos y pregunta sobre ellas
- 🎙️ **Podcasts** - Genera guiones con IA y crea audio
- 🌙 **Tema oscuro/claro** - Interfaz moderna y adaptable
- 📱 **Multiplataforma** - Windows, Linux, macOS, móviles y tablets (PWA)
- 💾 **Historial** - Todas las conversaciones se guardan localmente
- 🔒 **Privacidad total** - Tus datos nunca salen de tu PC

## 🚀 Inicio Rápido

### Paso 1: Instala Ollama (el motor de IA)

Descarga **gratis** desde: https://ollama.com

### Paso 2: Ejecuta la app

**Windows:**
```
Doble clic en iniciar.bat
```

**Linux / macOS:**
```bash
chmod +x iniciar.sh
./iniciar.sh
```

¡Eso es todo! El script se encarga de instalar Python, dependencias y descargar el modelo de IA automáticamente.

## 📋 Requisitos

- **Python 3.9+** ([Descargar](https://www.python.org/downloads/))
- **Ollama** ([Descargar gratis](https://ollama.com))
- **8GB RAM mínimo** (16GB recomendado para modelos grandes)

## 🤖 Modelos de IA Disponibles

Puedes usar cualquier modelo de Ollama. Algunos recomendados:

| Modelo | Tamaño | Descripción |
|--------|--------|-------------|
| `llama3.2` | 2GB | Rápido y ligero (por defecto) |
| `llama3.1` | 4.7GB | Más potente |
| `mistral` | 4.1GB | Excelente para español |
| `llava` | 4.5GB | Puede ver imágenes |
| `codellama` | 3.8GB | Especializado en código |

Para instalar un modelo:
```bash
ollama pull llama3.2
ollama pull llava    # Para análisis de imágenes
```

## 📱 Uso en Móviles y Tablets

OmniAI es una **Progressive Web App (PWA)**:

1. Abre la app en el navegador de tu móvil/tablet usando la IP de tu PC
   (ej: `http://192.168.1.100:5000`)
2. En Chrome: Menú → "Añadir a pantalla de inicio"
3. En Safari: Compartir → "Añadir a pantalla de inicio"
4. Se instalará como una app nativa

## 📂 Estructura del Proyecto

```
ia/
├── app.py              # Backend (Flask + Ollama)
├── requirements.txt    # Dependencias Python
├── iniciar.bat         # Script de inicio (Windows)
├── iniciar.sh          # Script de inicio (Linux/Mac)
├── static/
│   ├── index.html      # Página principal
│   ├── styles.css      # Estilos modernos
│   ├── app.js          # Lógica del frontend
│   ├── manifest.json   # Configuración PWA
│   ├── sw.js           # Service Worker
│   └── icon.svg        # Icono
├── uploads/            # Archivos subidos
├── podcasts/           # Podcasts generados
└── conversations/      # Historial guardado
```

## 🎯 Funcionalidades

### 💬 Chat Universal
- Pregunta sobre cualquier tema sin límites
- Sube archivos para que la IA los analice
- Arrastra y suelta archivos
- Historial completo guardado en tu PC

### 📄 Archivos Soportados
- **PDF** - Extrae y analiza contenido
- **Word (.docx)** - Lee documentos
- **Imágenes** - Analiza con modelo de visión (llava)
- **Texto** - .txt, .md, .csv, .json, .xml, .html, .css, .js, .py

### 📷 Cámara
- Accede a la cámara del dispositivo
- Toma fotos y pregunta a la IA
- Funciona en móviles con cámara trasera

### 🎙️ Podcasts
- La IA genera guiones sobre cualquier tema
- Personaliza duración, estilo e idioma
- Convierte a audio MP3
- Reproduce y descarga

## 🔧 Solución de Problemas

| Problema | Solución |
|----------|----------|
| "Ollama offline" | Ejecuta `ollama serve` en una terminal |
| "Sin modelos" | Ejecuta `ollama pull llama3.2` |
| Respuestas lentas | Usa un modelo más pequeño o cierra otras apps |
| No funciona la cámara | Permite acceso en tu navegador |
| No se ve en el móvil | Usa la IP local de tu PC, no localhost |

## 🔒 Privacidad

- **Todo es local**: La IA se ejecuta en tu PC
- **Sin internet**: No necesita conexión (excepto para descargar modelos la primera vez)
- **Sin API keys**: No hay cuentas ni pagos
- **Sin telemetría**: Tus datos nunca salen de tu máquina
- **Sin límites**: Usa la IA todo lo que quieras

## 📄 Licencia

MIT - Usa este proyecto como quieras.
