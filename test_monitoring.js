const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/social-sentiment';

// Mock authentication token (you'll need to get this from login)
let authToken = '';

async function login() {
  try {
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testMonitoringFlow() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('\n🔍 Testing monitoring flow for BTC...\n');

    // 1. Get current monitoring status
    console.log('1. Getting current monitoring status...');
    const statusResponse = await axios.get(`${BASE_URL}/monitoring-status/BTC`, { headers });
    console.log('   Status:', statusResponse.data);

    // 2. Get current monitored accounts
    console.log('\n2. Getting current monitored accounts...');
    const accountsResponse = await axios.get(`${BASE_URL}/monitored-accounts/BTC`, { headers });
    console.log('   Accounts:', accountsResponse.data);

    // 3. Search for accounts to add
    console.log('\n3. Searching for accounts...');
    const searchResponse = await axios.get(`${BASE_URL}/search-accounts/BTC/Bitcoin?limit=5`, { headers });
    console.log('   Found accounts:', searchResponse.data.data?.accounts?.length || 0);

    if (searchResponse.data.data?.accounts?.length > 0) {
      const accountToAdd = searchResponse.data.data.accounts[0];
      console.log('   Will add account:', accountToAdd.username);

      // 4. Add account to monitoring
      console.log('\n4. Adding account to monitoring...');
      const addResponse = await axios.post(`${BASE_URL}/confirm-monitoring/BTC`, {
        accountIds: [accountToAdd.id]
      }, { headers });
      console.log('   Add result:', addResponse.data);

      // 5. Verify account was added
      console.log('\n5. Verifying account was added...');
      const verifyResponse = await axios.get(`${BASE_URL}/monitored-accounts/BTC`, { headers });
      console.log('   Updated accounts count:', verifyResponse.data.data?.length || 0);
      
      const addedAccount = verifyResponse.data.data?.find(acc => acc.id === accountToAdd.id);
      if (addedAccount) {
        console.log('   ✅ Account successfully added and saved to database');
        console.log('   Account details:', {
          username: addedAccount.username,
          isConfirmed: addedAccount.isConfirmed,
          addedAt: addedAccount.addedAt
        });
      } else {
        console.log('   ❌ Account not found in monitoring list');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🧪 Testing Monitoring List Persistence\n');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('Cannot proceed without authentication');
    return;
  }

  await testMonitoringFlow();
}

main().catch(console.error); 