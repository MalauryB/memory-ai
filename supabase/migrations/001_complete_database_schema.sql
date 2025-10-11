-- ============================================
-- LIFE ARCHITECT - SCHÉMA COMPLET DE BASE DE DONNÉES
-- ============================================
-- Ce fichier contient l'intégralité du schéma optimisé
-- Système unifié : projets > étapes > sous-étapes (avec tracking intégré)
-- ============================================

-- ============================================
-- 1. TABLE: user_profiles
-- ============================================
-- Profils utilisateurs avec préférences
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Préférences
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  timezone TEXT DEFAULT 'Europe/Paris',

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TABLE: projects
-- ============================================
-- Projets de vie de l'utilisateur
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informations de base
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  image_url TEXT,

  -- Progression et statut
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),

  -- Dates
  deadline DATE,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TABLE: project_steps
-- ============================================
-- Grandes étapes d'un projet
CREATE TABLE IF NOT EXISTS project_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Informations
  title TEXT NOT NULL,
  description TEXT,
  estimated_duration TEXT,

  -- Statut et ordre
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  order_index INTEGER NOT NULL,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. TABLE: project_substeps
-- ============================================
-- Sous-étapes détaillées avec système de tracking intégré
CREATE TABLE IF NOT EXISTS project_substeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES project_steps(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Informations de base
  title TEXT NOT NULL,
  description TEXT,
  estimated_duration TEXT,
  notes TEXT,

  -- Statut et ordre
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  order_index INTEGER NOT NULL DEFAULT 0,

  -- ============================================
  -- SYSTÈME DE RÉCURRENCE ET TRACKING
  -- ============================================
  -- Activation du tracking (convertit la substep en "tracker")
  tracking_enabled BOOLEAN DEFAULT false,

  -- Configuration de la récurrence
  recurrence_type TEXT DEFAULT 'once' CHECK (recurrence_type IN ('once', 'daily', 'every_x_days', 'weekly', 'monthly', 'custom')),
  recurrence_value INTEGER DEFAULT 1, -- Ex: tous les X jours
  recurrence_days INTEGER[], -- Pour hebdomadaire: [0,1,2,3,4,5,6] (0=dimanche)

  -- Dates de récurrence
  recurrence_start_date DATE,
  recurrence_end_date DATE,

  -- Statistiques de tracking (mises à jour automatiquement)
  total_completions INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_completed_date DATE,

  -- Dates pour les tâches ponctuelles
  scheduled_date DATE,
  completed_date TIMESTAMPTZ,

  -- Apparence (pour le tracking)
  icon TEXT,
  color TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TABLE: substep_completions
-- ============================================
-- Historique des complétions pour les substeps avec tracking
CREATE TABLE IF NOT EXISTS substep_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  substep_id UUID NOT NULL REFERENCES project_substeps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date de complétion
  completion_date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Informations supplémentaires
  notes TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte: une seule complétion par jour par substep
  UNIQUE(substep_id, completion_date)
);

-- ============================================
-- 6. TABLE: daily_plans
-- ============================================
-- Plans journaliers de l'utilisateur
CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,

  -- Statistiques
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  available_hours INTEGER DEFAULT 8,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un seul plan par jour par utilisateur
  UNIQUE(user_id, plan_date)
);

-- ============================================
-- 7. TABLE: daily_plan_items
-- ============================================
-- Items individuels d'un plan journalier
CREATE TABLE IF NOT EXISTS daily_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  substep_id UUID REFERENCES project_substeps(id) ON DELETE CASCADE,

  -- Informations de la tâche
  title TEXT NOT NULL,
  description TEXT,

  -- Horaire et ordre
  scheduled_time TIME,
  order_index INTEGER NOT NULL DEFAULT 0,

  -- Statut
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES POUR OPTIMISATION DES PERFORMANCES
-- ============================================

-- user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline);

