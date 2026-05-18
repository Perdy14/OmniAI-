@echo off
title Generando OmniAI.exe
color 0B
cls

echo ============================================================
echo  Generando OmniAI.exe
echo  Esto puede tardar unos minutos...
echo ============================================================
echo.

:: Activar entorno virtual
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat

:: Instalar PyInstaller
pip install pyinstaller

:: Generar .exe
pyinstaller --onefile --name OmniAI --add-data "static;static" --hidden-import flask --hidden-import flask_cors --hidden-import PyPDF2 --hidden-import docx --hidden-import PIL --hidden-import gtts --hidden-import requests --noconfirm --console app.py

echo.
echo ============================================================
echo  ¡Listo! El archivo esta en: dist\OmniAI.exe
echo ============================================================
echo.
pause
