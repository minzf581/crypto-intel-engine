// 这个脚本需要在浏览器控制台中运行
// 用于快速修复前端认证问题

console.log('🔧 Frontend Auth Fix Script');

async function fixFrontendAuth() {
  try {
    // 1. 清除旧的认证数据
    localStorage.removeItem('token');
    console.log('✅ Cleared old token');

    // 2. 注册新用户
    const response = await fetch('http://localhost:5001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `fix${Date.now()}@example.com`,
        password: 'password123',
        name: 'Fix User'
      })
    });

    const data = await response.json();

    if (data.success) {
      const token = data.data.token;
      localStorage.setItem('token', token);
      console.log('✅ New token saved:', token.substring(0, 20) + '...');

      // 3. 测试推荐账户API
      const accountsResponse = await fetch('http://localhost:5001/api/social-sentiment/recommended-accounts/BTC', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const accountsData = await accountsResponse.json();
      
      if (accountsData.success) {
        console.log(`✅ Found ${accountsData.data.accounts.length} recommended accounts`);
        
        if (accountsData.data.accounts.length > 0) {
          const firstAccount = accountsData.data.accounts[0];
          console.log(`First account: @${firstAccount.twitterUsername}`);

          // 4. 测试添加到监控
          const addResponse = await fetch('http://localhost:5001/api/social-sentiment/add-recommended-account', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              accountId: firstAccount.id,
              coinSymbol: 'BTC'
            })
          });

          const addData = await addResponse.json();
          
          if (addData.success) {
            console.log('✅ Successfully added account to monitoring!');
            console.log('🎉 Frontend auth fix completed successfully!');
            console.log('💡 You can now try adding accounts to monitoring in the UI');
          } else {
            console.error('❌ Failed to add account:', addData);
          }
        }
      } else {
        console.error('❌ Failed to get recommended accounts:', accountsData);
      }
    } else {
      console.error('❌ Registration failed:', data);
    }

  } catch (error) {
    console.error('❌ Fix script failed:', error);
  }
}

// 运行修复脚本
fixFrontendAuth(); 