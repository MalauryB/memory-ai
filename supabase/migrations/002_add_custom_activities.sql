-- Migration: Ajout de la table custom_activities pour les activités personnalisées
-- Date: 2025-01-13

-- Table pour les activités personnalisées de l'utilisateur
CREATE TABLE IF NOT EXISTS public.custom_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informations de base
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL DEFAULT 'leisure', -- leisure, wellness, social, errands, learning
  icon TEXT DEFAULT 'coffee',
  color TEXT DEFAULT '#6366f1',

  -- Durée et planification
  estimated_duration TEXT NOT NULL DEFAULT '30min',
  can_combine_with TEXT[] DEFAULT '{}', -- IDs des activités combinables

  -- Localisation (optionnelle)
  location_name TEXT,
  location_address TEXT,
  location_type TEXT, -- cafe, park, gym, home, etc.

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index pour les requêtes
  CONSTRAINT custom_activities_user_id_key UNIQUE (user_id, id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_custom_activities_user_id ON public.custom_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_activities_activity_type ON public.custom_activities(activity_type);

-- Politique RLS (Row Level Security)
ALTER TABLE public.custom_activities ENABLE ROW LEVEL SECURITY;

-- Politique : L'utilisateur peut voir uniquement ses propres activités
CREATE POLICY "Users can view own custom activities"
  ON public.custom_activities
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : L'utilisateur peut insérer ses propres activités
CREATE POLICY "Users can insert own custom activities"
  ON public.custom_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : L'utilisateur peut mettre à jour ses propres activités
CREATE POLICY "Users can update own custom activities"
  ON public.custom_activities
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique : L'utilisateur peut supprimer ses propres activités
CREATE POLICY "Users can delete own custom activities"
  ON public.custom_activities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_custom_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_activities_updated_at
  BEFORE UPDATE ON public.custom_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_activities_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE public.custom_activities IS 'Activités personnalisées créées par les utilisateurs pour enrichir leur planning journalier';
COMMENT ON COLUMN public.custom_activities.activity_type IS 'Type d''activité: leisure, wellness, social, errands, learning';
COMMENT ON COLUMN public.custom_activities.can_combine_with IS 'IDs des activités qui peuvent être combinées avec celle-ci (ex: lire + prendre un café)';
