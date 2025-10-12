-- ============================================
-- LIFE ARCHITECT - Enhanced Daily Planning System
-- ============================================
-- Ajout de fonctionnalités avancées pour la planification quotidienne
-- ============================================

-- ============================================
-- 1. Étendre user_profiles avec préférences de planning
-- ============================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location_country TEXT DEFAULT 'France';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS work_hours_start TIME DEFAULT '09:00:00';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS work_hours_end TIME DEFAULT '18:00:00';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_work_hours INTEGER DEFAULT 8 CHECK (daily_work_hours >= 1 AND daily_work_hours <= 16);

-- Préférences de planification
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS planning_intensity TEXT DEFAULT 'moderate' CHECK (planning_intensity IN ('light', 'moderate', 'intense'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS planning_style TEXT DEFAULT 'mixed' CHECK (planning_style IN ('mixed', 'thematic_blocks'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS break_frequency INTEGER DEFAULT 60; -- Minutes entre les pauses

-- ============================================
-- 2. TABLE: custom_activities
-- ============================================
-- Activités personnalisées de l'utilisateur (aller au café, piscine, etc.)
CREATE TABLE IF NOT EXISTS custom_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informations de base
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,

  -- Type et catégorie
  activity_type TEXT DEFAULT 'leisure' CHECK (activity_type IN ('leisure', 'exercise', 'social', 'errands', 'relaxation', 'learning')),
  category TEXT, -- Ex: "Sport", "Culture", "Détente"

  -- Durée estimée
  estimated_duration TEXT DEFAULT '30min',

  -- Possibilité de combiner avec d'autres activités
  can_combine_with TEXT[], -- Ex: ["work", "learning", "relaxation"]

  -- Localisation
  requires_location BOOLEAN DEFAULT false,
  location_name TEXT,
  location_address TEXT,

  -- Fréquence suggérée
  suggested_frequency TEXT DEFAULT 'flexible' CHECK (suggested_frequency IN ('daily', 'weekly', 'flexible')),

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TABLE: activity_locations
-- ============================================
-- Lieux recommandés pour découvrir (basés sur la localisation)
CREATE TABLE IF NOT EXISTS activity_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Localisation
  city TEXT NOT NULL,
  country TEXT DEFAULT 'France',
  name TEXT NOT NULL,
  address TEXT,

  -- Type de lieu
  location_type TEXT NOT NULL CHECK (location_type IN ('cafe', 'library', 'park', 'coworking', 'gym', 'museum', 'restaurant', 'cultural')),

  -- Détails
  description TEXT,
  tags TEXT[], -- Ex: ["wifi", "quiet", "outdoor"]

  -- Notation (optionnelle, pour système de recommandation futur)
  rating DECIMAL(2,1),

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- ============================================
-- 4. Étendre daily_plan_items pour supporter les nouvelles fonctionnalités
-- ============================================
ALTER TABLE daily_plan_items ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'substep' CHECK (item_type IN ('substep', 'tracker', 'custom_activity', 'break', 'suggested_activity'));
ALTER TABLE daily_plan_items ADD COLUMN IF NOT EXISTS custom_activity_id UUID REFERENCES custom_activities(id) ON DELETE SET NULL;
ALTER TABLE daily_plan_items ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES activity_locations(id) ON DELETE SET NULL;
ALTER TABLE daily_plan_items ADD COLUMN IF NOT EXISTS can_be_combined BOOLEAN DEFAULT false;
ALTER TABLE daily_plan_items ADD COLUMN IF NOT EXISTS combined_with_id UUID REFERENCES daily_plan_items(id) ON DELETE SET NULL;
ALTER TABLE daily_plan_items ADD COLUMN IF NOT EXISTS is_break BOOLEAN DEFAULT false;
ALTER TABLE daily_plan_items ADD COLUMN IF NOT EXISTS is_suggested BOOLEAN DEFAULT false; -- Si c'est une suggestion IA
ALTER TABLE daily_plan_items ADD COLUMN IF NOT EXISTS user_accepted BOOLEAN DEFAULT NULL; -- NULL = pas encore décidé, true/false = accepté/refusé

-- ============================================
-- 5. TABLE: planning_preferences_history
-- ============================================
-- Historique des choix de l'utilisateur pour améliorer les suggestions
CREATE TABLE IF NOT EXISTS planning_preferences_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date de la session
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Choix effectués
  chosen_intensity TEXT,
  chosen_style TEXT,

  -- Activités acceptées/refusées
  accepted_suggestions INTEGER DEFAULT 0,
  refused_suggestions INTEGER DEFAULT 0,

  -- Taux de complétion
  completion_rate DECIMAL(5,2), -- Pourcentage de tâches complétées

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES POUR OPTIMISATION
-- ============================================

CREATE INDEX IF NOT EXISTS idx_custom_activities_user_id ON custom_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_activities_type ON custom_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_locations_city ON activity_locations(city);
CREATE INDEX IF NOT EXISTS idx_activity_locations_type ON activity_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_daily_plan_items_type ON daily_plan_items(item_type);
CREATE INDEX IF NOT EXISTS idx_planning_preferences_user_date ON planning_preferences_history(user_id, session_date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE custom_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_preferences_history ENABLE ROW LEVEL SECURITY;
-- activity_locations est publique (pas de RLS)

-- POLICIES: custom_activities
CREATE POLICY "Users can view their own custom activities"
  ON custom_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom activities"
  ON custom_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom activities"
  ON custom_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom activities"
  ON custom_activities FOR DELETE
  USING (auth.uid() = user_id);

-- POLICIES: planning_preferences_history
CREATE POLICY "Users can view their own planning history"
  ON planning_preferences_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planning history"
  ON planning_preferences_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_custom_activities_updated_at
  BEFORE UPDATE ON custom_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONNÉES INITIALES: Lieux d'exemple pour Paris
-- ============================================

INSERT INTO activity_locations (city, country, name, location_type, description, tags) VALUES
  ('Paris', 'France', 'Bibliothèque François Mitterrand', 'library', 'Grande bibliothèque calme avec espaces de travail', ARRAY['wifi', 'quiet', 'study']),
  ('Paris', 'France', 'Jardin du Luxembourg', 'park', 'Parc idéal pour la détente ou lecture', ARRAY['outdoor', 'relaxation', 'nature']),
  ('Paris', 'France', 'Le Café de Flore', 'cafe', 'Café historique parfait pour travailler', ARRAY['wifi', 'historic', 'inspiring']),
  ('Paris', 'France', 'Piscine Joséphine Baker', 'gym', 'Piscine flottante sur la Seine', ARRAY['sport', 'swimming', 'unique']),
  ('Paris', 'France', 'Musée d''Orsay', 'museum', 'Musée d''art impressionniste', ARRAY['cultural', 'art', 'inspiring'])
ON CONFLICT DO NOTHING;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
