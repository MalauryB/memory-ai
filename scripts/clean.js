#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

console.log('🧹 Nettoyage du cache Next.js...');
removeDir('.next');
removeDir('node_modules/.cache');
console.log('✅ Nettoyage terminé!\n');
