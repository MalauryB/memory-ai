-- Créer la table project_substeps pour décomposer les étapes en sous-étapes détaillées
CREATE TABLE IF NOT EXISTS project_substeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES project_steps(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  order_index INTEGER NOT NULL DEFAULT 0,

  -- Gestion de la récurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type TEXT CHECK (recurrence_type IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  recurrence_count INTEGER DEFAULT 1, -- Nombre de fois à répéter

  -- Dates
  scheduled_date DATE,
  completed_date TIMESTAMPTZ,

  -- Métadonnées
  estimated_duration TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_project_substeps_step_id ON project_substeps(step_id);
CREATE INDEX idx_project_substeps_project_id ON project_substeps(project_id);
CREATE INDEX idx_project_substeps_status ON project_substeps(status);
CREATE INDEX idx_project_substeps_scheduled_date ON project_substeps(scheduled_date);

-- Activer RLS
ALTER TABLE project_substeps ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent gérer les sous-étapes de leurs propres projets
CREATE POLICY "Users can view substeps of their own projects"
  ON project_substeps
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert substeps in their own projects"
  ON project_substeps
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update substeps in their own projects"
  ON project_substeps
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete substeps from their own projects"
  ON project_substeps
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_project_substeps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_project_substeps_updated_at
  BEFORE UPDATE ON project_substeps
  FOR EACH ROW
  EXECUTE FUNCTION update_project_substeps_updated_at();

-- Fonction pour mettre à jour le statut de l'étape parente quand toutes les sous-étapes sont terminées
CREATE OR REPLACE FUNCTION update_parent_step_status()
RETURNS TRIGGER AS $$
DECLARE
  total_substeps INTEGER;
  completed_substeps INTEGER;
BEGIN
  -- Compter les sous-étapes
  SELECT COUNT(*) INTO total_substeps
  FROM project_substeps
  WHERE step_id = NEW.step_id;

  -- Compter les sous-étapes complétées
  SELECT COUNT(*) INTO completed_substeps
  FROM project_substeps
  WHERE step_id = NEW.step_id AND status = 'completed';

  -- Si toutes les sous-étapes sont complétées, marquer l'étape comme complétée
  IF total_substeps > 0 AND completed_substeps = total_substeps THEN
    UPDATE project_steps
    SET status = 'completed'
    WHERE id = NEW.step_id;
  -- Si au moins une sous-étape est en cours, marquer l'étape comme en cours
  ELSIF completed_substeps > 0 THEN
    UPDATE project_steps
    SET status = 'in_progress'
    WHERE id = NEW.step_id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour l'étape parente
CREATE TRIGGER update_parent_step_on_substep_change
  AFTER INSERT OR UPDATE OF status ON project_substeps
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_step_status();
