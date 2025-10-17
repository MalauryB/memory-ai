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

function killProcesses() {
  console.log('🔪 Arrêt des processus Next.js...');

  try {
    // 1. Tuer tous les processus "next dev"
    try {
      execSync('pkill -9 -f "next dev"', { stdio: 'ignore' });
      console.log('✓ Processus "next dev" arrêtés');
    } catch (err) {
      // pkill retourne une erreur si aucun processus n'est trouvé, c'est normal
    }

    // 2. Tuer tous les processus node liés à Next.js
    try {
      execSync('pkill -9 -f "node.*next"', { stdio: 'ignore' });
      console.log('✓ Processus Node.js Next arrêtés');
    } catch (err) {
      // Ignore si aucun processus trouvé
    }

    // 3. Libérer le port 3000 si bloqué (avec fuser si disponible)
    try {
      const result = execSync('fuser -k 3000/tcp 2>&1', { encoding: 'utf8' });
      if (result.includes('3000/tcp')) {
        console.log('✓ Port 3000 libéré');
      }
    } catch (err) {
      // fuser peut ne pas être disponible ou port déjà libre
    }

    // 4. Alternative pour libérer le port 3000 (avec lsof)
    try {
      const lsofOutput = execSync('lsof -ti:3000 2>/dev/null', { encoding: 'utf8' }).trim();
      if (lsofOutput) {
        execSync(`kill -9 ${lsofOutput}`, { stdio: 'ignore' });
        console.log('✓ Port 3000 libéré (lsof)');
      }
    } catch (err) {
      // lsof peut ne pas être disponible ou port déjà libre
    }

    // Attendre un peu que les processus se terminent complètement
    execSync('sleep 1', { stdio: 'ignore' });

  } catch (err) {
    console.log('ℹ Aucun processus Next.js trouvé ou déjà arrêté');
  }
}

console.log('🧹 Nettoyage complet...\n');

// 1. Tuer tous les processus Next.js
killProcesses();

// 2. Appeler le script bash pour tuer les processus (backup)
try {
  const scriptPath = path.join(__dirname, 'kill-all.sh');
  if (fs.existsSync(scriptPath)) {
    execSync(`bash "${scriptPath}"`, { stdio: 'ignore' });
  }
} catch (err) {
  // Ignore les erreurs du script bash
}

// 3. Nettoyer les fichiers de cache
console.log('\n📁 Nettoyage des fichiers de cache...');
removeDir('.next');
removeDir('.turbopack');    // Cache Turbopack (Next.js 15+)
removeDir('.turbo');        // Cache Turborepo (si utilisé)
removeDir('node_modules/.cache');

console.log('\n✅ Nettoyage terminé! Vous pouvez maintenant lancer "npm run dev"\n');
