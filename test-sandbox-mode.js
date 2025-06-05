#!/usr/bin/env node

/**
 * Sandbox Mode Test Script
 * Tests both enabled and disabled sandbox modes
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testSandboxMode() {
  console.log('🎭 Testing Sandbox Mode Configuration\n');

  try {
    // Test health endpoint
    console.log('1. Testing Health Endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`   ✅ Status: ${healthResponse.data.status}`);
    console.log(`   ✅ Service: ${healthResponse.data.service || 'Unknown'}`);
    
    // Test social sentiment search (this will use sandbox data if enabled)
    console.log('\n2. Testing Social Sentiment Search...');
    const searchResponse = await axios.get(`${BASE_URL}/api/social-sentiment/search-accounts-coin?symbol=BTC&limit=5`);
    
    if (searchResponse.data.success) {
      const accounts = searchResponse.data.data?.accounts || [];
      const searchMethod = searchResponse.data.data?.searchMethod || 'Unknown';
      
      console.log(`   ✅ Found ${accounts.length} accounts`);
      console.log(`   ✅ Search Method: ${searchMethod}`);
      
      if (searchMethod.includes('Sandbox')) {
        console.log('   🎭 SANDBOX MODE DETECTED');
        console.log('   ⚠️  Using mock data for development');
        
        // Display sample accounts
        if (accounts.length > 0) {
          console.log('\n   📊 Sample Sandbox Accounts:');
          accounts.slice(0, 3).forEach((account, index) => {
            console.log(`      ${index + 1}. @${account.username}`);
            console.log(`         - ${account.displayName}`);
            console.log(`         - Followers: ${account.followersCount?.toLocaleString() || 'N/A'}`);
            console.log(`         - Verified: ${account.verified ? '✅' : '❌'}`);
          });
        }
      } else {
        console.log('   🔐 PRODUCTION MODE DETECTED');
        console.log('   ✅ Using real Twitter API data');
      }
    } else {
      console.log(`   ❌ Search failed: ${searchResponse.data.message}`);
      
      if (searchResponse.data.message?.includes('Bearer Token')) {
        console.log('   💡 This is expected if Twitter API is not configured');
        console.log('   💡 Set SANDBOX_MODE=enabled to use mock data for development');
      }
    }

    // Test custom query search
    console.log('\n3. Testing Custom Query Search...');
    const customResponse = await axios.get(`${BASE_URL}/api/social-sentiment/search-accounts-query-test?query=Bitcoin&limit=3`);
    
    if (customResponse.data.success) {
      const accounts = customResponse.data.data?.accounts || [];
      const searchMethod = customResponse.data.data?.searchMethod || 'Unknown';
      
      console.log(`   ✅ Found ${accounts.length} accounts for "Bitcoin" query`);
      console.log(`   ✅ Search Method: ${searchMethod}`);
    } else {
      console.log(`   ❌ Custom search failed: ${customResponse.data.message}`);
    }

    // Check environment recommendations
    console.log('\n4. Environment Recommendations:');
    
    const isLikelySandbox = searchResponse.data.data?.searchMethod?.includes('Sandbox');
    const hasTwitterError = searchResponse.data.message?.includes('Bearer Token');
    
    if (isLikelySandbox) {
      console.log('   🎭 Sandbox Mode Active:');
      console.log('      ✅ Perfect for development and testing');
      console.log('      ✅ No API limits or costs');
      console.log('      ✅ Consistent mock data');
      console.log('      ⚠️  Remember to switch to real APIs for production');
    } else if (hasTwitterError) {
      console.log('   🔧 Configuration Needed:');
      console.log('      💡 Option 1: Enable sandbox mode for development');
      console.log('         export SANDBOX_MODE=enabled');
      console.log('      💡 Option 2: Configure real Twitter API');
      console.log('         export TWITTER_BEARER_TOKEN=your-token');
    } else {
      console.log('   🔐 Production Mode Active:');
      console.log('      ✅ Using real Twitter API data');
      console.log('      ✅ Authentic market sentiment');
      console.log('      ⚠️  Subject to API rate limits');
    }

    console.log('\n🎉 Sandbox Mode Test Completed Successfully!');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server Connection Failed:');
      console.log('   1. Make sure the server is running: npm run dev');
      console.log('   2. Check if server is on port 5001');
      console.log('   3. Verify no firewall blocking localhost:5001');
    }
    
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('   1. Check server logs for errors');
    console.log('   2. Verify environment variables are set');
    console.log('   3. Try: curl http://localhost:5001/health');
    console.log('   4. Review SANDBOX_MODE_GUIDE.md for detailed help');
  }
}

// Run the test
if (require.main === module) {
  testSandboxMode();
} 