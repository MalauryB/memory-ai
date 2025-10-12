-- ============================================
-- Migration: Ajouter start_date aux projets
-- ============================================
-- Permet de définir une date de début pour mieux planifier les étapes
-- ============================================

-- Ajouter la colonne start_date à la table projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Index pour améliorer les performances des requêtes par date
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);

-- Commentaire pour documentation
COMMENT ON COLUMN projects.start_date IS 'Date de début prévue du projet';
COMMENT ON COLUMN projects.deadline IS 'Date de fin prévue du projet (deadline)';
