#!/usr/bin/env node

/**
 * Railway Database Initialization Script
 * This script ensures that the PostgreSQL database on Railway has all necessary seed data
 */

import { connectDatabase, syncModels } from '../config/database';
import { seedData } from '../config/seedData';
import { initializeRecommendedAccounts } from './initializeRecommendedAccounts';
import logger from '../utils/logger';
import { User, Asset } from '../models';

async function initializeRailwayDatabase() {
  try {
    logger.info('🚂 Starting Railway database initialization...');
    
    // Connect to database
    await connectDatabase();
    logger.info('✅ Connected to Railway PostgreSQL database');
    
    // Sync models (create tables)
    await syncModels();
    logger.info('✅ Database tables synchronized');
    
    // Initialize seed data
    await seedData();
    logger.info('✅ Seed data initialized');
    
    // Initialize recommended accounts
    await initializeRecommendedAccounts();
    logger.info('✅ Recommended accounts initialized');
    
    // Verify demo user exists
    const demoUser = await User.findOne({ where: { email: 'demo@example.com' } });
    if (demoUser) {
      logger.info('✅ Demo user verified: demo@example.com');
      logger.info(`   User ID: ${demoUser.id}`);
      logger.info(`   Name: ${demoUser.name}`);
      logger.info(`   Onboarding completed: ${demoUser.hasCompletedOnboarding}`);
    } else {
      logger.error('❌ Demo user not found! Creating now...');
      const newDemoUser = await User.create({
        name: 'Demo User',
        email: 'demo@example.com',
        password: 'demo123',
        hasCompletedOnboarding: true,
        selectedAssets: ['BTC', 'ETH', 'SOL', 'ADA']
      });
      logger.info(`✅ Created demo user: ${newDemoUser.email}`);
    }
    
    // Verify assets exist
    const assetCount = await Asset.count();
    logger.info(`✅ Assets in database: ${assetCount}`);
    
    if (assetCount > 0) {
      const assets = await Asset.findAll({ attributes: ['symbol', 'name'] });
      logger.info('📊 Available assets:');
      assets.forEach(asset => {
        logger.info(`   - ${asset.symbol}: ${asset.name}`);
      });
    }
    
    logger.info('🎉 Railway database initialization completed successfully!');
    logger.info('');
    logger.info('📋 Demo Login Credentials:');
    logger.info('   Email: demo@example.com');
    logger.info('   Password: demo123');
    logger.info('');
    
  } catch (error) {
    logger.error('❌ Railway database initialization failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeRailwayDatabase()
    .then(() => {
      logger.info('✅ Database initialization script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Database initialization script failed:', error);
      process.exit(1);
    });
}

export { initializeRailwayDatabase }; 