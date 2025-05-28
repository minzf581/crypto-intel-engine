import { RecommendedAccount, RecommendedAccountCreationAttributes } from '../models/RecommendedAccount';
import { TwitterService } from './TwitterService';
import { Op } from 'sequelize';
import logger from '../utils/logger';

export interface RecommendedAccountWithStatus extends RecommendedAccountCreationAttributes {
  isMonitored?: boolean;
  monitoringStatus?: 'active' | 'inactive' | 'pending';
}

export class RecommendedAccountService {
  private static instance: RecommendedAccountService;
  private twitterService: TwitterService;

  constructor() {
    this.twitterService = TwitterService.getInstance();
  }

  public static getInstance(): RecommendedAccountService {
    if (!RecommendedAccountService.instance) {
      RecommendedAccountService.instance = new RecommendedAccountService();
    }
    return RecommendedAccountService.instance;
  }

  /**
   * Get recommended accounts for a specific coin
   */
  async getRecommendedAccounts(
    coinSymbol: string,
    options: {
      category?: string;
      limit?: number;
      includeInactive?: boolean;
    } = {}
  ): Promise<RecommendedAccountWithStatus[]> {
    const { category, limit = 50, includeInactive = false } = options;

    try {
      const whereClause: any = {
        coinSymbol: coinSymbol.toUpperCase(),
      };

      if (category) {
        whereClause.category = category;
      }

      if (!includeInactive) {
        whereClause.isActive = true;
      }

      const accounts = await RecommendedAccount.findAll({
        where: whereClause,
        order: [['priority', 'DESC'], ['followersCount', 'DESC']],
        limit,
      });

      // Convert to plain objects and add monitoring status
      const accountsWithStatus = accounts.map(account => ({
        ...account.toJSON(),
        isMonitored: false, // TODO: Check actual monitoring status
        monitoringStatus: 'inactive' as const,
      }));

      return accountsWithStatus;
    } catch (error) {
      logger.error(`Failed to get recommended accounts for ${coinSymbol}:`, error);
      throw new Error('Failed to retrieve recommended accounts');
    }
  }

  /**
   * Add a new recommended account
   */
  async addRecommendedAccount(accountData: RecommendedAccountCreationAttributes): Promise<RecommendedAccount> {
    try {
      // Check if account already exists for this coin
      const existing = await RecommendedAccount.findOne({
        where: {
          coinSymbol: accountData.coinSymbol.toUpperCase(),
          twitterUsername: accountData.twitterUsername.toLowerCase(),
        },
      });

      if (existing) {
        throw new Error(`Account @${accountData.twitterUsername} is already recommended for ${accountData.coinSymbol}`);
      }

      // Try to fetch real Twitter data if possible
      let enrichedData = { ...accountData };
      try {
        // This would require implementing a user lookup in TwitterService
        // For now, we'll use the provided data
        logger.info(`Adding recommended account @${accountData.twitterUsername} for ${accountData.coinSymbol}`);
      } catch (twitterError) {
        logger.warn(`Could not fetch Twitter data for @${accountData.twitterUsername}:`, twitterError);
      }

      const account = await RecommendedAccount.create({
        ...enrichedData,
        coinSymbol: enrichedData.coinSymbol.toUpperCase(),
        twitterUsername: enrichedData.twitterUsername.toLowerCase(),
      });

      logger.info(`Successfully added recommended account: @${account.twitterUsername} for ${account.coinSymbol}`);
      return account;
    } catch (error) {
      logger.error('Failed to add recommended account:', error);
      throw error;
    }
  }

  /**
   * Update a recommended account
   */
  async updateRecommendedAccount(
    id: string,
    updateData: Partial<RecommendedAccountCreationAttributes>
  ): Promise<RecommendedAccount> {
    try {
      const account = await RecommendedAccount.findByPk(id);
      if (!account) {
        throw new Error('Recommended account not found');
      }

      await account.update(updateData);
      logger.info(`Updated recommended account: ${account.twitterUsername}`);
      return account;
    } catch (error) {
      logger.error('Failed to update recommended account:', error);
      throw error;
    }
  }

  /**
   * Delete a recommended account
   */
  async deleteRecommendedAccount(id: string): Promise<void> {
    try {
      const account = await RecommendedAccount.findByPk(id);
      if (!account) {
        throw new Error('Recommended account not found');
      }

      await account.destroy();
      logger.info(`Deleted recommended account: ${account.twitterUsername}`);
    } catch (error) {
      logger.error('Failed to delete recommended account:', error);
      throw error;
    }
  }

