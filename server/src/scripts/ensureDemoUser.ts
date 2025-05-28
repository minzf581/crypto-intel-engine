import { User } from '../models';
import logger from '../utils/logger';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

/**
 * Ensure demo user exists in the database
 * This function will create the demo user even if other database operations fail
 */
export async function ensureDemoUser(): Promise<void> {
  try {
    logger.info('🔍 Checking for demo user...');
    
    // First, ensure the users table exists
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          "hasCompletedOnboarding" BOOLEAN DEFAULT false,
          "selectedAssets" JSONB DEFAULT '[]'::jsonb,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      logger.info('✅ Users table ensured');
    } catch (tableError) {
      logger.warn('⚠️ Failed to create users table manually:', tableError);
      // Continue anyway - table might already exist
    }
    
    // Check if demo user exists
    let demoUser;
    try {
      demoUser = await User.findOne({ where: { email: 'demo@example.com' } });
    } catch (findError) {
      logger.warn('⚠️ Failed to query for demo user using model, trying raw query...');
      
      // Try with raw query
      try {
        const result = await sequelize.query(
          'SELECT * FROM users WHERE email = :email LIMIT 1',
          {
            replacements: { email: 'demo@example.com' },
            type: QueryTypes.SELECT
          }
        );
        demoUser = result.length > 0 ? result[0] : null;
      } catch (rawError) {
        logger.error('❌ Failed to query for demo user with raw query:', rawError);
        demoUser = null;
      }
    }
    
    if (demoUser) {
      logger.info('✅ Demo user already exists');
      return;
    }
    
    // Create demo user
    logger.info('👤 Creating demo user...');
    
    try {
      // Try using Sequelize model first
      const newDemoUser = await User.create({
        name: 'Demo User',
        email: 'demo@example.com',
        password: 'demo123', // Will be hashed by model hooks
        hasCompletedOnboarding: true,
        selectedAssets: ['BTC', 'ETH', 'SOL', 'ADA']
      });
      
      logger.info('✅ Demo user created successfully using model');
      logger.info(`   User ID: ${newDemoUser.id}`);
      logger.info(`   Email: ${newDemoUser.email}`);
      
    } catch (modelError) {
      logger.warn('⚠️ Failed to create demo user using model, trying raw query...');
      
      // Fallback: create with raw query
      try {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('demo123', 10);
        
        await sequelize.query(`
          INSERT INTO users (name, email, password, "hasCompletedOnboarding", "selectedAssets")
          VALUES (:name, :email, :password, :onboarding, :assets)
          ON CONFLICT (email) DO NOTHING
        `, {
          replacements: {
            name: 'Demo User',
            email: 'demo@example.com',
            password: hashedPassword,
            onboarding: true,
            assets: JSON.stringify(['BTC', 'ETH', 'SOL', 'ADA'])
          }
        });
        
        logger.info('✅ Demo user created successfully using raw query');
        
      } catch (rawError) {
        logger.error('❌ Failed to create demo user with raw query:', rawError);
        throw rawError;
      }
    }
    
    // Verify demo user was created
    try {
      const verifyUser = await sequelize.query(
        'SELECT id, name, email, "hasCompletedOnboarding" FROM users WHERE email = :email',
        {
          replacements: { email: 'demo@example.com' },
          type: QueryTypes.SELECT
        }
      );
      
      if (verifyUser.length > 0) {
        logger.info('✅ Demo user verified in database');
        logger.info(`   User: ${JSON.stringify(verifyUser[0])}`);
      } else {
        logger.error('❌ Demo user not found after creation attempt');
      }
    } catch (verifyError) {
      logger.warn('⚠️ Failed to verify demo user:', verifyError);
    }
    
  } catch (error) {
    logger.error('❌ Failed to ensure demo user:', error);
    throw error;
  }
} 