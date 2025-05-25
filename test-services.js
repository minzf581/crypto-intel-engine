const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5001';

async function testServices() {
  console.log('🔍 Testing crypto intelligence services...\n');

  // Test backend API
  try {
    console.log('1. Testing backend API...');
    const assetsResponse = await axios.get(`${BACKEND_URL}/api/assets`, { timeout: 5000 });
    
    if (assetsResponse.data.success && assetsResponse.data.data.length > 0) {
      console.log('✅ Backend API is working');
      console.log(`   - Found ${assetsResponse.data.data.length} assets`);
      console.log(`   - Assets: ${assetsResponse.data.data.map(a => a.symbol).join(', ')}`);
    } else {
      console.log('❌ Backend API returned unexpected data');
    }
  } catch (error) {
    console.log('❌ Backend API is not responding');
    console.log(`   Error: ${error.message}`);
  }

  // Test login endpoint
  try {
    console.log('\n2. Testing login endpoint...');
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'demo@example.com',
      password: 'demo123'
    }, { timeout: 5000 });
    
    if (loginResponse.data.success && loginResponse.data.data.token) {
      console.log('✅ Login endpoint is working');
      console.log(`   - User: ${loginResponse.data.data.user.name}`);
      console.log(`   - Token length: ${loginResponse.data.data.token.length}`);
    } else {
      console.log('❌ Login endpoint failed');
      console.log(`   - Response: ${JSON.stringify(loginResponse.data)}`);
    }
  } catch (error) {
    console.log('❌ Login endpoint is not responding');
    console.log(`   Error: ${error.message}`);
  }

  // Test frontend
  try {
    console.log('\n3. Testing frontend...');
    const frontendResponse = await axios.get(FRONTEND_URL, { 
      timeout: 5000,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (frontendResponse.status === 200 && frontendResponse.data.includes('Crypto Intelligence Engine')) {
      console.log('✅ Frontend is working');
      console.log(`   - Status: ${frontendResponse.status}`);
      console.log(`   - Title found in HTML`);
    } else {
      console.log('❌ Frontend returned unexpected content');
    }
  } catch (error) {
    console.log('❌ Frontend is not responding');
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n🎯 Test Summary:');
  console.log(`   - Frontend URL: ${FRONTEND_URL}`);
  console.log(`   - Backend URL: ${BACKEND_URL}`);
  console.log(`   - Demo credentials: demo@example.com / demo123`);
  console.log('\n📋 Next steps:');
  console.log('   1. Open browser to http://localhost:3000');
  console.log('   2. Login with demo credentials');
  console.log('   3. Check dashboard functionality');
  console.log('\n✨ All services should now be working correctly!');
}

testServices().catch(console.error); 