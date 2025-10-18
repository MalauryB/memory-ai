# 🧹 Nettoyage du Code Debug - Résumé

## ✅ Ce qui a été fait

### 1. Pages de test supprimées
- ✅ `/app/[locale]/test/page.tsx` - Supprimé
- ✅ `/app/[locale]/test-simple/page.tsx` - Supprimé

### 2. Configuration ESLint
- ✅ Créé [.eslintrc.json](.eslintrc.json) avec règles strictes
- ✅ `no-console: warn` (sauf console.error autorisé)
- ✅ `no-console: error` dans `/app/api/**` (routes API)
- ✅ `no-debugger: error`
- ✅ `no-alert: error`

### 3. Script de détection
- ✅ Créé `scripts/check-debug-code.js`
- ✅ Commande : `npm run check:debug`
- ✅ Génère un rapport JSON
- ✅ Exit code basé sur la sévérité

### 4. Documentation
- ✅ [docs/CODE_CLEANUP.md](CODE_CLEANUP.md) - Guide complet
- ✅ Checklist de 24 routes API à migrer
- ✅ Bonnes pratiques détaillées

## 📊 État Actuel

### Console.log trouvés
**~50 fichiers** contiennent encore des console.log/error/warn

**Répartition :**
- Routes API : ~25 fichiers
- Composants : ~25 fichiers

### Routes Nettoyées
- ✅ `/api/projects/route.ts` (GET, POST)
- ✅ `/api/account/upgrade/route.ts` (GET, POST, DELETE)

**Progression : 2/24 routes API** (8%)

## 🛠️ Utilisation

### Détecter le code debug

```bash
npm run check:debug
```

**Output :**
```bash
🔍 Recherche de code debug...

🟡 console.log trouvés (debug)
   Nombre: 45
   Exemples:
   - components/new-project-form.tsx
   - app/[locale]/page.tsx
   - components/ai-chat.tsx

🔴 console.error dans les routes API (utiliser logger)
   Nombre: 12
   Exemples:
   - app/api/profile/route.ts
   - app/api/trackers/route.ts

📊 Résumé:
   Total: 57 occurrences
   Fichiers affectés: ~29

💡 Actions recommandées:
   1. Migrer les routes API vers le logger Pino
   2. Nettoyer les console.log de debug dans les composants
   3. Supprimer les flags TEST_MODE
   4. Consulter docs/CODE_CLEANUP.md pour le guide complet

📄 Rapport détaillé sauvegardé: debug-report.json
```

### Linter automatique

```bash
npm run lint
```

Détectera automatiquement :
- console.log (warning dans composants)
- console.* (error dans routes API)
- debugger statements
- Variables non utilisées

## 📋 Plan d'Action

### Phase 1 : Routes API (Priorité HAUTE)
**Objectif : Migrer toutes les routes API vers Pino**

```typescript
// Pattern à suivre
import { createAPILogger, logError } from '@/lib/logger'

export async function POST(request: Request) {
  const apiLogger = createAPILogger("/api/route", "POST")
  const startTime = Date.now()

  try {
    apiLogger.info({ userId: user.id }, "Processing request")

    // ... logique ...

    const duration = Date.now() - startTime
    apiLogger.info({ duration: `${duration}ms` }, "Request completed")

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(error, "POST /api/route")
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
```

**Routes à migrer (24) :**
- [ ] `/api/profile/route.ts`
- [ ] `/api/trackers/**/*.ts` (7 fichiers)
- [ ] `/api/projects/[id]/**/*.ts` (7 fichiers)
- [ ] `/api/daily-plan/**/*.ts` (2 fichiers)
- [ ] `/api/ai/**/*.ts` (2 fichiers)
- [ ] `/api/generate-*.ts` (2 fichiers)
- [ ] `/api/agenda/route.ts`
- [ ] `/api/blocked-time-slots/**/*.ts` (2 fichiers)
- [ ] `/api/custom-activities/**/*.ts` (2 fichiers)

### Phase 2 : Composants (Priorité MOYENNE)
**Objectif : Nettoyer les console.log de debug**

```typescript
// ❌ À supprimer
console.log("Component mounted")
console.log("State:", state)

// ✅ Garder pour erreurs critiques
catch (error) {
  console.error("Failed to save:", error)
  toast({ title: "Erreur", variant: "destructive" })
}
```

**~25 composants** à nettoyer

### Phase 3 : Flags de Debug (Priorité HAUTE)
**Objectif : Supprimer tous les flags TEST_MODE**

```bash
# Rechercher
grep -r "TEST_MODE" app/ lib/

# Supprimer les lignes trouvées
```

## 🎯 Objectifs

### Court terme (Cette semaine)
- [x] Configuration ESLint
- [x] Script de détection
- [x] Documentation
- [ ] Migrer 5 routes API majeures

### Moyen terme (2 semaines)
- [ ] 100% des routes API migrées
- [ ] Composants nettoyés
- [ ] Flags de debug supprimés
- [ ] CI/CD avec check automatique

### Long terme (1 mois)
- [ ] Zero console.log en production
- [ ] Monitoring avec Sentry
- [ ] Dashboards de logs

## 📈 Métriques

### Avant nettoyage
- **Routes API avec console.log** : 24/26 (92%)
- **Total console.log** : ~57 occurrences
- **Code Quality** : 7.5/10

### Objectif après nettoyage
- **Routes API avec console.log** : 0/26 (0%)
- **Total console.log** : <5 occurrences (erreurs critiques uniquement)
- **Code Quality** : 8.5/10

## 🚀 Quick Start

1. **Détecter le code debug**
   ```bash
   npm run check:debug
   ```

2. **Consulter le rapport**
   ```bash
   cat debug-report.json
   ```

3. **Migrer une route API**
   - Ouvrir le fichier
   - Importer `createAPILogger`
   - Remplacer tous les console.* par logger.*
   - Tester la route
   - ✅ Cocher dans [CODE_CLEANUP.md](CODE_CLEANUP.md)

4. **Vérifier avec ESLint**
   ```bash
   npm run lint
   ```

## 📚 Ressources

- [CODE_CLEANUP.md](CODE_CLEANUP.md) - Guide détaillé
- [LOGGING.md](LOGGING.md) - Documentation du logger
- [LOGGING_EXAMPLES.md](LOGGING_EXAMPLES.md) - Exemples pratiques
- `.eslintrc.json` - Configuration ESLint
- `scripts/check-debug-code.js` - Script de détection

## 🤝 Contribution

Pour contribuer au nettoyage :
1. Choisir une route/composant dans CODE_CLEANUP.md
2. Nettoyer le code debug
3. Tester localement
4. Vérifier avec `npm run check:debug`
5. Cocher dans la checklist
