-- ============================================
-- Migration: Rendre step_id nullable dans project_substeps
-- ============================================
-- Les trackers peuvent être liés directement au projet sans étape spécifique
-- ============================================

-- Rendre step_id nullable
ALTER TABLE project_substeps
ALTER COLUMN step_id DROP NOT NULL;

-- Mettre à jour la fonction pour gérer les substeps sans step_id
CREATE OR REPLACE FUNCTION update_parent_step_status()
RETURNS TRIGGER AS $$
DECLARE
  total_substeps INTEGER;
  completed_substeps INTEGER;
BEGIN
  -- Ne rien faire si la substep n'a pas de step_id (tracker direct)
  IF NEW.step_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Compter les sous-étapes
  SELECT COUNT(*) INTO total_substeps
  FROM project_substeps
  WHERE step_id = NEW.step_id;

  -- Compter les sous-étapes complétées
  SELECT COUNT(*) INTO completed_substeps
  FROM project_substeps
  WHERE step_id = NEW.step_id AND status = 'completed';

  -- Mettre à jour le statut de l'étape parente
  IF total_substeps > 0 AND completed_substeps = total_substeps THEN
    UPDATE project_steps
    SET status = 'completed'
    WHERE id = NEW.step_id;
  ELSIF completed_substeps > 0 THEN
    UPDATE project_steps
    SET status = 'in_progress'
    WHERE id = NEW.step_id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
