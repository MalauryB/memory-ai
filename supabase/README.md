# Configuration de la base de données Supabase

## Structure de la base de données

Ce projet utilise deux tables principales :
- `projects` : Contient les projets de vie des utilisateurs
- `project_steps` : Contient les étapes décomposées de chaque projet

## Appliquer les migrations

### Option 1 : Via le SQL Editor de Supabase (Recommandé pour tester)

1. Connectez-vous à votre tableau de bord Supabase : https://app.supabase.com/
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** dans le menu latéral
4. Cliquez sur **New Query**
5. Copiez-collez le contenu du fichier `migrations/001_create_projects_table.sql`
6. Cliquez sur **Run** pour exécuter la migration

### Option 2 : Via Supabase CLI

```bash
# Installer Supabase CLI si ce n'est pas déjà fait
npm install -g supabase

# Se connecter à Supabase
supabase login

# Lier votre projet local au projet Supabase
supabase link --project-ref your-project-ref

# Appliquer les migrations
supabase db push
```

## Vérifier que tout fonctionne

Après avoir appliqué la migration, vérifiez dans votre tableau de bord Supabase :

1. **Table Editor** : Vous devriez voir les tables `projects` et `project_steps`
2. **Database > Policies** : Les RLS (Row Level Security) policies devraient être actives
3. **Database > Indexes** : Les index devraient être créés

## Structure des tables

### Table `projects`

| Colonne       | Type      | Description                              |
|---------------|-----------|------------------------------------------|
| id            | UUID      | Identifiant unique (PK)                  |
| user_id       | UUID      | Référence vers auth.users (FK)           |
| title         | TEXT      | Titre du projet                          |
| description   | TEXT      | Description détaillée                    |
| category      | TEXT      | Catégorie (Carrière, Santé, Personnel...) |
| deadline      | DATE      | Date limite (optionnel)                  |
| progress      | INTEGER   | Pourcentage de progression (0-100)       |
| status        | TEXT      | Statut (active, completed, paused, cancelled) |
| created_at    | TIMESTAMP | Date de création                         |
| updated_at    | TIMESTAMP | Date de dernière modification            |

### Table `project_steps`

| Colonne             | Type      | Description                              |
|---------------------|-----------|------------------------------------------|
| id                  | UUID      | Identifiant unique (PK)                  |
| project_id          | UUID      | Référence vers projects (FK)             |
| title               | TEXT      | Titre de l'étape                         |
| description         | TEXT      | Description de l'étape (optionnel)       |
| estimated_duration  | TEXT      | Durée estimée (ex: "2 semaines")         |
| status              | TEXT      | Statut (pending, in_progress, completed) |
| order_index         | INTEGER   | Ordre d'affichage                        |
| created_at          | TIMESTAMP | Date de création                         |
| updated_at          | TIMESTAMP | Date de dernière modification            |

## Sécurité (RLS)

Les Row Level Security policies garantissent que :
- Les utilisateurs ne peuvent voir que leurs propres projets
- Les utilisateurs ne peuvent créer/modifier/supprimer que leurs propres projets
- Les étapes héritent de la sécurité des projets parents
