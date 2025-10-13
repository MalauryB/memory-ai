# Script PowerShell pour redémarrer proprement le serveur Next.js sur Windows

Write-Host "🛑 Arrêt des processus Node/Next.js..." -ForegroundColor Yellow

# Tuer tous les processus node.exe
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Write-Host "🧹 Nettoyage du cache Next.js..." -ForegroundColor Yellow

# Supprimer le dossier .next
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "   ✓ Dossier .next supprimé" -ForegroundColor Green
}

# Supprimer le cache de node_modules
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "   ✓ Cache node_modules supprimé" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Prêt à redémarrer!" -ForegroundColor Green
Write-Host "Lancez maintenant: npm run dev" -ForegroundColor Cyan
