const axios = require('axios');

async function testAssetAPI() {
  const baseURL = 'http://localhost:5001';
  
  // 用户登录获取token
  const loginData = {
    email: 'demo@example.com',
    password: 'demo123'
  };
  
  try {
    console.log('🔐 登录获取token...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, loginData);
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功，获取到token');
    
    // 设置认证头
    const authConfig = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    // 测试保存资产偏好
    const testAssets = ['BTC', 'ETH', 'ADA', 'SOL'];
    console.log('\n📊 测试保存资产偏好...');
    console.log('发送资产:', testAssets);
    
    const saveResponse = await axios.post(
      `${baseURL}/api/users/assets`, 
      { assets: testAssets },
      authConfig
    );
    
    console.log('✅ 资产保存成功!');
    console.log('响应:', saveResponse.data);
    
    // 验证保存结果
    console.log('\n🔍 验证保存结果...');
    const getUserResponse = await axios.get(`${baseURL}/api/users/assets`, authConfig);
    console.log('用户资产数据:', getUserResponse.data);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('HTTP状态码:', error.response.status);
    }
  }
}

// 等待服务器启动然后运行测试
setTimeout(() => {
  console.log('🚀 开始测试资产API修复...\n');
  testAssetAPI();
}, 5000); 