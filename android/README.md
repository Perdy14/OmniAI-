# OmniAI - App Android (.apk)

## Cómo generar el APK

### Opción 1: Usando Android Studio (recomendado)

1. Instala [Android Studio](https://developer.android.com/studio)
2. Abre este proyecto (`android/`) en Android Studio
3. Build → Build Bundle(s) / APK(s) → Build APK(s)
4. El APK estará en `app/build/outputs/apk/debug/app-debug.apk`

### Opción 2: Desde la terminal

```bash
cd android
gradlew assembleDebug
```

## Cómo funciona

La app Android es un WebView que se conecta al servidor OmniAI que corre en tu PC.

1. Ejecuta OmniAI en tu PC (con `iniciar.bat` o `OmniAI.exe`)
2. Abre la app en tu móvil Android
3. Introduce la IP de tu PC (ej: `192.168.1.100`)
4. ¡Listo! Usa la IA desde tu móvil

## Requisitos

- Android 7.0+ (API 24)
- El móvil y el PC deben estar en la misma red WiFi
- Ollama corriendo en el PC
