# Guide de migration - Correction des erreurs de schéma

## Problèmes identifiés

1. ❌ Table `tracker_completions` introuvable → doit être `substep_completions`
2. ❌ Colonne `custom_activity_id` manquante dans `daily_plan_items`
3. ❌ Colonne `is_break` manquante dans `daily_plan_items`

## ✅ Corrections appliquées dans le code

Les fichiers suivants ont été corrigés :
- `app/api/trackers/completions/route.ts`
- `app/api/trackers/complete/route.ts`
- `app/api/trackers/route.ts`

Toutes les références à `tracker_completions` ont été remplacées par `substep_completions`.

## 🗃️ Migration SQL à exécuter

Une migration SQL a été créée : `supabase/migrations/003_add_custom_activity_columns.sql`

### Option 1 : Via Supabase Dashboard (Recommandé)

1. Connectez-vous à votre projet Supabase : https://supabase.com/dashboard
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu de `supabase/migrations/003_add_custom_activity_columns.sql`
4. Cliquez sur **Run**

### Option 2 : Via CLI Supabase (si installé)

```bash
# Si vous avez Supabase CLI installé
supabase db push
```

### Option 3 : Exécution manuelle SQL

Connectez-vous au SQL Editor de Supabase et exécutez :

```sql
-- Ajouter la colonne custom_activity_id
ALTER TABLE daily_plan_items
ADD COLUMN IF NOT EXISTS custom_activity_id UUID REFERENCES custom_activities(id) ON DELETE SET NULL;

-- Ajouter la colonne is_break
ALTER TABLE daily_plan_items
ADD COLUMN IF NOT EXISTS is_break BOOLEAN DEFAULT false;

-- Ajouter les commentaires
COMMENT ON COLUMN daily_plan_items.custom_activity_id IS 'Référence vers une activité personnalisée si item_type = custom_activity';
COMMENT ON COLUMN daily_plan_items.is_break IS 'Indique si cet item est une pause (break)';

-- Créer un index
CREATE INDEX IF NOT EXISTS idx_daily_plan_items_custom_activity_id
ON daily_plan_items(custom_activity_id)
WHERE custom_activity_id IS NOT NULL;

-- Mettre à jour les items existants
UPDATE daily_plan_items
SET is_break = true
WHERE item_type = 'break' AND is_break = false;
```

## ✅ Vérification

Après avoir exécuté la migration, vérifiez que tout fonctionne :

1. Redémarrez votre serveur de développement
2. Testez la génération d'un planning
3. Vérifiez qu'il n'y a plus d'erreurs dans la console

Les erreurs suivantes devraient disparaître :
- ❌ `Could not find the table 'public.tracker_completions'`
- ❌ `Could not find the 'custom_activity_id' column`

## 📝 Notes

- La table `substep_completions` existe déjà dans votre schéma
- Le code utilisait incorrectement `tracker_completions` au lieu de `substep_completions`
- La colonne `custom_activity_id` est nécessaire pour les activités personnalisées dans le planning
