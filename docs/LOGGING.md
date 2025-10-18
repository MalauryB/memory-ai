# 📝 Système de Logging

Ce document décrit le système de logging professionnel mis en place dans l'application.

## 🎯 Objectifs

- **Traçabilité** : Suivre toutes les opérations importantes
- **Debugging** : Faciliter l'identification et la résolution des bugs
- **Monitoring** : Surveiller les performances et détecter les anomalies
- **Audit** : Garder un historique des actions utilisateurs

## 🛠️ Stack Technique

- **Logger** : [Pino](https://github.com/pinojs/pino) - Logger haute performance pour Node.js
- **Pretty print** : pino-pretty (dev uniquement)

## 📚 Utilisation

### Logger de base

```typescript
import { logger } from '@/lib/logger'

// Log simple
logger.info("Application started")

// Log avec contexte
logger.info({ userId: "123", action: "login" }, "User logged in")

// Niveaux de log
logger.debug("Debug information")
logger.info("Informational message")
logger.warn("Warning message")
logger.error("Error message")
logger.fatal("Fatal error - app will crash")
```

### Logger pour les routes API

```typescript
import { createAPILogger } from '@/lib/logger'

export async function POST(request: Request) {
  const apiLogger = createAPILogger("/api/projects", "POST")
  const startTime = Date.now()

  apiLogger.info({ userId: user.id }, "Creating new project")

  // ... votre code ...

  const duration = Date.now() - startTime
  apiLogger.info({
    projectId: project.id,
    duration: `${duration}ms`
  }, "Project created successfully")
}
```

### Logger pour Supabase

```typescript
import { createDBLogger } from '@/lib/logger'

const dbLogger = createDBLogger("projects", "INSERT")

dbLogger.info({ projectId: project.id }, "Inserting project")
```

### Logger pour l'IA

```typescript
import { createAILogger } from '@/lib/logger'

const aiLogger = createAILogger("generate-steps")

aiLogger.info({ projectId: "123" }, "Generating project steps with AI")
```

### Gestion des erreurs

```typescript
import { logError } from '@/lib/logger'

try {
  // ... code qui peut échouer ...
} catch (error) {
  logError(error, "Context description")
  // ... gestion de l'erreur ...
}
```

## 📊 Niveaux de Log

| Niveau | Quand l'utiliser | Exemple |
|--------|------------------|---------|
| `debug` | Informations détaillées pour le debugging | Variables, états internes |
| `info` | Opérations normales importantes | "User created", "Payment processed" |
| `warn` | Situations anormales mais gérables | "Rate limit approaching", "Deprecated API used" |
| `error` | Erreurs qui affectent une requête | "Failed to save data", "API error" |
| `fatal` | Erreurs critiques qui arrêtent l'app | "Database connection lost" |

## 🔧 Configuration

### Environnement Development

- Format : Pretty print colorisé avec pino-pretty
- Niveau : `debug` (tous les logs)
- Output : Console

### Environnement Production

- Format : JSON structuré
- Niveau : `info` (info, warn, error, fatal)
- Output : Console (récupérable par des services comme CloudWatch, DataDog, etc.)

### Variables d'environnement

```bash
# Optionnel - Override le niveau de log
LOG_LEVEL=debug  # debug | info | warn | error | fatal
```

## 📝 Bonnes Pratiques

### ✅ À FAIRE

```typescript
// Log avec contexte structuré
apiLogger.info({
  userId: user.id,
  projectId: project.id,
  duration: "150ms"
}, "Project created successfully")

// Log d'erreur avec stack trace
apiLogger.error({
  error: error.message,
  code: error.code,
  userId: user.id
}, "Failed to create project")

// Mesurer les performances
const startTime = Date.now()
// ... opération ...
apiLogger.info({
  duration: `${Date.now() - startTime}ms`
}, "Operation completed")
```

### ❌ À ÉVITER

```typescript
// ❌ console.log en production
console.log("User:", user)

// ❌ Log sans contexte
logger.info("Error happened")

// ❌ Données sensibles dans les logs
logger.info({ password: user.password }, "User login")

// ❌ Logs trop verbeux en boucle
users.forEach(user => {
  logger.info({ user }, "Processing user") // Peut générer des milliers de logs
})
```

## 🔍 Recherche et Filtrage

### En développement (pino-pretty)

Les logs sont automatiquement colorisés et formatés pour être lisibles.

### En production (JSON)

Exemple de log en production :
```json
{
  "level": 30,
  "time": 1677649200000,
  "context": "API",
  "route": "/api/projects",
  "method": "POST",
  "userId": "abc-123",
  "projectId": "xyz-789",
  "duration": "150ms",
  "msg": "Project created successfully"
}
```

Peut être filtré/recherché avec des outils comme :
- `jq` (ligne de commande)
- CloudWatch Insights
- DataDog
- Elastic Stack

## 📈 Migration des console.log

### Routes déjà migrées

- ✅ `/api/projects` (GET, POST)
- ✅ `/api/account/upgrade` (GET, POST, DELETE)

### À migrer

- [ ] `/api/profile`
- [ ] `/api/trackers`
- [ ] `/api/ai/*`
- [ ] Routes Supabase custom

## 🚀 Évolutions Futures

1. **Intégration Sentry** : Pour le monitoring des erreurs en production
2. **Correlation IDs** : Suivre une requête à travers plusieurs services
3. **Métriques** : Temps de réponse, taux d'erreur, etc.
4. **Alertes** : Notifications automatiques sur erreurs critiques
5. **Log rotation** : En production, rotation automatique des fichiers de log

## 📚 Ressources

- [Documentation Pino](https://getpino.io/)
- [Best practices logging Node.js](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)
