const axios = require('axios');

// 模拟前端的确切API调用
async function debugFrontendIssue() {
  try {
    console.log('🔍 Debugging Frontend Issue...\n');

    // 1. 注册用户获取token
    const registerResponse = await axios.post('http://localhost:5001/api/auth/register', {
      email: `frontend-debug${Date.now()}@example.com`,
      password: 'password123',
      name: 'Frontend Debug User'
    });
    
    const token = registerResponse.data.data.token;
    console.log('✅ Got auth token:', token.substring(0, 20) + '...');

    // 2. 创建axios实例，模拟前端的socialSentimentApi
    const api = axios.create({
      baseURL: 'http://localhost:5001/api/social-sentiment',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 添加认证拦截器，模拟前端
    api.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // 3. 获取推荐账户
    console.log('\n📋 Getting recommended accounts...');
    const accountsResponse = await api.get('/recommended-accounts/BTC');
    const accounts = accountsResponse.data.data.accounts;
    console.log(`✅ Found ${accounts.length} accounts`);

    if (accounts.length > 0) {
      const firstAccount = accounts[0];
      console.log(`   First account: @${firstAccount.twitterUsername} (ID: ${firstAccount.id})`);

      // 4. 尝试添加到监控 - 使用前端的确切调用方式
      console.log('\n🧪 Testing add to monitoring (frontend style)...');
      
      // 这是前端RecommendedAccountsPanel.tsx中的确切调用
      const addResponse = await api.post('/add-recommended-account', {
        accountId: firstAccount.id,
        coinSymbol: 'BTC'
      });

      console.log('✅ Add to monitoring successful!');
      console.log('Response:', JSON.stringify(addResponse.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error occurred:', error.response?.data || error.message);
    
    if (error.response) {
      console.log('\n🔍 Error details:');
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.config) {
        console.log('\n📤 Request details:');
        console.log('URL:', error.config.url);
        console.log('Method:', error.config.method);
        console.log('Headers:', error.config.headers);
        console.log('Data:', error.config.data);
      }
    }
  }
}

debugFrontendIssue(); 