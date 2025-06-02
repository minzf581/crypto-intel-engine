const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');

async function resetUserAndGetToken() {
  console.log('🔑 Resetting user password and getting auth token...\n');

  // Connect to database
  const db = new sqlite3.Database('../data/crypto-intel.sqlite');

  try {
    // Hash the password
    const plainPassword = 'demo123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Update user password
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, 'demo@example.com'],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Updated password for demo@example.com to: demo123`);
            resolve();
          }
        }
      );
    });

    // Get user ID
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, email FROM users WHERE email = ?',
        ['demo@example.com'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // Create JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'crypto-intel-secret-key-2024';
    const token = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`✅ Generated token for user ${user.email}`);
    console.log(`📋 Token: ${token}\n`);
    console.log(`🔐 Login credentials:`);
    console.log(`   Email: demo@example.com`);
    console.log(`   Password: demo123\n`);

    // Test the token with API
    const axios = require('axios');
    try {
      const response = await axios.get('http://localhost:5001/api/social-sentiment/sentiment-summary/BTC?timeframe=24h', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('🎉 API test successful!');
      console.log('📊 Sentiment Summary:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ API test failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

resetUserAndGetToken(); 