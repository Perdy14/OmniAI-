#!/bin/bash
# OmniAI - Asistente de IA Universal (LOCAL)
# Sin API - Sin costes - 100% privado

clear
echo "============================================================"
echo ""
echo "  OmniAI - Asistente de IA Universal (LOCAL)"
echo "  Sin API - Sin costes - Sin internet"
echo ""
echo "============================================================"
echo ""

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 no está instalado."
    echo "Instálalo con:"
    echo "  Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv"
    echo "  macOS: brew install python3"
    exit 1
fi

echo "[OK] Python3 encontrado: $(python3 --version)"

# Verificar Ollama
if ! command -v ollama &> /dev/null; then
    echo ""
    echo "[AVISO] Ollama no está instalado."
    echo "Instálalo GRATIS desde: https://ollama.com"
    echo ""
    echo "  Linux: curl -fsSL https://ollama.com/install.sh | sh"
    echo "  macOS: brew install ollama"
    echo ""
    read -p "Presiona Enter para continuar..."
else
    echo "[OK] Ollama encontrado"
    
    # Verificar si Ollama está corriendo
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "[INFO] Iniciando Ollama..."
        ollama serve &
        sleep 3
    fi
    
    # Verificar modelos
    if ! ollama list 2>/dev/null | grep -qi "llama"; then
        echo "[INFO] Descargando modelo llama3.2..."
        ollama pull llama3.2
    fi
fi

echo ""

# Crear entorno virtual
if [ ! -d "venv" ]; then
    echo "[INFO] Creando entorno virtual..."
    python3 -m venv venv
    echo "[OK] Entorno virtual creado"
fi

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
if ! python3 -c "import flask" 2>/dev/null; then
    echo "[INFO] Instalando dependencias..."
    pip install -r requirements.txt
    echo "[OK] Dependencias instaladas"
fi

# Crear carpetas
mkdir -p uploads podcasts conversations

echo ""
echo "============================================================"
echo "  Iniciando OmniAI..."
echo "  Abre tu navegador en: http://localhost:5000"
echo ""
echo "  Todo funciona LOCAL - Sin internet - Sin API"
echo "  Para detener: Ctrl+C"
echo "============================================================"
echo ""

# Abrir navegador
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5000 &
elif command -v open &> /dev/null; then
    open http://localhost:5000 &
fi

# Iniciar servidor
python3 app.py
