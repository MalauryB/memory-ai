#!/bin/bash
# Script pour redémarrer proprement le serveur de développement Next.js

echo "🛑 Arrêt des processus Node/Next.js..."
pkill -f "node.*next" || true
pkill -f "next dev" || true

echo "🧹 Nettoyage du cache Next.js..."
rm -rf .next
rm -rf node_modules/.cache

echo "✅ Prêt à redémarrer!"
echo "Lancez maintenant: npm run dev"
