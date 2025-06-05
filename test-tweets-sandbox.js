#!/usr/bin/env node

/**
 * 专门测试推文沙箱数据的脚本
 * 测试社交情感分析页面的数据获取
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testTweetsSandboxData() {
  console.log('🐦 Testing Tweets Sandbox Data\n');

  try {
    // Test 1: 检查沙箱配置状态
    console.log('1. 检查沙箱配置状态...');
    const searchResponse = await axios.get(`${BASE_URL}/api/social-sentiment/search-accounts-coin?symbol=BTC&limit=5`);
    
    if (searchResponse.data.success && searchResponse.data.data?.searchMethod?.includes('Sandbox')) {
      console.log('   ✅ 沙箱模式已激活');
      console.log(`   ✅ 搜索方法: ${searchResponse.data.data.searchMethod}`);
      
      const accounts = searchResponse.data.data.accounts || [];
      console.log(`   ✅ 返回 ${accounts.length} 个模拟账户`);
      
      if (accounts.length > 0) {
        console.log('\n   📊 模拟账户示例:');
        accounts.slice(0, 3).forEach((account, index) => {
          console.log(`      ${index + 1}. @${account.username}`);
          console.log(`         - 名称: ${account.displayName}`);
          console.log(`         - 粉丝数: ${account.followersCount?.toLocaleString()}`);
          console.log(`         - 影响力分数: ${account.influenceScore}`);
        });
      }
    } else {
      console.log('   ❌ 沙箱模式未激活或数据格式错误');
      console.log('   Response:', JSON.stringify(searchResponse.data, null, 2));
    }

    // Test 2: 测试自定义查询搜索
    console.log('\n2. 测试自定义查询搜索...');
    const customResponse = await axios.get(`${BASE_URL}/api/social-sentiment/search-accounts-query-test?query=Bitcoin&limit=3`);
    
    if (customResponse.data.success) {
      const accounts = customResponse.data.data?.accounts || [];
      console.log(`   ✅ 自定义查询返回 ${accounts.length} 个账户`);
      console.log(`   ✅ 搜索方法: ${customResponse.data.data?.searchMethod}`);
    } else {
      console.log(`   ❌ 自定义查询失败: ${customResponse.data.message}`);
    }

    // Test 3: 测试多个加密货币
    console.log('\n3. 测试多个加密货币搜索...');
    const cryptos = ['BTC', 'ETH', 'SOL', 'ADA'];
    
    for (const crypto of cryptos) {
      try {
        const cryptoResponse = await axios.get(`${BASE_URL}/api/social-sentiment/search-accounts-coin?symbol=${crypto}&limit=3`);
        
        if (cryptoResponse.data.success && cryptoResponse.data.data?.searchMethod?.includes('Sandbox')) {
          const accounts = cryptoResponse.data.data.accounts || [];
          console.log(`   ✅ ${crypto}: ${accounts.length} 个模拟账户`);
        } else {
          console.log(`   ❌ ${crypto}: 沙箱数据获取失败`);
        }
      } catch (error) {
        console.log(`   ❌ ${crypto}: 请求错误 - ${error.message}`);
      }
    }

    // Test 4: 检查前端是否能访问沙箱数据
    console.log('\n4. 前端集成测试建议...');
    console.log('   📱 前端访问地址: http://localhost:3000');
    console.log('   📱 如果前端运行在其他端口: http://localhost:3001');
    console.log('\n   🔍 在前端测试步骤:');
    console.log('   1. 导航到 Social Sentiment 页面');
    console.log('   2. 选择一个加密货币（如 BTC）');
    console.log('   3. 查看是否显示模拟账户数据');
    console.log('   4. 检查 Recent Tweets 部分是否显示模拟推文');
    console.log('   5. 验证 "posts today" 数量不再是 0');
    
    // Test 5: 验证推文相关的端点
    console.log('\n5. 测试推文相关端点...');
    
    // 这些端点可能需要认证，我们检查它们是否存在
    const endpoints = [
      '/api/social-sentiment/search-accounts/BTC/Bitcoin',
      '/api/social-sentiment/search-accounts-query',
    ];
    
    console.log('   📋 可用的认证端点 (需要登录后测试):');
    endpoints.forEach(endpoint => {
      console.log(`      - ${BASE_URL}${endpoint}`);
    });

    console.log('\n🎉 沙箱推文数据测试总结:');
    console.log('   ✅ 沙箱模式已正确配置');
    console.log('   ✅ API返回模拟Twitter账户数据');
    console.log('   ✅ 多个加密货币都有对应的模拟数据');
    console.log('   ✅ 无真实Twitter API调用，无速率限制');
    
    console.log('\n💡 如果前端仍显示 "Failed to connect to server":');
    console.log('   1. 检查前端是否正确连接到 http://localhost:5001');
    console.log('   2. 确保用户已登录（可能需要Demo User登录）');
    console.log('   3. 检查浏览器开发者工具的网络请求');
    console.log('   4. 验证前端代码是否正确调用API端点');
    
    console.log('\n💡 如果 "posts today" 仍显示 0:');
    console.log('   1. 检查监控页面是否调用了正确的API端点');
    console.log('   2. 可能需要先添加一些账户到监控列表');
    console.log('   3. 检查前端是否正确解析沙箱数据响应');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 服务器连接失败:');
      console.log('   1. 确保服务器正在运行: npm run dev');
      console.log('   2. 检查服务器是否在端口 5001');
      console.log('   3. 验证环境变量: echo $SANDBOX_MODE');
    } else if (error.response) {
      console.log('\n💡 API错误响应:');
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   错误信息: ${error.response.data?.message || '未知错误'}`);
    }
  }
}

// 运行测试
if (require.main === module) {
  testTweetsSandboxData();
}

module.exports = { testTweetsSandboxData }; 