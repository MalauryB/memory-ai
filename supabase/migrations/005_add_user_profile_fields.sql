-- ============================================
-- MIGRATION: Ajouter les champs manquants au profil utilisateur
-- ============================================

-- Ajouter les colonnes manquantes à user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS work_hours_start TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS work_hours_end TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS preferred_work_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
ADD COLUMN IF NOT EXISTS daily_work_hours INTEGER DEFAULT 8 CHECK (daily_work_hours >= 1 AND daily_work_hours <= 24),
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_time TIME DEFAULT '09:00:00';

-- Ajouter un commentaire pour documenter ces colonnes
COMMENT ON COLUMN user_profiles.location IS 'Localisation de l''utilisateur (ville, pays)';
COMMENT ON COLUMN user_profiles.work_hours_start IS 'Heure de début de travail préférée';
COMMENT ON COLUMN user_profiles.work_hours_end IS 'Heure de fin de travail préférée';
COMMENT ON COLUMN user_profiles.preferred_work_days IS 'Jours de travail préférés (0=dimanche, 1=lundi, etc.)';
COMMENT ON COLUMN user_profiles.daily_work_hours IS 'Nombre d''heures de travail par jour';
COMMENT ON COLUMN user_profiles.notification_enabled IS 'Notifications activées ou non';
COMMENT ON COLUMN user_profiles.notification_time IS 'Heure de notification quotidienne';
