// render-build.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Render build process...');

// Function to fix React app structure
function fixReactAppStructure() {
  const srcPath = path.join(__dirname, 'src');
  const srcSrcPath = path.join(srcPath, 'src');
  const publicPath = path.join(srcPath, 'public');
  
  // Create src/src directory if it doesn't exist
  if (!fs.existsSync(srcSrcPath)) {
    fs.mkdirSync(srcSrcPath, { recursive: true });
    console.log('Created src/src directory');
  }
  
  // Move files from src/ to src/src/ if they exist
  const filesToMove = [
    'App.js', 'App.css', 'App.test.js', 'index.js', 
    'index.css', 'logo.svg', 'reportWebVitals.js', 'setupTests.js',
    '.env'
  ];
  
  filesToMove.forEach(file => {
    const sourcePath = path.join(srcPath, file);
    const destPath = path.join(srcSrcPath, file);
    
    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      fs.renameSync(sourcePath, destPath);
      console.log(`Moved ${file} to src/src/`);
    }
  });
  
  // Move folders from src/ to src/src/ if they exist
  const foldersToMove = [
    'assets', 'components', 'context', 'hooks', 
    'pages', 'services', 'styles'
  ];
  
  foldersToMove.forEach(folder => {
    const sourcePath = path.join(srcPath, folder);
    const destPath = path.join(srcSrcPath, folder);
    
    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      fs.renameSync(sourcePath, destPath);
      console.log(`Moved ${folder} to src/src/`);
    }
  });
  
  // Create public directory and index.html if they don't exist
  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
    console.log('Created public directory');
  }
  
  const indexHtmlPath = path.join(publicPath, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.log('Creating index.html...');
    const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="WAEC CBT App" />
    <title>WAEC CBT</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;
    fs.writeFileSync(indexHtmlPath, indexHtmlContent);
  }
}

try {
  // Step 1: Install root dependencies
  console.log('Step 1: Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Step 2: Fix React app structure
  console.log('Step 2: Fixing React app structure...');
  fixReactAppStructure();
  
  // Step 3: Install and build React app
  console.log('Step 3: Installing and building React app...');
  process.chdir('src');
  
  // Update package.json to remove BROWSER=none
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.scripts && packageJson.scripts.build) {
      packageJson.scripts.build = packageJson.scripts.build.replace('BROWSER=none ', '');
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('Fixed build script in package.json');
    }
  }
  
  execSync('npm install', { stdio: 'inherit' });
  execSync('npm run build', { stdio: 'inherit' });
  process.chdir('..');
  
  // Step 4: Install server dependencies
  console.log('Step 4: Installing server dependencies...');
  process.chdir('server');
  execSync('npm install', { stdio: 'inherit' });
  process.chdir('..');
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}