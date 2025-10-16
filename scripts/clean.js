#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function removeDir(dir) {
  const fullPath = path.join(process.cwd(), dir);

  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✓ ${dir} supprimé`);
    } catch (err) {
      console.error(`✗ Erreur lors de la suppression de ${dir}:`, err.message);
    }
  } else {
    console.log(`ℹ ${dir} n'existe pas`);
  }
}

console.log('🧹 Nettoyage complet...\n');

// 1. Appeler le script bash pour tuer les processus
try {
  const scriptPath = path.join(__dirname, 'kill-all.sh');
  execSync(`bash "${scriptPath}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('Erreur lors du kill des processus:', err.message);
}

// 2. Nettoyer les fichiers de cache
console.log('\n📁 Nettoyage des fichiers de cache...');
removeDir('.next');
removeDir('node_modules/.cache');
removeDir('.turbo');

console.log('\n✅ Nettoyage terminé! Vous pouvez maintenant lancer "npm run dev"\n');
