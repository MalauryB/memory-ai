-- Migration: Ajouter la préférence de langue pour les utilisateurs
-- Date: 2025-10-17
-- Description: Ajoute le champ preferred_locale à la table user_profiles

-- Ajouter la colonne preferred_locale
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(5) DEFAULT NULL;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN user_profiles.preferred_locale IS 'Langue préférée de l''utilisateur (fr, en, es, de, it, pt). NULL = détection automatique';

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_locale ON user_profiles(preferred_locale);
