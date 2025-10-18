# 🎨 Exemples de Logs

## Exemple 1 : Création d'un projet

### En développement (avec pino-pretty)

```bash
[15:32:41] INFO (API): User authenticated
    route: "/api/projects"
    method: "POST"
    userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

[15:32:41] INFO (API): Creating project
    route: "/api/projects"
    method: "POST"
    userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    projectData: {
      title: "Apprendre le piano",
      category: "Apprentissage",
      hasSteps: true
    }

[15:32:41] INFO (API): Project created successfully
    route: "/api/projects"
    method: "POST"
    projectId: "proj_xyz123"

[15:32:41] INFO (API): Creating project steps
    route: "/api/projects"
    method: "POST"
    projectId: "proj_xyz123"
    stepsCount: 5

[15:32:41] INFO (API): Project steps created
    route: "/api/projects"
    method: "POST"
    projectId: "proj_xyz123"
    stepsCount: 5

[15:32:41] INFO (API): Project creation completed
    route: "/api/projects"
    method: "POST"
    projectId: "proj_xyz123"
    duration: "150ms"
```

### En production (JSON)

```json
{"level":30,"time":1677649200000,"context":"API","route":"/api/projects","method":"POST","userId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","msg":"User authenticated"}
{"level":30,"time":1677649200050,"context":"API","route":"/api/projects","method":"POST","userId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","projectData":{"title":"Apprendre le piano","category":"Apprentissage","hasSteps":true},"msg":"Creating project"}
{"level":30,"time":1677649200100,"context":"API","route":"/api/projects","method":"POST","projectId":"proj_xyz123","msg":"Project created successfully"}
{"level":30,"time":1677649200110,"context":"API","route":"/api/projects","method":"POST","projectId":"proj_xyz123","stepsCount":5,"msg":"Creating project steps"}
{"level":30,"time":1677649200130,"context":"API","route":"/api/projects","method":"POST","projectId":"proj_xyz123","stepsCount":5,"msg":"Project steps created"}
{"level":30,"time":1677649200150,"context":"API","route":"/api/projects","method":"POST","projectId":"proj_xyz123","duration":"150ms","msg":"Project creation completed"}
```

## Exemple 2 : Erreur lors de la création

```bash
[15:33:12] WARN (API): Missing required fields
    route: "/api/projects"
    method: "POST"
    title: ""
    description: ""

[15:33:15] ERROR (API): Failed to create project
    route: "/api/projects"
    method: "POST"
    error: "duplicate key value violates unique constraint"
    code: "23505"
    details: "Key (title)=(Mon projet) already exists."
```

## Exemple 3 : Upgrade vers Premium

```bash
[16:45:22] INFO (API): User authenticated
    route: "/api/account/upgrade"
    method: "POST"
    userId: "user_abc123"

[16:45:22] INFO (API): Processing premium upgrade request
    route: "/api/account/upgrade"
    method: "POST"
    userId: "user_abc123"

[16:45:22] WARN (API): Payment integration not yet implemented - upgrading directly
    route: "/api/account/upgrade"
    method: "POST"
    userId: "user_abc123"

[16:45:22] INFO (API): Account successfully upgraded to premium
    route: "/api/account/upgrade"
    method: "POST"
    userId: "user_abc123"
    duration: "45ms"
```

## Exemple 4 : Tentative d'accès non autorisé

```bash
[17:20:05] WARN (API): Unauthorized access attempt
    route: "/api/projects"
    method: "GET"
```

## Exemple 5 : Récupération de projets

```bash
[18:10:30] INFO (API): Fetching projects
    route: "/api/projects"
    method: "GET"
    userId: "user_def456"

[18:10:30] INFO (API): Projects fetched successfully
    route: "/api/projects"
    method: "GET"
    userId: "user_def456"
    projectsCount: 12
    duration: "85ms"
```

## 📊 Filtrage en Production

### Avec jq (ligne de commande)

```bash
# Filtrer par niveau ERROR
cat logs.json | jq 'select(.level == 50)'

# Filtrer par utilisateur
cat logs.json | jq 'select(.userId == "user_abc123")'

# Filtrer par route
cat logs.json | jq 'select(.route == "/api/projects")'

# Logs lents (> 200ms)
cat logs.json | jq 'select(.duration and (.duration | ltrimstr("ms") | tonumber > 200))'

# Compter les erreurs par route
cat logs.json | jq -s 'group_by(.route) | map({route: .[0].route, errors: map(select(.level == 50)) | length})'
```

### Avec CloudWatch Insights

```sql
-- Erreurs dans les dernières 24h
fields @timestamp, msg, error, userId
| filter level = 50
| sort @timestamp desc

-- Performance moyenne par route
fields route, duration
| stats avg(duration) by route

-- Top 10 utilisateurs actifs
fields userId
| stats count() by userId
| sort count desc
| limit 10
```

## 🎯 Cas d'Usage Pratiques

### Debug : Trouver pourquoi un projet ne se crée pas

```bash
# Filtrer tous les logs d'un utilisateur spécifique
cat logs.json | jq 'select(.userId == "problematic_user_id")'

# Voir la séquence complète de création
cat logs.json | jq 'select(.route == "/api/projects" and .method == "POST")'
```

### Performance : Identifier les routes lentes

```bash
# Routes avec durée > 500ms
cat logs.json | jq 'select(.duration and (.duration | ltrimstr("ms") | tonumber > 500))'
```

### Monitoring : Compter les erreurs

```bash
# Nombre d'erreurs par heure
cat logs.json | jq -s 'group_by(.time / 3600000 | floor) | map({hour: (.[0].time / 3600000 | floor), errors: map(select(.level >= 50)) | length})'
```
