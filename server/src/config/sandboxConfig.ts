/**
 * Sandbox Configuration for Development/Testing
 * Allows switching between real data and development sandbox data
 * 
 * IMPORTANT: This is for DEVELOPMENT ONLY
 * Production environment must always use real data
 */

export interface SandboxConfig {
  isEnabled: boolean;
  mode: 'production' | 'sandbox';
  twitterMockEnabled: boolean;
  newsMockEnabled: boolean;
  priceSimulationEnabled: boolean;
  notificationPrefix: string;
}

/**
 * Get sandbox configuration based on environment variables
 */
export function getSandboxConfig(): SandboxConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const sandboxMode = process.env.SANDBOX_MODE || 'auto';
  const forceProductionData = process.env.FORCE_PRODUCTION_DATA === 'true';
  
  // Determine if we should enable sandbox mode
  let isEnabled = false;
  let mode: 'production' | 'sandbox' = 'production';
  
  if (forceProductionData) {
    // Force production data regardless of environment
    isEnabled = false;
    mode = 'production';
  } else if (sandboxMode === 'enabled' || sandboxMode === 'true') {
    // Explicitly enable sandbox mode
    isEnabled = true;
    mode = 'sandbox';
  } else if (sandboxMode === 'disabled' || sandboxMode === 'false') {
    // Explicitly disable sandbox mode
    isEnabled = false;
    mode = 'production';
  } else if (sandboxMode === 'auto') {
    // Auto-detect based on environment
    isEnabled = nodeEnv === 'development';
    mode = isEnabled ? 'sandbox' : 'production';
  }
  
  // Individual feature toggles
  const twitterMockEnabled = isEnabled && (process.env.TWITTER_MOCK_ENABLED !== 'false');
  const newsMockEnabled = isEnabled && (process.env.NEWS_MOCK_ENABLED !== 'false');
  const priceSimulationEnabled = isEnabled && (process.env.PRICE_SIMULATION_ENABLED !== 'false');
  
  return {
    isEnabled,
    mode,
    twitterMockEnabled,
    newsMockEnabled,
    priceSimulationEnabled,
    notificationPrefix: isEnabled ? '[SANDBOX] ' : ''
  };
}

/**
 * Log sandbox configuration for debugging
 */
export function logSandboxConfig() {
  const config = getSandboxConfig();
  
  console.log('🎭 Sandbox Configuration:');
  console.log(`   Mode: ${config.mode.toUpperCase()}`);
  console.log(`   Sandbox Enabled: ${config.isEnabled}`);
  
  if (config.isEnabled) {
    console.log(`   Twitter Mock: ${config.twitterMockEnabled}`);
    console.log(`   News Mock: ${config.newsMockEnabled}`);
    console.log(`   Price Simulation: ${config.priceSimulationEnabled}`);
    console.log(`   Notification Prefix: "${config.notificationPrefix}"`);
    console.log('   ⚠️  WARNING: Using development sandbox data!');
  } else {
    console.log('   ✅ Using real data sources only');
  }
  
  // Environment variables for reference
  console.log('📋 Sandbox Environment Variables:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   SANDBOX_MODE: ${process.env.SANDBOX_MODE || 'auto'}`);
  console.log(`   FORCE_PRODUCTION_DATA: ${process.env.FORCE_PRODUCTION_DATA || 'false'}`);
  console.log(`   TWITTER_MOCK_ENABLED: ${process.env.TWITTER_MOCK_ENABLED || 'true (in sandbox)'}`);
  console.log(`   NEWS_MOCK_ENABLED: ${process.env.NEWS_MOCK_ENABLED || 'true (in sandbox)'}`);
  console.log(`   PRICE_SIMULATION_ENABLED: ${process.env.PRICE_SIMULATION_ENABLED || 'true (in sandbox)'}`);
}

// Export the configuration instance
export const sandboxConfig = getSandboxConfig();

// Default export
export default sandboxConfig; 