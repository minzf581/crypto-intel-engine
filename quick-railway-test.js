#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚂 Railway Deployment Quick Test');
console.log('================================');

// 測試步驟
const tests = [
  {
    name: '清理構建目錄',
    command: 'npm',
    args: ['run', 'clean'],
    timeout: 30000
  },
  {
    name: '安裝依賴',
    command: 'npm',
    args: ['install'],
    timeout: 120000
  },
  {
    name: '構建項目',
    command: 'npm',
    args: ['run', 'build'],
    timeout: 120000
  },
  {
    name: '驗證構建',
    command: 'npm',
    args: ['run', 'verify'],
    timeout: 10000
  }
];

async function runCommand(test) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 ${test.name}...`);
    
    const process = spawn(test.command, test.args, {
      cwd: __dirname,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    const timer = setTimeout(() => {
      process.kill();
      reject(new Error(`Timeout after ${test.timeout}ms`));
    }, test.timeout);

    process.on('close', (code) => {
      clearTimeout(timer);
      
      if (code === 0) {
        console.log(`✅ ${test.name} - 成功`);
        resolve({ output, errorOutput });
      } else {
        console.log(`❌ ${test.name} - 失敗 (退出碼: ${code})`);
        if (errorOutput) {
          console.log('錯誤輸出:', errorOutput.slice(-500));
        }
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on('error', (err) => {
      clearTimeout(timer);
      console.log(`❌ ${test.name} - 錯誤:`, err.message);
      reject(err);
    });
  });
}

async function runTests() {
  let allPassed = true;
  
  console.log(`📋 開始執行 ${tests.length} 項測試...\n`);
  
  for (const test of tests) {
    try {
      await runCommand(test);
    } catch (error) {
      console.error(`💥 測試失敗: ${error.message}`);
      allPassed = false;
      break;
    }
  }

  console.log('\n================================');
  
  if (allPassed) {
    console.log('🎉 所有測試通過！');
    console.log('✅ 項目已準備好Railway部署');
    console.log('\n📝 接下來的步驟:');
    console.log('   1. git add .');
    console.log('   2. git commit -m "Ready for Railway deployment"');
    console.log('   3. git push origin main');
    console.log('   4. 在Railway控制台觸發部署');
  } else {
    console.log('❌ 測試失敗！');
    console.log('🔧 請修復問題後重新運行測試');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// 開始測試
runTests().catch(console.error); 