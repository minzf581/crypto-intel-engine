const axios = require('axios');

async function checkAccountStructure() {
  try {
    // 1. Get auth token
    const authResponse = await axios.post('http://localhost:5001/api/auth/register', {
      email: `check${Date.now()}@example.com`,
      password: 'password123',
      name: 'Check User'
    });
    
    const token = authResponse.data.data.token;
    console.log('✅ Got auth token');

    // 2. Get recommended accounts
    const accountsResponse = await axios.get(
      'http://localhost:5001/api/social-sentiment/recommended-accounts/BTC',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const accounts = accountsResponse.data.data.accounts;
    console.log(`✅ Found ${accounts.length} accounts`);
    
    if (accounts.length > 0) {
      const firstAccount = accounts[0];
      console.log('\n📋 First account structure:');
      console.log(JSON.stringify(firstAccount, null, 2));
      
      console.log('\n🔍 Key fields:');
      console.log(`ID: ${firstAccount.id} (type: ${typeof firstAccount.id})`);
      console.log(`Twitter Username: ${firstAccount.twitterUsername}`);
      console.log(`Display Name: ${firstAccount.displayName}`);
      console.log(`Category: ${firstAccount.category}`);
      
      // 3. Try to add to monitoring with exact same data
      console.log('\n🧪 Testing add to monitoring...');
      const addResponse = await axios.post(
        'http://localhost:5001/api/social-sentiment/add-recommended-account',
        {
          accountId: firstAccount.id,
          coinSymbol: 'BTC'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Add to monitoring successful!');
      console.log('Response:', JSON.stringify(addResponse.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.log('\n🔍 This is the 400 error we\'re investigating');
      console.log('Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
        headers: error.config?.headers
      });
    }
  }
}

checkAccountStructure(); 