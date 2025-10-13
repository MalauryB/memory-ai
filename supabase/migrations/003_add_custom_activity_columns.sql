-- ============================================
-- Migration: Ajout des colonnes manquantes
-- ============================================
-- Ajout de custom_activity_id et is_break dans daily_plan_items

-- Ajouter la colonne custom_activity_id pour lier les activités personnalisées
ALTER TABLE daily_plan_items
ADD COLUMN IF NOT EXISTS custom_activity_id UUID REFERENCES custom_activities(id) ON DELETE SET NULL;

-- Ajouter la colonne is_break pour identifier les pauses
ALTER TABLE daily_plan_items
ADD COLUMN IF NOT EXISTS is_break BOOLEAN DEFAULT false;

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN daily_plan_items.custom_activity_id IS 'Référence vers une activité personnalisée si item_type = custom_activity';
COMMENT ON COLUMN daily_plan_items.is_break IS 'Indique si cet item est une pause (break)';

-- Créer un index pour les requêtes sur custom_activity_id
CREATE INDEX IF NOT EXISTS idx_daily_plan_items_custom_activity_id
ON daily_plan_items(custom_activity_id)
WHERE custom_activity_id IS NOT NULL;

-- Mise à jour de is_break pour les items existants de type 'break'
UPDATE daily_plan_items
SET is_break = true
WHERE item_type = 'break' AND is_break = false;
