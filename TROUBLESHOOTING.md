# 🔧 Guide de Dépannage

## Problèmes Fréquents et Solutions

### 🚨 L'application charge dans le vide à l'infini

**Symptômes :**
- Après avoir fait `Ctrl+C` puis relancé `npm run dev`, l'application ne charge pas
- Le serveur semble démarrer mais rien ne s'affiche
- Le navigateur reste bloqué sur "Chargement..."

**Cause :**
Des processus Node.js zombies occupent toujours le port 3000, empêchant le nouveau serveur de démarrer correctement.

**Solution :**

```bash
# Option 1 : Nettoyage complet (recommandé)
npm run clean

# Option 2 : Diagnostic puis nettoyage
npm run diagnose    # Voir l'état du système
npm run clean       # Nettoyer si nécessaire

# Option 3 : Nettoyage + redémarrage en une commande
npm run dev:clean
```

---

### 🔍 Diagnostiquer les Problèmes

Avant de nettoyer, utilisez le script de diagnostic pour comprendre le problème :

```bash
npm run diagnose
```

Le diagnostic affiche :
- ✅ Port 3000 libre ou occupé
- 🖥️ Processus Node/Next actifs
- 📁 État des fichiers de cache
- 📦 Node modules
- 🔐 Variables d'environnement
- ⚙️ Versions Node.js et npm

---

### 🧹 Nettoyage Complet

Le script `clean.js` effectue :
1. ✅ **Tue tous les processus** sur le port 3000
2. ✅ **Tue tous les processus Next.js** zombies
3. ✅ **Supprime le cache** `.next` et `node_modules/.cache`

```bash
npm run clean
# ou
npm run fix
```

**Sortie attendue :**
```
🧹 Nettoyage complet...

🔍 Recherche de processus sur le port 3000...
⚠️  Processus trouvés sur le port 3000: 1360
✓ Processus 1360 tué
✓ Port 3000 maintenant libre

🔍 Recherche de tous les processus Node.js...
⚠️  2 processus Next.js trouvés
✓ Processus Next.js 1360 tué
✓ Processus Next.js 1421 tué

📁 Nettoyage des fichiers de cache...
✓ .next supprimé
✓ node_modules/.cache supprimé

✅ Nettoyage terminé! Vous pouvez maintenant lancer "npm run dev"
```

---

### 🚀 Redémarrage Propre

Après le nettoyage, redémarrez le serveur :

```bash
# Mode développement avec Turbopack (par défaut)
npm run dev

# Mode développement avec nettoyage préalable
npm run dev:clean

# Mode développement avec webpack classique
npm run dev:webpack
```

---

### ⚠️ Si le Problème Persiste

Si après `npm run clean` le problème persiste :

1. **Vérifier manuellement les processus :**
   ```bash
   ps aux | grep node
   ps aux | grep next
   ```

2. **Tuer manuellement un processus spécifique :**
   ```bash
   kill -9 <PID>
   ```

3. **Vérifier le port :**
   ```bash
   ss -tulpn | grep 3000
   ```

4. **Supprimer manuellement tous les caches :**
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   rm -rf .turbo
   ```

5. **En dernier recours, réinstaller les dépendances :**
   ```bash
   rm -rf node_modules
   npm install
   ```

---

### 💡 Prévention

Pour éviter ce problème à l'avenir :

1. **Toujours arrêter le serveur proprement** avec `Ctrl+C` (une seule fois)
2. **Attendre quelques secondes** que le serveur se termine complètement
3. **Utiliser `npm run dev:clean`** pour un redémarrage propre
4. **En cas de doute**, lancer `npm run diagnose` avant de démarrer

---

### 🆘 Aide Supplémentaire

Si aucune de ces solutions ne fonctionne :

1. Vérifiez les logs du serveur pour des erreurs spécifiques
2. Vérifiez que votre fichier `.env.local` est correctement configuré
3. Assurez-vous d'avoir les bonnes versions de Node.js (v18+) et npm
4. Sur WSL, assurez-vous que les permissions sont correctes

---

## Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrer en mode dev (Turbopack) |
| `npm run dev:clean` | Nettoyer puis démarrer |
| `npm run clean` | Nettoyer les processus et caches |
| `npm run fix` | Alias de `clean` |
| `npm run diagnose` | Diagnostiquer les problèmes |
| `npm run build` | Build de production |
| `npm run start` | Démarrer en production |
