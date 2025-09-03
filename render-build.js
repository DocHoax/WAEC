// render-build.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Render build process...');

try {
  // Step 1: Install client dependencies and build React app
  console.log('📦 Installing client dependencies...');
  execSync('cd src && npm install', { stdio: 'inherit' });
  
  console.log('🏗️  Building React app...');
  execSync('cd src && npm run build', { stdio: 'inherit' });
  
  // Step 2: Install server dependencies
  console.log('📦 Installing server dependencies...');
  execSync('cd server && npm install --production', { stdio: 'inherit' });
  
  // Step 3: Verify build exists
  const buildPath = path.join(__dirname, 'build');
  if (fs.existsSync(buildPath)) {
    console.log('✅ React build created successfully at:', buildPath);
  } else {
    console.log('ℹ️  No build directory found, server will serve API only');
  }
  
  console.log('🎉 Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}