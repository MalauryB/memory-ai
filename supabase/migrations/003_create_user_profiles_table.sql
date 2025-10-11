-- Créer la table user_profiles pour stocker les informations personnelles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  timezone TEXT DEFAULT 'Europe/Paris',
  work_hours_start TIME DEFAULT '09:00:00',
  work_hours_end TIME DEFAULT '18:00:00',
  preferred_work_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 0=dimanche, 1=lundi, etc.
  daily_work_hours INTEGER DEFAULT 8,
  notification_enabled BOOLEAN DEFAULT true,
  notification_time TIME DEFAULT '09:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index pour recherche rapide par user_id
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Activer RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir et modifier uniquement leur propre profil
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();
