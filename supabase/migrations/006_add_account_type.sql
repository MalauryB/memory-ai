-- Migration: Ajouter le système de compte premium/standard
-- Date: 2025-10-17
-- Description: Ajoute le champ account_type à user_profiles et premium_since

-- Ajouter la colonne account_type
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'standard' NOT NULL;

-- Ajouter la colonne premium_since (date à laquelle l'utilisateur est devenu premium)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS premium_since TIMESTAMPTZ DEFAULT NULL;

-- Ajouter des commentaires
COMMENT ON COLUMN user_profiles.account_type IS 'Type de compte: standard (10 générations/mois) ou premium (illimité)';
COMMENT ON COLUMN user_profiles.premium_since IS 'Date à laquelle l''utilisateur est devenu premium. NULL si compte standard';

-- Créer un index pour filtrer rapidement par type de compte
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_type ON user_profiles(account_type);

-- Ajouter une contrainte pour valider les valeurs possibles
ALTER TABLE user_profiles
ADD CONSTRAINT check_account_type CHECK (account_type IN ('standard', 'premium'));

-- Mettre à jour les utilisateurs existants (tous deviennent standard par défaut)
UPDATE user_profiles
SET account_type = 'standard'
WHERE account_type IS NULL;
