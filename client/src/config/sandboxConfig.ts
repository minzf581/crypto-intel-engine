/**
 * Frontend Sandbox Configuration
 * Detects if the backend is running in sandbox mode and provides appropriate UI indicators
 */

export interface FrontendSandboxConfig {
  isBackendSandboxEnabled: boolean;
  showSandboxWarnings: boolean;
  sandboxNotificationPrefix: string;
}

/**
 * Detect if backend is likely running in sandbox mode
 */
export function getFrontendSandboxConfig(): FrontendSandboxConfig {
  // Check if we're in development environment
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  // Check for explicit sandbox mode environment variables
  const sandboxMode = import.meta.env.VITE_SANDBOX_MODE;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Determine if backend is likely in sandbox mode
  let isBackendSandboxEnabled = false;
  
  if (sandboxMode === 'enabled' || sandboxMode === 'true') {
    isBackendSandboxEnabled = true;
  } else if (sandboxMode === 'disabled' || sandboxMode === 'false') {
    isBackendSandboxEnabled = false;
  } else {
    // Auto-detect: assume sandbox if in development and on localhost
    isBackendSandboxEnabled = isDevelopment && isLocalhost;
  }
  
  return {
    isBackendSandboxEnabled,
    showSandboxWarnings: isBackendSandboxEnabled,
    sandboxNotificationPrefix: isBackendSandboxEnabled ? '[SANDBOX] ' : ''
  };
}

/**
 * Get sandbox warning message for UI components
 */
export function getSandboxWarningMessage(): string {
  const config = getFrontendSandboxConfig();
  
  if (!config.isBackendSandboxEnabled) {
    return '';
  }
  
  return '⚠️ Development Mode: Using sandbox data for testing purposes. This is not real financial data.';
}

/**
 * Check if a specific feature should show sandbox warnings
 */
export function shouldShowSandboxWarning(feature: 'twitter' | 'news' | 'price'): boolean {
  const config = getFrontendSandboxConfig();
  
  if (!config.showSandboxWarnings) {
    return false;
  }
  
  // Always show warnings for Twitter and news in sandbox mode
  // Price data warnings depend on if real price data is available
  switch (feature) {
    case 'twitter':
    case 'news':
      return true;
    case 'price':
      return false; // Price data should always be real (CoinGecko)
    default:
      return true;
  }
}

/**
 * Get sandbox indicator for data source labels
 */
export function getSandboxDataLabel(originalLabel: string, feature: 'twitter' | 'news' | 'price'): string {
  const config = getFrontendSandboxConfig();
  
  if (!config.isBackendSandboxEnabled || !shouldShowSandboxWarning(feature)) {
    return originalLabel;
  }
  
  return `${config.sandboxNotificationPrefix}${originalLabel} (Development Data)`;
}

/**
 * Log frontend sandbox configuration for debugging
 */
export function logFrontendSandboxConfig(): void {
  const config = getFrontendSandboxConfig();
  
  console.log('🎭 Frontend Sandbox Configuration:');
  console.log(`   Backend Sandbox Enabled: ${config.isBackendSandboxEnabled}`);
  console.log(`   Show Sandbox Warnings: ${config.showSandboxWarnings}`);
  console.log(`   Notification Prefix: "${config.sandboxNotificationPrefix}"`);
  
  if (config.isBackendSandboxEnabled) {
    console.log('   ⚠️  WARNING: Frontend detected backend sandbox mode!');
    console.log('   📋 Environment Variables:');
    console.log(`      VITE_SANDBOX_MODE: ${import.meta.env.VITE_SANDBOX_MODE || 'not set'}`);
    console.log(`      NODE_ENV: ${import.meta.env.NODE_ENV || 'not set'}`);
    console.log(`      MODE: ${import.meta.env.MODE || 'not set'}`);
    console.log(`      DEV: ${import.meta.env.DEV || 'not set'}`);
  } else {
    console.log('   ✅ Production mode detected');
  }
}

// Export the configuration instance
export const frontendSandboxConfig = getFrontendSandboxConfig();

// Default export
export default frontendSandboxConfig; 