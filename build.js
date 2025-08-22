// build.js
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Starting build process for Render...');

try {
  console.log('Step 1: Installing root dependencies...');
  execSync('npm install --production', { stdio: 'inherit' });
  
  console.log('Step 2: Building client...');
  process.chdir('src');
  execSync('npm install --production', { stdio: 'inherit' });
  execSync('npm run build', { stdio: 'inherit' });
  process.chdir('..');
  
  console.log('Step 3: Installing server dependencies...');
  process.chdir('server');
  execSync('npm install --production', { stdio: 'inherit' });
  process.chdir('..');
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}