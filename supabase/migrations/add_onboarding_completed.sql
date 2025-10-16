-- Ajouter la colonne onboarding_completed à la table user_profiles
-- Cette colonne permet de suivre si l'utilisateur a complété le parcours d'onboarding

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Mettre à jour les profils existants (supposer qu'ils ont déjà complété l'onboarding)
-- pour ne pas les rediriger vers le parcours d'onboarding
UPDATE user_profiles
SET onboarding_completed = true
WHERE onboarding_completed IS NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Indique si l''utilisateur a complété le parcours d''onboarding initial';
