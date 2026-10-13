@echo off
rem MOSAIC 26 kiosk: serves the local build and opens Chrome full screen. Needs only Windows + Chrome.
set "HERE=%~dp0"
start "MOSAIC server" /MIN powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%serve.ps1" -Port 8080 -Root "%HERE%dist-kiosk"
timeout /t 3 /nobreak >nul
start "" chrome --start-fullscreen --user-data-dir="%HERE%chrome-profile" --no-first-run --disable-features=Translate --overscroll-history-navigation=0 http://localhost:8080/
