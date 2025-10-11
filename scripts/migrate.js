const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erreur: Variables d\'environnement Supabase manquantes')
  console.error('Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runMigration() {
  console.log('🚀 Démarrage de la migration...\n')

  // Lire le fichier SQL
  const sqlPath = path.join(__dirname, '../supabase/migrations/001_create_projects_table.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('📄 Fichier SQL chargé:', sqlPath)
  console.log('📊 Taille:', sql.length, 'caractères\n')

  // Note: L'API Supabase ne permet pas d'exécuter du SQL brut directement
  // Il faut utiliser le tableau de bord Supabase ou la CLI
  console.log('⚠️  IMPORTANT: La clé ANON ne permet pas d\'exécuter du SQL brut pour des raisons de sécurité.\n')
  console.log('Veuillez appliquer la migration via l\'une des méthodes suivantes:\n')

  console.log('📋 MÉTHODE 1 - Via le tableau de bord Supabase (RECOMMANDÉ):')
  console.log('1. Allez sur: https://app.supabase.com/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql')
  console.log('2. Cliquez sur "New Query"')
  console.log('3. Copiez-collez le contenu de:')
  console.log('   supabase/migrations/001_create_projects_table.sql')
  console.log('4. Cliquez sur "Run"\n')

  console.log('📋 MÉTHODE 2 - Via Supabase CLI:')
  console.log('1. Installez la CLI: npm install -g supabase')
  console.log('2. Connectez-vous: supabase login')
  console.log('3. Liez le projet: supabase link --project-ref ' + supabaseUrl.split('//')[1].split('.')[0])
  console.log('4. Appliquez les migrations: supabase db push\n')

  console.log('✅ Une fois la migration appliquée, vos tables seront créées!')
}

runMigration().catch(console.error)
