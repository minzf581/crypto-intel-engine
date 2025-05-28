import { Router, Request, Response } from 'express';
import { RecommendedAccountService } from '../services/RecommendedAccountService';
import { authenticateToken } from '../middlewares/auth';
import logger from '../utils/logger';

const router = Router();
const recommendedAccountService = RecommendedAccountService.getInstance();

/**
 * Get recommended accounts for a specific coin
 * GET /api/recommended-accounts/:coinSymbol
 */
router.get('/:coinSymbol', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { coinSymbol } = req.params;
    const { category, limit, includeInactive } = req.query;

    const accounts = await recommendedAccountService.getRecommendedAccounts(coinSymbol, {
      category: category as string,
      limit: limit ? parseInt(limit as string) : undefined,
      includeInactive: includeInactive === 'true',
    });

    res.json({
      success: true,
      data: {
        coinSymbol: coinSymbol.toUpperCase(),
        accounts,
        totalCount: accounts.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get recommended accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recommended accounts',
    });
  }
});

/**
 * Search recommended accounts
 * GET /api/recommended-accounts/search
 */
router.get('/search/accounts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { query, coinSymbol, category, minFollowers, verified, limit } = req.query;

    const searchParams = {
      query: query as string,
      coinSymbol: coinSymbol as string,
      category: category as string,
      minFollowers: minFollowers ? parseInt(minFollowers as string) : undefined,
      verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const accounts = await recommendedAccountService.searchRecommendedAccounts(searchParams);

    res.json({
      success: true,
      data: {
        accounts,
        totalCount: accounts.length,
        searchParams,
      },
    });
  } catch (error) {
    logger.error('Failed to search recommended accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search recommended accounts',
    });
  }
});

/**
 * Get all supported coins with recommended accounts
 * GET /api/recommended-accounts/coins/supported
 */
router.get('/coins/supported', authenticateToken, async (req: Request, res: Response) => {
  try {
    const coins = await recommendedAccountService.getSupportedCoins();

    res.json({
      success: true,
      data: {
        coins,
        totalCoins: coins.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get supported coins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve supported coins',
    });
  }
});

/**
 * Add a new recommended account
 * POST /api/recommended-accounts
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const accountData = req.body;

    // Validate required fields
    const requiredFields = ['coinSymbol', 'coinName', 'twitterUsername', 'displayName', 'description'];
    const missingFields = requiredFields.filter(field => !accountData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    const account = await recommendedAccountService.addRecommendedAccount(accountData);

    res.status(201).json({
      success: true,
      data: account,
      message: 'Recommended account added successfully',
    });
  } catch (error) {
    logger.error('Failed to add recommended account:', error);
    
    if (error instanceof Error && error.message.includes('already recommended')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add recommended account',
    });
  }
});

/**
 * Update a recommended account
 * PUT /api/recommended-accounts/:id
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const account = await recommendedAccountService.updateRecommendedAccount(id, updateData);

    res.json({
      success: true,
      data: account,
      message: 'Recommended account updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update recommended account:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update recommended account',
    });
  }
});

/**
 * Delete a recommended account
 * DELETE /api/recommended-accounts/:id
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await recommendedAccountService.deleteRecommendedAccount(id);

    res.json({
      success: true,
      message: 'Recommended account deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete recommended account:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete recommended account',
    });
  }
});

/**
 * Initialize default recommended accounts (admin only)
 * POST /api/recommended-accounts/admin/initialize
 */
router.post('/admin/initialize', authenticateToken, async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    await recommendedAccountService.initializeDefaultAccounts();

    res.json({
      success: true,
      message: 'Default recommended accounts initialized successfully',
    });
  } catch (error) {
    logger.error('Failed to initialize default accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize default accounts',
    });
  }
});

export default router; 