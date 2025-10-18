#!/usr/bin/env node

/**
 * Script pour détecter le code de debug dans le projet
 * Usage: npm run check:debug
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔍 Recherche de code debug...\n')

// Patterns à rechercher
const patterns = {
  'console.log': {
    command: 'grep -r "console\\.log" --include="*.ts" --include="*.tsx" app/ components/ lib/ || true',
    severity: 'WARNING',
    description: 'console.log trouvés (debug)',
  },
  'console.error (API)': {
    command: 'grep -r "console\\.error" --include="*.ts" app/api/ || true',
    severity: 'ERROR',
    description: 'console.error dans les routes API (utiliser logger)',
  },
  'console.warn': {
    command: 'grep -r "console\\.warn" --include="*.ts" --include="*.tsx" app/ components/ lib/ || true',
    severity: 'WARNING',
    description: 'console.warn trouvés',
  },
  debugger: {
    command: 'grep -r "debugger" --include="*.ts" --include="*.tsx" app/ components/ lib/ || true',
    severity: 'ERROR',
    description: 'Statements debugger trouvés',
  },
  'TEST_MODE': {
    command: 'grep -r "TEST_MODE" --include="*.ts" --include="*.tsx" app/ lib/ || true',
    severity: 'ERROR',
    description: 'Flags TEST_MODE trouvés',
  },
}

let totalIssues = 0
const results = {}

// Exécuter les recherches
for (const [name, config] of Object.entries(patterns)) {
  try {
    const output = execSync(config.command, { encoding: 'utf-8' })
    const lines = output.split('\n').filter(line => line.trim())

    if (lines.length > 0) {
      results[name] = {
        count: lines.length,
        severity: config.severity,
        description: config.description,
        lines: lines.slice(0, 10), // Limiter à 10 exemples
      }
      totalIssues += lines.length
    }
  } catch (error) {
    // grep retourne une erreur si rien n'est trouvé
  }
}

// Afficher les résultats
if (totalIssues === 0) {
  console.log('✅ Aucun code debug trouvé!\n')
  process.exit(0)
}

console.log(`⚠️  ${totalIssues} occurrence(s) de code debug trouvée(s):\n`)

for (const [name, result] of Object.entries(results)) {
  const emoji = result.severity === 'ERROR' ? '🔴' : '🟡'
  console.log(`${emoji} ${result.description}`)
  console.log(`   Nombre: ${result.count}`)

  if (result.lines.length > 0) {
    console.log(`   Exemples:`)
    result.lines.slice(0, 3).forEach(line => {
      const [file, ...rest] = line.split(':')
      console.log(`   - ${file}`)
    })

    if (result.count > 3) {
      console.log(`   ... et ${result.count - 3} autres`)
    }
  }
  console.log()
}

// Résumé
console.log('📊 Résumé:')
console.log(`   Total: ${totalIssues} occurrences`)
console.log(`   Fichiers affectés: ~${Math.ceil(totalIssues / 2)}\n`)

console.log('💡 Actions recommandées:')
console.log('   1. Migrer les routes API vers le logger Pino')
console.log('   2. Nettoyer les console.log de debug dans les composants')
console.log('   3. Supprimer les flags TEST_MODE')
console.log('   4. Consulter docs/CODE_CLEANUP.md pour le guide complet\n')

// Générer un rapport
const report = {
  timestamp: new Date().toISOString(),
  totalIssues,
  details: results,
}

const reportPath = path.join(__dirname, '..', 'debug-report.json')
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(`📄 Rapport détaillé sauvegardé: debug-report.json\n`)

// Exit code selon la sévérité
const hasErrors = Object.values(results).some(r => r.severity === 'ERROR')
process.exit(hasErrors ? 1 : 0)
