-- ============================================
-- SUPPRESSION DES TYPES ENUM EXISTANTS
-- ============================================
-- À exécuter AVANT le schéma principal si vous avez drop les tables

DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS step_status CASCADE;
DROP TYPE IF EXISTS substep_status CASCADE;
DROP TYPE IF EXISTS recurrence_type CASCADE;
DROP TYPE IF EXISTS plan_item_type CASCADE;
DROP TYPE IF EXISTS theme_type CASCADE;
DROP TYPE IF EXISTS language_type CASCADE;
DROP TYPE IF EXISTS gender_type CASCADE;