-- project_steps
CREATE INDEX IF NOT EXISTS idx_project_steps_project_id ON project_steps(project_id);
CREATE INDEX IF NOT EXISTS idx_project_steps_status ON project_steps(status);
CREATE INDEX IF NOT EXISTS idx_project_steps_order ON project_steps(project_id, order_index);

-- project_substeps
CREATE INDEX IF NOT EXISTS idx_project_substeps_step_id ON project_substeps(step_id);
CREATE INDEX IF NOT EXISTS idx_project_substeps_project_id ON project_substeps(project_id);
CREATE INDEX IF NOT EXISTS idx_project_substeps_status ON project_substeps(status);
CREATE INDEX IF NOT EXISTS idx_project_substeps_tracking ON project_substeps(tracking_enabled) WHERE tracking_enabled = true;
CREATE INDEX IF NOT EXISTS idx_project_substeps_scheduled_date ON project_substeps(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_project_substeps_user_tracking ON project_substeps(project_id, tracking_enabled) WHERE tracking_enabled = true;

-- substep_completions
CREATE INDEX IF NOT EXISTS idx_substep_completions_substep_id ON substep_completions(substep_id);
CREATE INDEX IF NOT EXISTS idx_substep_completions_user_id ON substep_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_substep_completions_date ON substep_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_substep_completions_substep_date ON substep_completions(substep_id, completion_date);

-- daily_plans
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_id ON daily_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(plan_date);
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, plan_date);

-- daily_plan_items
CREATE INDEX IF NOT EXISTS idx_daily_plan_items_plan_id ON daily_plan_items(daily_plan_id);
CREATE INDEX IF NOT EXISTS idx_daily_plan_items_substep_id ON daily_plan_items(substep_id);
CREATE INDEX IF NOT EXISTS idx_daily_plan_items_completed ON daily_plan_items(completed);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_substeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE substep_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plan_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: user_profiles
-- ============================================
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- POLICIES: projects
-- ============================================
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: project_steps
-- ============================================
CREATE POLICY "Users can view steps of their own projects"
  ON project_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_steps.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create steps for their own projects"
  ON project_steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_steps.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update steps of their own projects"
  ON project_steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_steps.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete steps of their own projects"
  ON project_steps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_steps.project_id
    AND projects.user_id = auth.uid()
  ));

-- ============================================
-- POLICIES: project_substeps
-- ============================================
CREATE POLICY "Users can view substeps of their own projects"
  ON project_substeps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_substeps.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert substeps in their own projects"
  ON project_substeps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_substeps.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update substeps in their own projects"
  ON project_substeps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_substeps.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete substeps from their own projects"
  ON project_substeps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_substeps.project_id
    AND projects.user_id = auth.uid()
  ));

-- ============================================
-- POLICIES: substep_completions
-- ============================================
CREATE POLICY "Users can view their own completions"
  ON substep_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own completions"
  ON substep_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completions"
  ON substep_completions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions"
  ON substep_completions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: daily_plans
-- ============================================
CREATE POLICY "Users can view their own daily plans"
  ON daily_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily plans"
  ON daily_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily plans"
  ON daily_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily plans"
  ON daily_plans FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: daily_plan_items
-- ============================================
CREATE POLICY "Users can view items of their own plans"
  ON daily_plan_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = daily_plan_items.daily_plan_id
    AND daily_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert items in their own plans"
  ON daily_plan_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = daily_plan_items.daily_plan_id
    AND daily_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can update items in their own plans"
  ON daily_plan_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = daily_plan_items.daily_plan_id
    AND daily_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from their own plans"
  ON daily_plan_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = daily_plan_items.daily_plan_id
    AND daily_plans.user_id = auth.uid()
  ));

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS: updated_at
-- ============================================

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_steps_updated_at
  BEFORE UPDATE ON project_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_substeps_updated_at
  BEFORE UPDATE ON project_substeps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_plans_updated_at
  BEFORE UPDATE ON daily_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_plan_items_updated_at
  BEFORE UPDATE ON daily_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FONCTIONS MÉTIER: Gestion des étapes parentes
-- ============================================

-- Fonction pour mettre à jour le statut de l'étape parente
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

