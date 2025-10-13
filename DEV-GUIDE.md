# Guide de développement - Life Architect

## Problème : Erreurs 404 après modification de fichiers

Si vous rencontrez des erreurs comme :
```
Failed to load resource: the server responded with a status of 404 (Not Found)
webpack.js:1
layout.js:1
app-pages-internals.js:1
```

### Solutions rapides

#### 1. Redémarrer le serveur proprement (sans redémarrer le PC)

**Option A - Script automatique (PowerShell)** :
```powershell
.\dev-restart.ps1
npm run dev
```

**Option B - Script automatique (Batch/CMD)** :
```cmd
dev-restart.bat
npm run dev
```

**Option C - Commandes manuelles PowerShell** :
```powershell
# Tuer tous les processus Node
Get-Process -Name node | Stop-Process -Force

# Nettoyer le cache
npm run clean

# Redémarrer
npm run dev
```

**Option D - Commandes manuelles CMD** :
```cmd
# Tuer tous les processus Node
taskkill /F /IM node.exe

# Nettoyer le cache
npm run clean

# Redémarrer
npm run dev
```

#### 2. Démarrer avec nettoyage automatique
```bash
npm run dev:clean
```

#### 3. Essayer Turbopack (plus stable sur WSL)
```bash
npm run dev:turbo
```

### Changements appliqués

#### next.config.mjs
- Ajout de `watchOptions` avec polling pour WSL
- Améliore la détection des changements de fichiers sur WSL2

#### package.json - Nouveaux scripts
- `npm run dev:clean` - Nettoie `.next` avant de démarrer
- `npm run dev:turbo` - Utilise Turbopack (plus rapide et stable)
- `npm run clean` - Nettoie tous les caches

### Pourquoi ce problème arrive ?

Sur WSL2, le Hot Module Replacement (HMR) de Next.js peut parfois :
1. Perdre la trace des fichiers modifiés
2. Garder des références vers d'anciens bundles
3. Ne pas détecter les changements à cause du système de fichiers Windows/Linux

Le polling dans `watchOptions` force Next.js à vérifier régulièrement les changements au lieu de s'appuyer uniquement sur les événements du système de fichiers.

### Prévention

Pour éviter le problème :
1. Utilisez `npm run dev:turbo` par défaut (plus stable)
2. Arrêtez proprement le serveur avec `Ctrl+C` avant de fermer le terminal
3. Si vous voyez des erreurs, utilisez `./dev-restart.sh` immédiatement

### Si rien ne fonctionne

```bash
# Nettoyage complet
pkill -f node
rm -rf .next node_modules/.cache
npm run dev
```
