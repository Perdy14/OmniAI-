@echo off
title Generando instalador OmniAI
echo ============================================================
echo  Generando instalador OmniAI_Setup.exe
echo ============================================================
echo.
echo Para generar el instalador necesitas Inno Setup:
echo Descargalo gratis en: https://jrsoftware.org/isdl.php
echo.
echo Una vez instalado, ejecuta este comando:
echo   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
echo.
echo O abre installer.iss con Inno Setup y dale a Compilar.
echo.

:: Intentar compilar automaticamente
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    echo [INFO] Inno Setup encontrado, compilando...
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
    echo.
    echo [OK] Instalador generado en: installer_output\OmniAI_Setup.exe
) else (
    echo [AVISO] Inno Setup no encontrado.
    echo Instalalo desde: https://jrsoftware.org/isdl.php
)

echo.
pause
