/**
 * Frontend Environment Detection Utility
 * Automatically detects running environment and configures API endpoints
 */

export interface FrontendEnvironmentConfig {
  isProduction: boolean;
  isRailway: boolean;
  isLocal: boolean;
  apiUrl: string;
  frontendUrl: string;
  isDevelopment: boolean;
}

/**
 * Detect current frontend environment
 */
export function detectFrontendEnvironment(): FrontendEnvironmentConfig {
  // Safe window location access with fallbacks
  const hostname = (typeof window !== 'undefined' && window.location?.hostname) || 'localhost';
  const port = (typeof window !== 'undefined' && window.location?.port) || '';
  const protocol = (typeof window !== 'undefined' && window.location?.protocol) || 'http:';
  
  // Build current URL safely
  const currentUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;
  
  // Check if running on Railway
  const isRailway = hostname.includes('railway.app');
  
  // Check if running locally
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Check if production
  const isProduction = !isLocal && !isRailway;
  
  let apiUrl: string;
  let frontendUrl: string;
  
  if (isRailway) {
    // Railway production
    apiUrl = 'https://crypto-demo.up.railway.app';
    frontendUrl = 'https://crypto-front-demo.up.railway.app';
  } else if (isProduction) {
    // Other production environment
    apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:5001';
    frontendUrl = currentUrl;
  } else {
    // Local development - always use port 5001 for API
    apiUrl = 'http://localhost:5001';
    frontendUrl = currentUrl;
  }
  
  return {
    isProduction,
    isRailway,
    isLocal,
    apiUrl,
    frontendUrl,
    isDevelopment: !isProduction
  };
}

/**
 * Check if a URL is an internal API call to our backend
 */
export function isInternalApiCall(url?: string): boolean {
  if (!url) return false;
  
  try {
    const env = detectFrontendEnvironment();
    
    // Check if URL starts with our API base URL
    if (url.startsWith(env.apiUrl)) {
      return true;
    }
    
    // Check if URL is a relative path to our API
    if (url.startsWith('/api/')) {
      return true;
    }
    
    // Check for relative URLs that would go to our backend
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in isInternalApiCall:', error);
    // Default to true for safety - better to add auth header unnecessarily than miss it
    return true;
  }
}

/**
 * Get axios configuration based on environment
 */
export function getAxiosConfig() {
  try {
    const env = detectFrontendEnvironment();
    
    const config = {
      baseURL: env.apiUrl,
      timeout: env.isLocal ? 30000 : 15000, // Longer timeout for local dev
      withCredentials: false, // Don't send cookies to avoid CORS issues
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    return config;
  } catch (error) {
    console.error('Error getting axios config:', error);
    // Return safe fallback configuration
    return {
      baseURL: 'http://localhost:5001',
      timeout: 15000,
      withCredentials: false,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
  }
}

/**
 * Log frontend environment information for debugging
 */
export function logFrontendEnvironmentInfo() {
  try {
    const env = detectFrontendEnvironment();
    
    console.log('🌐 Frontend Environment Configuration:');
    console.log(`   Environment: ${env.isRailway ? 'Railway' : env.isProduction ? 'Production' : 'Local Development'}`);
    console.log(`   Frontend URL: ${env.frontendUrl}`);
    console.log(`   API URL: ${env.apiUrl}`);
    console.log(`   Is Development: ${env.isDevelopment}`);
    
    if (typeof window !== 'undefined') {
      console.log(`   Current Location: ${window.location.href}`);
      console.log(`   User Agent: ${navigator.userAgent.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('Error logging frontend environment info:', error);
  }
} 