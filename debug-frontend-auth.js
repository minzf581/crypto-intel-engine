// 这个脚本需要在浏览器控制台中运行
// 用于检查前端的认证状态和API调用

console.log('🔍 Frontend Debug - Authentication Check');

// 1. 检查localStorage中的token
const token = localStorage.getItem('token');
console.log('Token in localStorage:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');

// 2. 检查API基础URL配置
console.log('Current location:', window.location.href);

// 3. 测试API调用
async function testFrontendAPI() {
  try {
    // 如果没有token，先登录
    if (!token) {
      console.log('❌ No token found, need to login first');
      return;
    }

    // 测试推荐账户API
    console.log('🧪 Testing recommended accounts API...');
    const response = await fetch('http://localhost:5001/api/social-sentiment/recommended-accounts/BTC', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);

    if (data.success && data.data.accounts.length > 0) {
      const firstAccount = data.data.accounts[0];
      console.log('First account ID:', firstAccount.id);
      
      // 测试添加到监控
      console.log('🧪 Testing add to monitoring...');
      const addResponse = await fetch('http://localhost:5001/api/social-sentiment/add-recommended-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: firstAccount.id,
          coinSymbol: 'BTC'
        })
      });

      console.log('Add response status:', addResponse.status);
      const addData = await addResponse.json();
      console.log('Add response data:', addData);
    }

  } catch (error) {
    console.error('❌ Frontend API test failed:', error);
  }
}

// 运行测试
testFrontendAPI(); 