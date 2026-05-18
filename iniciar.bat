@echo off
title OmniAI - Asistente de IA Universal (LOCAL)
color 0B
cls

echo ============================================================
echo.
echo     ____                  _    ___    ___
echo    / __ \____ ___  ____  (_)  /   ^|  /  _/
echo   / / / / __ `__ \/ __ \/ /  / /^| ^|  / /  
echo  / /_/ / / / / / / / / / /  / ___ ^|_/ /   
echo  \____/_/ /_/ /_/_/ /_/_/  /_/  ^|_/___/   
echo.
echo  Asistente de IA Universal - 100%% LOCAL
echo  Sin API - Sin costes - Sin internet
echo ============================================================
echo.

:: Verificar si Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta instalado.
    echo.
    echo Descarga Python desde: https://www.python.org/downloads/
    echo Asegurate de marcar "Add Python to PATH" durante la instalacion.
    echo.
    pause
    exit /b 1
)

echo [OK] Python encontrado
echo.

:: Verificar si Ollama esta instalado
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Ollama no esta instalado.
    echo.
    echo Ollama es el motor de IA local que necesitas.
    echo Descargalo GRATIS desde: https://ollama.com
    echo.
    echo Despues de instalarlo, ejecuta estos comandos:
    echo   ollama serve
    echo   ollama pull llama3.2
    echo.
    echo Puedes continuar, pero la IA no funcionara sin Ollama.
    echo.
    pause
) else (
    echo [OK] Ollama encontrado
)

:: Verificar si Ollama esta corriendo
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Iniciando Ollama en segundo plano...
    start /min "" ollama serve
    timeout /t 3 /nobreak >nul
)

echo.

:: Verificar si existe el entorno virtual
if not exist "venv" (
    echo [INFO] Creando entorno virtual...
    python -m venv venv
    echo [OK] Entorno virtual creado
    echo.
)

:: Activar entorno virtual
call venv\Scripts\activate.bat

:: Instalar dependencias si es necesario
if not exist "venv\Lib\site-packages\flask" (
    echo [INFO] Instalando dependencias...
    pip install -r requirements.txt
    echo.
    echo [OK] Dependencias instaladas
    echo.
)

:: Verificar si hay modelos descargados
echo [INFO] Verificando modelos de IA...
ollama list 2>nul | findstr /i "llama" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Descargando modelo de IA (llama3.2)...
    echo Esto puede tardar unos minutos la primera vez...
    echo.
    ollama pull llama3.2
    echo.
    echo [OK] Modelo descargado
)

:: Crear carpetas necesarias
if not exist "uploads" mkdir uploads
if not exist "podcasts" mkdir podcasts
if not exist "conversations" mkdir conversations

echo.
echo ============================================================
echo  Iniciando OmniAI...
echo  Abre tu navegador en: http://localhost:5000
echo.
echo  Todo funciona en tu PC - Sin internet - Sin API
echo  Para detener el servidor presiona Ctrl+C
echo ============================================================
echo.

:: Abrir navegador automaticamente
start http://localhost:5000

:: Iniciar servidor
python app.py

pause
