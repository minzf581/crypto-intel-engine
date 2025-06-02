const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function quickTest() {
  try {
    console.log('🧪 Quick API Test...\n');

    // 1. Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: `quicktest${Date.now()}@example.com`,
      password: 'password123',
      name: 'Quick Test User'
    });
    
    const token = registerResponse.data.data.token;
    console.log('✅ User registered successfully');

    // 2. Get recommended accounts for BTC
    console.log('\n2. Getting recommended accounts for BTC...');
    const btcAccountsResponse = await axios.get(
      `${BASE_URL}/social-sentiment/recommended-accounts/BTC`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const btcAccounts = btcAccountsResponse.data.data.accounts;
    console.log(`✅ Found ${btcAccounts.length} recommended accounts for BTC`);
    
    if (btcAccounts.length > 0) {
      const firstAccount = btcAccounts[0];
      console.log(`   First account: @${firstAccount.twitterUsername} (${firstAccount.category})`);
      
      // 3. Try to add the first account to monitoring
      console.log('\n3. Adding first account to monitoring...');
      const addResponse = await axios.post(
        `${BASE_URL}/social-sentiment/add-recommended-account`,
        {
          accountId: firstAccount.id,
          coinSymbol: 'BTC'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (addResponse.data.success) {
        console.log(`✅ Successfully added @${addResponse.data.data.account.username} to monitoring`);
      } else {
        console.log(`❌ Failed to add account: ${addResponse.data.message}`);
      }
    }

    console.log('\n🎉 Quick test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.log('📝 This is likely the 400 Bad Request error we\'re investigating');
      console.log('Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      });
    }
  }
}

quickTest(); 