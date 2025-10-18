# 🧹 Guide de Nettoyage du Code

## 📊 État Actuel

### ✅ Déjà Fait
- ✅ Pages de test supprimées (`/test`, `/test-simple`)
- ✅ Logging professionnel implémenté avec Pino
- ✅ Routes `/api/projects` et `/api/account/upgrade` nettoyées

### ⚠️ À Faire

#### 1. Console.log Restants
**50 fichiers** contiennent encore des `console.log/error/warn` :

**Priorité Haute (Routes API) :**
- `app/api/profile/route.ts`
- `app/api/trackers/**/*.ts`
- `app/api/projects/[id]/**/*.ts`
- `app/api/daily-plan/**/*.ts`
- `app/api/dashboard/**/*.ts`
- `app/api/ai/**/*.ts`
- `app/api/generate-*.ts`

**Priorité Moyenne (Composants) :**
- `components/*.tsx` (45 fichiers)
- `app/[locale]/**/*.tsx` (pages)

#### 2. Code de Debug/Test

**Variables de test trouvées :**
```typescript
// ❌ À supprimer
const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"
const DEBUG = true
```

## 🎯 Plan d'Action

### Phase 1 : Routes API (Critique)

Pour chaque route API, remplacer :

```typescript
// ❌ AVANT
console.log("User:", user)
console.error("Error:", error)

// ✅ APRÈS
import { createAPILogger, logError } from '@/lib/logger'

const apiLogger = createAPILogger("/api/exemple", "POST")
apiLogger.info({ userId: user.id }, "User authenticated")
logError(error, "POST /api/exemple")
```

**Routes à migrer :**
1. `/api/profile/route.ts`
2. `/api/trackers/**/*.ts` (7 fichiers)
3. `/api/projects/[id]/**/*.ts` (7 fichiers)
4. `/api/daily-plan/**/*.ts` (2 fichiers)
5. `/api/dashboard/stats/route.ts`
6. `/api/ai/**/*.ts` (2 fichiers)
7. `/api/generate-steps/route.ts`
8. `/api/generate-substeps/route.ts`

### Phase 2 : Composants Client (Important)

Pour les composants, **garder** les console.error pour les erreurs critiques utilisateur :

```typescript
// ✅ OK de garder (erreurs critiques)
try {
  await fetch(...)
} catch (error) {
  console.error("Failed to save data:", error)
  toast({ title: "Erreur", variant: "destructive" })
}

// ❌ À supprimer (debug)
console.log("Component rendered")
console.log("State:", state)
```

### Phase 3 : Code de Debug

Supprimer les flags de test/debug :

```bash
# Rechercher
grep -r "TEST_MODE\|DEBUG\|test mode" app/ lib/

# Supprimer les lignes trouvées
```

## 🛠️ Scripts Utiles

### Trouver tous les console.log

```bash
# Dans les routes API
grep -r "console\." app/api/ --include="*.ts"

# Dans les composants
grep -r "console\.log" components/ app/[locale]/ --include="*.tsx"
```

### Compter les occurrences

```bash
# Nombre total de console.log
grep -r "console\." --include="*.ts" --include="*.tsx" | wc -l
```

### Trouver le code de debug

```bash
# Variables de test/debug
grep -r "TEST_MODE\|DEBUG\|DEVELOPMENT" --include="*.ts" --include="*.tsx"
```

## ✅ Checklist de Nettoyage

### Routes API
- [ ] `/api/profile/route.ts`
- [ ] `/api/trackers/route.ts`
- [ ] `/api/trackers/create/route.ts`
- [ ] `/api/trackers/complete/route.ts`
- [ ] `/api/trackers/completions/route.ts`
- [ ] `/api/trackers/[id]/route.ts`
- [ ] `/api/projects/[id]/route.ts`
- [ ] `/api/projects/[id]/steps/[stepId]/route.ts`
- [ ] `/api/projects/[id]/steps/[stepId]/substeps/route.ts`
- [ ] `/api/projects/[id]/steps/[stepId]/substeps/[substepId]/route.ts`
- [ ] `/api/projects/[id]/trackers/route.ts`
- [ ] `/api/projects/[id]/generate-trackers/route.ts`
- [ ] `/api/daily-plan/route.ts`
- [ ] `/api/daily-plan/items/[id]/route.ts`
- [ ] `/api/dashboard/stats/route.ts`
- [ ] `/api/ai/stats/route.ts`
- [ ] `/api/ai/track-generation/route.ts`
- [ ] `/api/generate-steps/route.ts`
- [ ] `/api/generate-substeps/route.ts`
- [ ] `/api/agenda/route.ts`
- [ ] `/api/blocked-time-slots/route.ts`
- [ ] `/api/blocked-time-slots/[id]/route.ts`
- [ ] `/api/custom-activities/route.ts`
- [ ] `/api/custom-activities/[id]/route.ts`

### Composants
- [ ] Retirer console.log de debug (garder les erreurs critiques)
- [ ] `components/new-project-form.tsx`
- [ ] `components/step-with-substeps.tsx`
- [ ] `components/project-trackers.tsx`
- [ ] Et 40+ autres...

### Code de Debug
- [ ] Supprimer les flags TEST_MODE
- [ ] Supprimer les variables DEBUG hardcodées
- [ ] Nettoyer les commentaires de debug

## 📈 Progression

**Fichiers nettoyés : 2 / 50** (4%)

- ✅ `/api/projects/route.ts`
- ✅ `/api/account/upgrade/route.ts`

**Objectif : 100% des routes API nettoyées**

## 🎓 Bonnes Pratiques

### Routes API
```typescript
// ✅ Utiliser le logger
import { createAPILogger, logError } from '@/lib/logger'

const apiLogger = createAPILogger(route, method)
apiLogger.info({ context }, "Message")
apiLogger.error({ error }, "Error occurred")
```

### Composants Client
```typescript
// ✅ Console.error pour erreurs utilisateur critiques
catch (error) {
  console.error("Critical user error:", error)
  toast({ title: "Erreur", variant: "destructive" })
}

// ❌ Pas de console.log pour debug
console.log("Debug info") // À supprimer
```

### Développement Local
```typescript
// ✅ Si vraiment besoin de debug temporaire
if (process.env.NODE_ENV === 'development') {
  console.log('DEV ONLY:', data)
}

// Mais préférer le logger avec niveau debug
logger.debug({ data }, "Debug information")
```

## 🚀 Impact Attendu

Après nettoyage complet :
- **Code Quality : 8/10 → 8.5/10**
- Build plus propre
- Logs structurés
- Meilleure maintenabilité
- Production-ready