CREATE TRIGGER update_parent_step_on_substep_change
  AFTER INSERT OR UPDATE OF status ON project_substeps
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_step_status();

-- ============================================
-- FONCTIONS MÉTIER: Statistiques de tracking
-- ============================================

-- Fonction pour mettre à jour les statistiques de tracking d'une substep
CREATE OR REPLACE FUNCTION update_substep_tracking_stats()
RETURNS TRIGGER AS $$
DECLARE
  completion_dates DATE[];
  streak_count INTEGER;
  max_streak INTEGER;
  temp_streak INTEGER;
  i INTEGER;
BEGIN
  -- Ne s'applique qu'aux substeps avec tracking activé
  IF NOT EXISTS (
    SELECT 1 FROM project_substeps
    WHERE id = NEW.substep_id AND tracking_enabled = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Mettre à jour total_completions
  UPDATE project_substeps
  SET total_completions = (
    SELECT COUNT(*) FROM substep_completions
    WHERE substep_id = NEW.substep_id
  ),
  last_completed_date = NEW.completion_date
  WHERE id = NEW.substep_id;

  -- Récupérer toutes les dates de complétion triées
  SELECT ARRAY_AGG(completion_date ORDER BY completion_date DESC)
  INTO completion_dates
  FROM substep_completions
  WHERE substep_id = NEW.substep_id
  ORDER BY completion_date DESC;

  streak_count := 0;
  max_streak := 0;

  IF completion_dates IS NOT NULL AND array_length(completion_dates, 1) > 0 THEN
    -- Calculer le streak actuel (depuis aujourd'hui ou hier)
    FOR i IN 1..array_length(completion_dates, 1) LOOP
      IF i = 1 THEN
        -- Le premier jour doit être aujourd'hui ou hier
        IF completion_dates[i] >= CURRENT_DATE - INTERVAL '1 day' THEN
          streak_count := 1;
        ELSE
          EXIT;
        END IF;
      ELSE
        -- Vérifier si c'est le jour précédent
        IF completion_dates[i] = completion_dates[i-1] - INTERVAL '1 day' THEN
          streak_count := streak_count + 1;
        ELSE
          EXIT;
        END IF;
      END IF;
    END LOOP;

    -- Calculer le meilleur streak
    temp_streak := 1;
    max_streak := 1;

    FOR i IN 2..array_length(completion_dates, 1) LOOP
      IF completion_dates[i] = completion_dates[i-1] - INTERVAL '1 day' THEN
        temp_streak := temp_streak + 1;
        IF temp_streak > max_streak THEN
          max_streak := temp_streak;
        END IF;
      ELSE
        temp_streak := 1;
      END IF;
    END LOOP;
  END IF;

  -- Mettre à jour les streaks
  UPDATE project_substeps
  SET
    current_streak = streak_count,
    best_streak = GREATEST(best_streak, max_streak, streak_count)
  WHERE id = NEW.substep_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_substep_stats_on_completion
  AFTER INSERT ON substep_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_substep_tracking_stats();

-- Fonction pour recalculer les stats quand une complétion est supprimée
CREATE OR REPLACE FUNCTION recalculate_substep_stats_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM substep_completions WHERE substep_id = OLD.substep_id) THEN
    -- Recalculer depuis la dernière complétion restante
    PERFORM update_substep_tracking_stats_for_substep(OLD.substep_id);
  ELSE
    -- Plus de complétions, reset à 0
    UPDATE project_substeps
    SET
      total_completions = 0,
      current_streak = 0,
      last_completed_date = NULL
    WHERE id = OLD.substep_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_substep_stats_on_completion_delete
  AFTER DELETE ON substep_completions
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_substep_stats_on_delete();

-- Helper pour recalculer manuellement les stats d'une substep
CREATE OR REPLACE FUNCTION update_substep_tracking_stats_for_substep(substep_uuid UUID)
RETURNS VOID AS $$
DECLARE
  completion_dates DATE[];
  streak_count INTEGER;
  max_streak INTEGER;
  temp_streak INTEGER;
  i INTEGER;
  last_date DATE;
BEGIN
  -- Mettre à jour total_completions
  SELECT completion_date INTO last_date
  FROM substep_completions
  WHERE substep_id = substep_uuid
  ORDER BY completion_date DESC
  LIMIT 1;

  UPDATE project_substeps
  SET
    total_completions = (
      SELECT COUNT(*) FROM substep_completions WHERE substep_id = substep_uuid
    ),
    last_completed_date = last_date
  WHERE id = substep_uuid;

  -- Récupérer les dates
  SELECT ARRAY_AGG(completion_date ORDER BY completion_date DESC)
  INTO completion_dates
  FROM substep_completions
  WHERE substep_id = substep_uuid
  ORDER BY completion_date DESC;

  streak_count := 0;
  max_streak := 0;

  IF completion_dates IS NOT NULL AND array_length(completion_dates, 1) > 0 THEN
    -- Calculer streak actuel
    FOR i IN 1..array_length(completion_dates, 1) LOOP
      IF i = 1 THEN
        IF completion_dates[i] >= CURRENT_DATE - INTERVAL '1 day' THEN
          streak_count := 1;
        ELSE
          EXIT;
        END IF;
      ELSE
        IF completion_dates[i] = completion_dates[i-1] - INTERVAL '1 day' THEN
          streak_count := streak_count + 1;
        ELSE
          EXIT;
        END IF;
      END IF;
    END LOOP;

    -- Calculer meilleur streak
    temp_streak := 1;
    max_streak := 1;

    FOR i IN 2..array_length(completion_dates, 1) LOOP
      IF completion_dates[i] = completion_dates[i-1] - INTERVAL '1 day' THEN
        temp_streak := temp_streak + 1;
        IF temp_streak > max_streak THEN
          max_streak := temp_streak;
        END IF;
      ELSE
        temp_streak := 1;
      END IF;
    END LOOP;
  END IF;

  -- Mettre à jour
  UPDATE project_substeps
  SET
    current_streak = streak_count,
    best_streak = GREATEST(best_streak, max_streak, streak_count)
  WHERE id = substep_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTIONS MÉTIER: Statistiques daily plans
-- ============================================

-- Fonction pour mettre à jour les stats du daily plan
CREATE OR REPLACE FUNCTION update_daily_plan_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE daily_plans
  SET
    total_tasks = (
      SELECT COUNT(*) FROM daily_plan_items
      WHERE daily_plan_id = NEW.daily_plan_id
    ),
    completed_tasks = (
      SELECT COUNT(*) FROM daily_plan_items
      WHERE daily_plan_id = NEW.daily_plan_id AND completed = true
    )
  WHERE id = NEW.daily_plan_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_plan_stats_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON daily_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_plan_stats();

-- ============================================
-- VUE UTILITAIRE: Trackers actifs
-- ============================================

-- Vue pour faciliter l'accès aux substeps avec tracking activé (= trackers)
CREATE OR REPLACE VIEW active_trackers AS
SELECT
  ps.id,
  ps.project_id,
  ps.step_id,
  p.user_id,
  ps.title,
  ps.description,
  p.category,
  ps.icon,
  ps.color,
  ps.recurrence_type AS frequency,
  ps.recurrence_value AS frequency_value,
  ps.recurrence_days AS target_days,
  ps.recurrence_start_date AS start_date,
  ps.recurrence_end_date AS end_date,
  ps.total_completions,
  ps.current_streak,
  ps.best_streak,
  ps.last_completed_date,
  ps.created_at,
  ps.updated_at,
  true AS is_active
FROM project_substeps ps
JOIN projects p ON p.id = ps.project_id
WHERE ps.tracking_enabled = true
  AND ps.status != 'skipped';

-- ============================================
-- FIN DU SCHÉMA
-- ============================================
-- Base de données optimisée et prête à l'emploi !
-- Système unifié : substeps = trackers quand tracking_enabled = true
-- ============================================
