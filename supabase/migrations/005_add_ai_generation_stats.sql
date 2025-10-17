-- Migration: Ajouter le suivi des générations IA par utilisateur
-- Date: 2025-10-17
-- Description: Crée une table pour compter les générations IA par utilisateur par mois

-- Créer la table ai_generation_stats
CREATE TABLE IF NOT EXISTS ai_generation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM (ex: 2025-10)
  generation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte unique: un seul enregistrement par utilisateur par mois
  UNIQUE(user_id, year_month)
);

-- Ajouter un commentaire sur la table
COMMENT ON TABLE ai_generation_stats IS 'Statistiques de génération IA par utilisateur par mois';
COMMENT ON COLUMN ai_generation_stats.year_month IS 'Mois au format YYYY-MM (ex: 2025-10)';
COMMENT ON COLUMN ai_generation_stats.generation_count IS 'Nombre de générations IA effectuées ce mois-ci';

-- Créer un index sur user_id pour les requêtes rapides
CREATE INDEX IF NOT EXISTS idx_ai_generation_stats_user_id
  ON ai_generation_stats(user_id);

-- Créer un index sur year_month pour filtrer par période
CREATE INDEX IF NOT EXISTS idx_ai_generation_stats_year_month
  ON ai_generation_stats(year_month);

-- Créer un index composite pour les requêtes combinées
CREATE INDEX IF NOT EXISTS idx_ai_generation_stats_user_month
  ON ai_generation_stats(user_id, year_month);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_ai_generation_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER trigger_update_ai_generation_stats_updated_at
  BEFORE UPDATE ON ai_generation_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_generation_stats_updated_at();

-- Row Level Security (RLS)
ALTER TABLE ai_generation_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres stats
CREATE POLICY "Users can view their own AI generation stats"
  ON ai_generation_stats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent insérer leurs propres stats
CREATE POLICY "Users can insert their own AI generation stats"
  ON ai_generation_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres stats
CREATE POLICY "Users can update their own AI generation stats"
  ON ai_generation_stats
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs ne peuvent pas supprimer leurs stats (optionnel)
-- Si vous voulez permettre la suppression, décommentez les lignes suivantes:
-- CREATE POLICY "Users can delete their own AI generation stats"
--   ON ai_generation_stats
--   FOR DELETE
--   USING (auth.uid() = user_id);
