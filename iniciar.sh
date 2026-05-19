#!/bin/bash
# OmniAI - Asistente de IA Universal
# Para Linux y macOS

clear
echo "============================================================"
echo ""
echo "  OmniAI - Asistente de IA Universal"
echo "  Funciona con Groq (gratuito, sin instalar nada extra)"
echo ""
echo "============================================================"
echo ""

# Verificar Python
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo "[ERROR] Python no está instalado."
    echo ""
    echo "Instálalo con:"
    echo "  Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv"
    echo "  macOS: brew install python3"
    echo "  Fedora: sudo dnf install python3"
    exit 1
fi

echo "[OK] Python encontrado: $($PYTHON --version)"
echo ""

# Crear entorno virtual
if [ ! -d "venv" ]; then
    echo "[INFO] Creando entorno virtual..."
    $PYTHON -m venv venv
    echo "[OK] Entorno virtual creado"
fi

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
if ! python -c "import flask" 2>/dev/null; then
    echo "[INFO] Instalando dependencias..."
    pip install --upgrade pip
    pip install -r requirements.txt
    echo "[OK] Dependencias instaladas"
fi

# Crear carpetas
mkdir -p uploads podcasts conversations

# Detectar sistema operativo
OS="$(uname -s)"
case "${OS}" in
    Linux*)     SYSTEM=Linux;;
    Darwin*)    SYSTEM=Mac;;
    *)          SYSTEM="UNKNOWN";;
esac

echo ""
echo "============================================================"
echo "  Sistema detectado: $SYSTEM"
echo "  Iniciando OmniAI..."
echo "  Abre tu navegador en: http://localhost:5000"
echo ""
echo "  Para detener: Ctrl+C"
echo "============================================================"
echo ""

# Abrir navegador automáticamente
sleep 2 && (
    if [ "$SYSTEM" = "Mac" ]; then
        open http://localhost:5000
    elif [ "$SYSTEM" = "Linux" ]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:5000
        fi
    fi
) &

# Iniciar servidor
$PYTHON app.py
