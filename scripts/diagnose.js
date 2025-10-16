#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnostic du système...\n');

// 1. Vérifier le port 3000
console.log('📡 PORT 3000:');
try {
  const output = execSync('ss -tulpn 2>/dev/null | grep :3000', { encoding: 'utf8' });
  console.log('⚠️  Port 3000 OCCUPÉ:');
  console.log(output);
} catch (e) {
  console.log('✓ Port 3000 libre\n');
}

// 2. Lister les processus Node/Next
console.log('🖥️  PROCESSUS NODE/NEXT:');
try {
  const output = execSync('ps aux | grep -E "(node|next)" | grep -v grep | grep -v diagnose', { encoding: 'utf8' });
  const lines = output.trim().split('\n').filter(Boolean);
  if (lines.length > 0) {
    console.log(`⚠️  ${lines.length} processus trouvés:`);
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[1];
      const command = parts.slice(10).join(' ').substring(0, 80);
      console.log(`   PID ${pid}: ${command}`);
    });
  } else {
    console.log('✓ Aucun processus Node/Next actif');
  }
} catch (e) {
  console.log('✓ Aucun processus Node/Next actif');
}
console.log('');

// 3. Vérifier les fichiers de cache
console.log('📁 CACHE:');
const cacheFiles = [
  '.next',
  'node_modules/.cache',
  '.turbo'
];

cacheFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(fullPath);
        console.log(`⚠️  ${file} existe (${files.length} fichiers)`);
      } else {
        console.log(`⚠️  ${file} existe`);
      }
    } catch (e) {
      console.log(`⚠️  ${file} existe (erreur lecture)`);
    }
  } else {
    console.log(`✓ ${file} n'existe pas`);
  }
});
console.log('');

// 4. Vérifier node_modules
console.log('📦 NODE_MODULES:');
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  try {
    const files = fs.readdirSync(nodeModulesPath);
    console.log(`✓ node_modules existe (${files.length} packages)`);
  } catch (e) {
    console.log('⚠️  node_modules existe mais erreur lecture');
  }
} else {
  console.log('❌ node_modules n\'existe pas - lancez "npm install"');
}
console.log('');

// 5. Vérifier les variables d'environnement
console.log('🔐 VARIABLES D\'ENVIRONNEMENT:');
const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
envFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`✓ ${file} existe`);
  }
});
console.log('');

// 6. Vérifier la version de Node
console.log('⚙️  VERSIONS:');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✓ Node.js: ${nodeVersion}`);
  console.log(`✓ npm: ${npmVersion}`);
} catch (e) {
  console.log('❌ Erreur lors de la vérification des versions');
}
console.log('');

// 7. Recommandations
console.log('💡 RECOMMANDATIONS:');
try {
  execSync('ss -tulpn 2>/dev/null | grep :3000', { stdio: 'ignore' });
  console.log('⚠️  Le port 3000 est occupé → Lancez "npm run clean" pour libérer le port');
} catch (e) {
  // Port libre
}

const nextPath = path.join(process.cwd(), '.next');
if (fs.existsSync(nextPath)) {
  console.log('⚠️  Le cache .next existe → Lancez "npm run clean" pour nettoyer');
}

console.log('');
console.log('✅ Diagnostic terminé\n');