  /**
   * Initialize default recommended accounts
   */
  async initializeDefaultAccounts(): Promise<void> {
    try {
      logger.info('Initializing default recommended accounts...');

      const defaultAccounts: RecommendedAccountCreationAttributes[] = [
        // Bitcoin (BTC)
        {
          coinSymbol: 'BTC',
          coinName: 'Bitcoin',
          twitterUsername: 'vitalikbuterin',
          displayName: 'Vitalik Buterin',
          bio: 'Ethereum co-founder, discusses Bitcoin and blockchain ecosystem impact',
          followersCount: 5000000,
          verified: true,
          relevanceScore: 0.9,
          category: 'founder',
          description: 'Ethereum co-founder who provides Bitcoin technical and macroeconomic insights',
          priority: 9,
          isActive: true,
        },
        {
          coinSymbol: 'BTC',
          coinName: 'Bitcoin',
          twitterUsername: 'apompliano',
          displayName: 'Anthony Pompliano',
          bio: 'Bitcoin maximalist, market trends and investment strategies',
          followersCount: 1700000,
          verified: true,
          relevanceScore: 0.95,
          category: 'influencer',
          description: 'Bitcoin maximalist focused on macroeconomic analysis and price predictions',
          priority: 10,
          isActive: true,
        },
        {
          coinSymbol: 'BTC',
          coinName: 'Bitcoin',
          twitterUsername: 'cathywoodark',
          displayName: 'Cathie Wood',
          bio: 'ARK Invest CEO, focuses on Bitcoin as disruptive asset',
          followersCount: 900000,
          verified: true,
          relevanceScore: 0.8,
          category: 'analyst',
          description: 'Institutional perspective on Bitcoin and traditional finance intersection',
          priority: 8,
          isActive: true,
        },

        // Ethereum (ETH)
        {
          coinSymbol: 'ETH',
          coinName: 'Ethereum',
          twitterUsername: 'vitalikbuterin',
          displayName: 'Vitalik Buterin',
          bio: 'Ethereum co-founder, discusses upgrades, DeFi and Web3',
          followersCount: 5000000,
          verified: true,
          relevanceScore: 1.0,
          category: 'founder',
          description: 'Ethereum core founder, provides technical updates and market insights',
          priority: 10,
          isActive: true,
        },
        {
          coinSymbol: 'ETH',
          coinName: 'Ethereum',
          twitterUsername: 'camila_russo',
          displayName: 'Camila Russo',
          bio: 'The Defiant founder, author of The Infinite Machine',
          followersCount: 300000,
          verified: true,
          relevanceScore: 0.9,
          category: 'news',
          description: 'Ethereum and DeFi news and analysis expert',
          priority: 9,
          isActive: true,
        },
        {
          coinSymbol: 'ETH',
          coinName: 'Ethereum',
          twitterUsername: 'sassal0x',
          displayName: 'Sassal',
          bio: 'Ethereum educator, technical progress and community dynamics',
          followersCount: 250000,
          verified: false,
          relevanceScore: 0.85,
          category: 'developer',
          description: 'Deep technical insights into Ethereum development',
          priority: 8,
          isActive: true,
        },

        // Solana (SOL)
        {
          coinSymbol: 'SOL',
          coinName: 'Solana',
          twitterUsername: 'aeyakovenko',
          displayName: 'Anatoly Yakovenko',
          bio: 'Solana co-founder, technical development and ecosystem projects',
          followersCount: 400000,
          verified: true,
          relevanceScore: 1.0,
          category: 'founder',
          description: 'Direct insights from Solana core team and technical roadmap',
          priority: 10,
          isActive: true,
        },
        {
          coinSymbol: 'SOL',
          coinName: 'Solana',
          twitterUsername: 'solanafloor',
          displayName: 'Solana Floor',
          bio: 'Solana ecosystem news, NFTs, DeFi and on-chain activity',
          followersCount: 150000,
          verified: false,
          relevanceScore: 0.9,
          category: 'news',
          description: 'Real-time Solana ecosystem updates and community sentiment',
          priority: 9,
          isActive: true,
        },
        {
          coinSymbol: 'SOL',
          coinName: 'Solana',
          twitterUsername: 'superteamdao',
          displayName: 'Superteam DAO',
          bio: 'Solana community DAO, projects and developer dynamics',
          followersCount: 100000,
          verified: false,
          relevanceScore: 0.8,
          category: 'community',
          description: 'Represents Solana community activity and emerging trends',
          priority: 8,
          isActive: true,
        },

        // BNB (Binance Coin)
        {
          coinSymbol: 'BNB',
          coinName: 'Binance Coin',
          twitterUsername: 'cz_binance',
          displayName: 'Changpeng Zhao',
          bio: 'Binance CEO, BNB and Binance ecosystem updates',
          followersCount: 10000000,
          verified: true,
          relevanceScore: 1.0,
          category: 'founder',
          description: 'Direct updates from Binance leadership on BNB developments',
          priority: 10,
          isActive: true,
        },
        {
          coinSymbol: 'BNB',
          coinName: 'Binance Coin',
          twitterUsername: 'binanceresearch',
          displayName: 'Binance Research',
          bio: 'Binance research team, BNB market analysis',
          followersCount: 200000,
          verified: true,
          relevanceScore: 0.9,
          category: 'analyst',
          description: 'Professional market analysis and BNB ecosystem research',
          priority: 9,
          isActive: true,
        },

        // Cardano (ADA)
        {
          coinSymbol: 'ADA',
          coinName: 'Cardano',
          twitterUsername: 'iohk_charles',
          displayName: 'Charles Hoskinson',
          bio: 'Cardano founder, technology and vision updates',
          followersCount: 300000,
          verified: true,
          relevanceScore: 1.0,
          category: 'founder',
          description: 'Cardano founder providing technical roadmap and ecosystem updates',
          priority: 10,
          isActive: true,
        },
        {
          coinSymbol: 'ADA',
          coinName: 'Cardano',
          twitterUsername: 'cardanofeed',
          displayName: 'Cardano Feed',
          bio: 'Cardano community news and ecosystem dynamics',
          followersCount: 100000,
          verified: false,
          relevanceScore: 0.85,
          category: 'news',
          description: 'Comprehensive Cardano ecosystem news and community updates',
          priority: 8,
          isActive: true,
        },
      ];

      // Check which accounts already exist
      const existingAccounts = await RecommendedAccount.findAll({
        attributes: ['coinSymbol', 'twitterUsername'],
      });

      const existingKeys = new Set(
        existingAccounts.map(acc => `${acc.coinSymbol}-${acc.twitterUsername}`)
      );

      // Filter out accounts that already exist
      const newAccounts = defaultAccounts.filter(
        acc => !existingKeys.has(`${acc.coinSymbol.toUpperCase()}-${acc.twitterUsername.toLowerCase()}`)
      );

      if (newAccounts.length === 0) {
        logger.info('All default recommended accounts already exist');
        return;
      }

      // Bulk create new accounts
      await RecommendedAccount.bulkCreate(newAccounts);
      logger.info(`Successfully initialized ${newAccounts.length} default recommended accounts`);

    } catch (error) {
      logger.error('Failed to initialize default recommended accounts:', error);
      throw error;
    }
  }

