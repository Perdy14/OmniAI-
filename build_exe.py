"""
Script para generar el .exe de OmniAI
Ejecuta: python build_exe.py
"""
import subprocess
import sys
import os

def build():
    print("=" * 50)
    print("  Generando OmniAI.exe...")
    print("=" * 50)
    print()

    # Instalar PyInstaller si no está
    subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)

    # Comando de PyInstaller
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--name", "OmniAI",
        "--icon", "static/icon.svg",
        "--add-data", "static;static",
        "--hidden-import", "flask",
        "--hidden-import", "flask_cors",
        "--hidden-import", "PyPDF2",
        "--hidden-import", "docx",
        "--hidden-import", "PIL",
        "--hidden-import", "gtts",
        "--hidden-import", "requests",
        "--noconfirm",
        "--console",
        "app.py"
    ]

    subprocess.run(cmd, check=True)

    print()
    print("=" * 50)
    print("  ¡Listo! El .exe está en: dist/OmniAI.exe")
    print("=" * 50)
    print()
    print("  Para usarlo:")
    print("  1. Asegúrate de tener Ollama instalado y corriendo")
    print("  2. Haz doble clic en OmniAI.exe")
    print("  3. Se abrirá en http://localhost:5000")

if __name__ == "__main__":
    build()
