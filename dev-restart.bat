@echo off
REM Script Batch pour redémarrer proprement le serveur Next.js sur Windows

echo 🛑 Arrêt des processus Node/Next.js...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 >nul

echo 🧹 Nettoyage du cache Next.js...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo ✅ Prêt à redémarrer!
echo Lancez maintenant: npm run dev