  /**
   * Get all supported coins with recommended accounts
   */
  async getSupportedCoins(): Promise<Array<{ coinSymbol: string; coinName: string; accountCount: number }>> {
    try {
      const result = await RecommendedAccount.findAll({
        attributes: [
          'coinSymbol',
          'coinName',
          [RecommendedAccount.sequelize!.fn('COUNT', RecommendedAccount.sequelize!.col('id')), 'accountCount'],
        ],
        where: { isActive: true },
        group: ['coinSymbol', 'coinName'],
        order: [['coinSymbol', 'ASC']],
      });

      return result.map(item => ({
        coinSymbol: item.coinSymbol,
        coinName: item.coinName,
        accountCount: parseInt((item as any).dataValues.accountCount),
      }));
    } catch (error) {
      logger.error('Failed to get supported coins:', error);
      throw new Error('Failed to retrieve supported coins');
    }
  }

  /**
   * Search recommended accounts by criteria
   */
  async searchRecommendedAccounts(searchParams: {
    query?: string;
    coinSymbol?: string;
    category?: string;
    minFollowers?: number;
    verified?: boolean;
    limit?: number;
  }): Promise<RecommendedAccountWithStatus[]> {
    const { query, coinSymbol, category, minFollowers, verified, limit = 50 } = searchParams;

    try {
      const whereClause: any = { isActive: true };

      if (coinSymbol) {
        whereClause.coinSymbol = coinSymbol.toUpperCase();
      }

      if (category) {
        whereClause.category = category;
      }

      if (minFollowers) {
        whereClause.followersCount = { [Op.gte]: minFollowers };
      }

      if (verified !== undefined) {
        whereClause.verified = verified;
      }

      if (query) {
        const searchTerm = `%${query.toLowerCase()}%`;
        whereClause[Op.or] = [
          { twitterUsername: { [Op.like]: searchTerm } },
          { displayName: { [Op.like]: searchTerm } },
          { bio: { [Op.like]: searchTerm } },
          { description: { [Op.like]: searchTerm } },
        ];
      }

      const accounts = await RecommendedAccount.findAll({
        where: whereClause,
        order: [['priority', 'DESC'], ['followersCount', 'DESC']],
        limit,
      });

      return accounts.map(account => ({
        ...account.toJSON(),
        isMonitored: false, // TODO: Check actual monitoring status
        monitoringStatus: 'inactive' as const,
      }));
    } catch (error) {
      logger.error('Failed to search recommended accounts:', error);
      throw new Error('Failed to search recommended accounts');
    }
  }
} 