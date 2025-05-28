const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testRecommendedAccounts() {
  try {
    console.log('🧪 Testing Recommended Accounts Feature...\n');

    // 1. Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      name: 'Test User'
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
    console.log(`✅ Found ${btcAccounts.length} recommended accounts for BTC:`);
    btcAccounts.forEach(account => {
      console.log(`   - @${account.twitterUsername} (${account.category}) - Priority: ${account.priority}`);
    });

    // 3. Get recommended accounts for ETH
    console.log('\n3. Getting recommended accounts for ETH...');
    const ethAccountsResponse = await axios.get(
      `${BASE_URL}/social-sentiment/recommended-accounts/ETH`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const ethAccounts = ethAccountsResponse.data.data.accounts;
    console.log(`✅ Found ${ethAccounts.length} recommended accounts for ETH:`);
    ethAccounts.forEach(account => {
      console.log(`   - @${account.twitterUsername} (${account.category}) - Priority: ${account.priority}`);
    });

    // 4. Add a recommended account to monitoring
    if (btcAccounts.length > 0) {
      console.log('\n4. Adding recommended account to monitoring...');
      const accountToAdd = btcAccounts[0];
      
      const addResponse = await axios.post(
        `${BASE_URL}/social-sentiment/add-recommended-account`,
        {
          accountId: accountToAdd.id,
          coinSymbol: 'BTC'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log(`✅ Successfully added @${addResponse.data.data.account.username} to monitoring`);
      console.log(`   Relevance Score: ${addResponse.data.data.relevance.relevanceScore}`);
    }

    // 5. Test search functionality
    console.log('\n5. Testing search functionality...');
    const searchResponse = await axios.get(
      `${BASE_URL}/recommended-accounts/search/accounts?query=bitcoin&coinSymbol=BTC`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log(`✅ Search returned ${searchResponse.data.data.accounts.length} results`);

    // 6. Get supported coins
    console.log('\n6. Getting supported coins...');
    const coinsResponse = await axios.get(
      `${BASE_URL}/recommended-accounts/coins/supported`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const supportedCoins = coinsResponse.data.data.coins;
    console.log(`✅ Found ${supportedCoins.length} supported coins:`);
    supportedCoins.forEach(coin => {
      console.log(`   - ${coin.coinSymbol} (${coin.coinName}) - ${coin.accountCount} accounts`);
    });

    console.log('\n🎉 All tests passed! Recommended Accounts feature is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testRecommendedAccounts(); 