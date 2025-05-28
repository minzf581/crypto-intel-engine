import { Router, Request, Response } from 'express';
import { register, login } from '../controllers/authController';
import { TwitterOAuthService } from '../services/TwitterOAuthService';
import { User } from '../models/User';
import jwt, { SignOptions } from 'jsonwebtoken';
import logger from '../utils/logger';
import env from '../config/env';

const router = Router();
const twitterOAuthService = TwitterOAuthService.getInstance();

// User registration
router.post('/register', register);

// User login
router.post('/login', login);

/**
 * Initiate Twitter OAuth 2.0 flow
 */
router.get('/twitter/login', async (req: Request, res: Response) => {
  try {
    // Check if Twitter OAuth is configured
    if (!twitterOAuthService.isTwitterOAuthConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Twitter OAuth is not configured on this server',
        error: 'Twitter authentication is currently unavailable'
      });
    }

    const { userId } = req.query; // Optional: link to existing user
    
    const { url, state } = twitterOAuthService.generateAuthUrl(userId as string);

    logger.info('Twitter OAuth 2.0 flow initiated', { state, userId });

    // Redirect to Twitter authorization page
    res.redirect(url);
  } catch (error) {
    logger.error('Failed to initiate Twitter OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate Twitter authentication',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Handle Twitter OAuth 2.0 callback
 */
router.get('/twitter/callback', async (req: Request, res: Response) => {
  try {
    // Check if Twitter OAuth is configured
    if (!twitterOAuthService.isTwitterOAuthConfigured()) {
      logger.error('Twitter OAuth callback received but OAuth is not configured');
      return res.redirect(`${env.clientUrl}/login?error=twitter_not_configured`);
    }

    const { code, state, error } = req.query;

    // Handle OAuth error
    if (error) {
      logger.error('Twitter OAuth error:', error);
      return res.redirect(`${env.clientUrl}/login?error=twitter_auth_failed`);
    }

    if (!code || !state) {
      logger.error('Missing code or state in OAuth callback');
      return res.redirect(`${env.clientUrl}/login?error=missing_parameters`);
    }

    // Handle OAuth callback
    const { accessToken, refreshToken, userInfo } = await twitterOAuthService.handleCallback(
      code as string,
      state as string
    );

    logger.info('Twitter user authenticated:', {
      twitterId: userInfo.id,
      username: userInfo.username,
      name: userInfo.name
    });

    // Find or create user in our database
    let user = await User.findOne({
      where: { email: `${userInfo.username}@twitter.local` }
    });

    if (!user) {
      user = await User.create({
        name: userInfo.name || userInfo.username,
        email: `${userInfo.username}@twitter.local`,
        password: 'twitter_oauth', // Not used for OAuth users
        hasCompletedOnboarding: true,
        selectedAssets: ['BTC', 'ETH'], // Default assets
      });
    } else {
      // Update user info
      await user.update({
        name: userInfo.name || user.name,
      });
    }

    // Generate JWT for our application
    const payload = { 
      userId: user.id,
      twitterAccessToken: accessToken, // Include Twitter access token
      twitterUserId: userInfo.id,
      twitterUsername: userInfo.username
    };
    const secret = env.jwtSecret as string;
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    logger.info('User authenticated successfully', {
      userId: user.id,
      twitterUsername: userInfo.username
    });

    // Redirect to frontend with token
    res.redirect(`${env.clientUrl}/dashboard?token=${token}&twitter_connected=true`);

  } catch (error) {
    logger.error('Twitter OAuth callback error:', error);
    res.redirect(`${env.clientUrl}/login?error=twitter_callback_failed`);
  }
});

/**
 * Get Twitter connection status
 */
router.get('/twitter/status', async (req: Request, res: Response) => {
  try {
    // Check if Twitter OAuth is configured
    if (!twitterOAuthService.isTwitterOAuthConfigured()) {
      return res.json({
        success: true,
        connected: false,
        available: false,
        message: 'Twitter OAuth is not configured on this server'
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, env.jwtSecret as string) as any;

    const hasTwitterAccess = !!(decoded.twitterAccessToken && decoded.twitterUserId);

    res.json({
      success: true,
      connected: hasTwitterAccess,
      available: true,
      twitterUsername: decoded.twitterUsername || null,
      message: 'Twitter connection status retrieved'
    });
  } catch (error) {
    logger.error('Failed to get Twitter status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Twitter connection status'
    });
  }
});

/**
 * Test Twitter OAuth search
 */
router.get('/twitter/test-search/:coinSymbol/:coinName', async (req: Request, res: Response) => {
  try {
    // Check if Twitter OAuth is configured
    if (!twitterOAuthService.isTwitterOAuthConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Twitter OAuth is not configured on this server',
        error: 'Twitter search functionality is currently unavailable'
      });
    }

    const { coinSymbol, coinName } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, env.jwtSecret as string) as any;

    if (!decoded.twitterAccessToken) {
      return res.status(401).json({
        success: false,
        message: 'Twitter OAuth required. Please connect your Twitter account first.',
        requiresTwitterAuth: true
      });
    }

    // Test OAuth search
    const users = await twitterOAuthService.searchAccountsForCoinWithOAuth(
      decoded.twitterAccessToken,
      coinSymbol,
      coinName,
      {
        limit: 20,
        minFollowers: 1000,
        includeVerified: true
      }
    );

    res.json({
      success: true,
      data: {
        accounts: users,
        totalCount: users.length,
        hasMore: false,
        query: `${coinSymbol} ${coinName}`,
        searchMethod: 'OAuth 2.0 User Context'
      },
      message: `Found ${users.length} Twitter accounts for ${coinSymbol} using OAuth`
    });

  } catch (error) {
    logger.error('Twitter OAuth search test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Twitter OAuth search failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Check Twitter OAuth configuration status
 */
router.get('/twitter/status', (req: Request, res: Response) => {
  try {
    const isConfigured = twitterOAuthService.isTwitterOAuthConfigured();
    
    res.json({
      success: true,
      available: isConfigured,
      message: isConfigured 
        ? 'Twitter OAuth is configured and available'
        : 'Twitter OAuth is not configured. Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET to enable.'
    });
  } catch (error) {
    logger.error('Failed to check Twitter OAuth status:', error);
    res.status(500).json({
      success: false,
      available: false,
      message: 'Failed to check Twitter OAuth status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 