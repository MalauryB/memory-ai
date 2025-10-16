#!/bin/bash

echo "🔥 KILL ULTRA-AGRESSIF DE TOUS LES PROCESSUS NEXT.JS..."
echo ""

# 1. Tuer par port
echo "📡 Libération du port 3000..."
if ss -tulpn 2>/dev/null | grep -q :3000; then
    PIDS=$(ss -tulpn 2>/dev/null | grep :3000 | grep -oP 'pid=\K\d+' | sort -u)
    if [ -n "$PIDS" ]; then
        echo "⚠️  Processus trouvés: $PIDS"
        for PID in $PIDS; do
            kill -9 $PID 2>/dev/null && echo "✓ PID $PID tué" || echo "✗ PID $PID déjà mort"
        done
    fi
else
    echo "✓ Port 3000 déjà libre"
fi

sleep 0.5

# 2. Tuer tous les processus node contenant "next"
echo ""
echo "🖥️  Arrêt de tous les processus Next.js..."
pkill -9 -f "next dev" 2>/dev/null && echo "✓ Processus 'next dev' tués"
pkill -9 -f "next-server" 2>/dev/null && echo "✓ Processus 'next-server' tués"
pkill -9 -f "transform.js" 2>/dev/null && echo "✓ Processus 'transform.js' tués"

sleep 0.5

# 3. Vérification finale
echo ""
echo "🔍 Vérification..."
REMAINING=$(ps aux | grep -E "(next dev|next-server)" | grep -v grep | wc -l)
if [ "$REMAINING" -gt 0 ]; then
    echo "⚠️  Il reste $REMAINING processus"
    ps aux | grep -E "(next dev|next-server)" | grep -v grep
else
    echo "✓ Tous les processus Next.js ont été arrêtés"
fi

if ss -tulpn 2>/dev/null | grep -q :3000; then
    echo "⚠️  Le port 3000 est toujours occupé"
else
    echo "✓ Port 3000 libre"
fi

echo ""
echo "✅ Nettoyage des processus terminé"
