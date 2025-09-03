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
  
  // Step 2: Move build to root directory where server expects it
  const srcBuildPath = path.join(__dirname, 'src', 'build');
  const rootBuildPath = path.join(__dirname, 'build');
  
  if (fs.existsSync(srcBuildPath)) {
    console.log('📁 Moving build from src/build to root directory...');
    
    // Remove existing build in root if it exists
    if (fs.existsSync(rootBuildPath)) {
      fs.rmSync(rootBuildPath, { recursive: true, force: true });
    }
    
    // Move build to root
    fs.renameSync(srcBuildPath, rootBuildPath);
    console.log('✅ Build moved to:', rootBuildPath);
  } else {
    console.log('⚠️  No build found in src/build directory');
    console.log('📁 Current directory structure:');
    execSync('find . -name "build" -type d', { stdio: 'inherit' });
  }
  
  // Step 3: Install server dependencies
  console.log('📦 Installing server dependencies...');
  execSync('cd server && npm install --production', { stdio: 'inherit' });
  
  // Step 4: Verify final structure
  console.log('📁 Final build structure:');
  if (fs.existsSync(rootBuildPath)) {
    console.log('✅ Build exists at:', rootBuildPath);
    console.log('📄 Files in build directory:');
    execSync(`ls -la ${rootBuildPath}`, { stdio: 'inherit' });
  } else {
    console.log('❌ Build not found in root directory');
  }
  
  console.log('🎉 Build completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}