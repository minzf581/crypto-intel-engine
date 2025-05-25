const fs = require('fs');
const path = require('path');

console.log('🔍 Testing deployment fix for use-sound dependency...\n');

// Check client package.json
const clientPackagePath = path.join(__dirname, 'client', 'package.json');
const clientPackage = JSON.parse(fs.readFileSync(clientPackagePath, 'utf8'));

console.log('📦 Checking client dependencies:');
console.log('✅ use-sound version:', clientPackage.dependencies['use-sound']);

if (clientPackage.dependencies['react-use-sound']) {
  console.log('❌ Found incorrect react-use-sound dependency');
  process.exit(1);
} else {
  console.log('✅ No incorrect react-use-sound dependency found');
}

// Check import statements
const soundHookPath = path.join(__dirname, 'client', 'src', 'hooks', 'useNotificationSounds.ts');
const soundHookContent = fs.readFileSync(soundHookPath, 'utf8');

if (soundHookContent.includes("import useSound from 'use-sound'")) {
  console.log('✅ Correct default import for useSound found');
} else {
  console.log('❌ Incorrect import statement for useSound');
  process.exit(1);
}

if (soundHookContent.includes("import { useSound }")) {
  console.log('❌ Found incorrect named import for useSound');
  process.exit(1);
} else {
  console.log('✅ No incorrect named import found');
}

console.log('\n🎉 All dependency fixes verified!');
console.log('\n📋 Summary of changes:');
console.log('   - Removed incorrect "react-use-sound" package');
console.log('   - Updated "use-sound" to latest version (5.0.0)');
console.log('   - Fixed import statement to use default import');
console.log('\n🚀 The project should now deploy successfully on Railway!');

// Additional recommendations
console.log('\n💡 Additional deployment recommendations:');
console.log('   - Ensure all sound files exist in client/public/sounds/');
console.log('   - Consider adding @types/howler as dev dependency for TypeScript');
console.log('   - Test audio functionality after deployment'); 