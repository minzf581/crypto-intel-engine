import { RecommendedAccount } from '../models/RecommendedAccount';
import sequelize from '../config/database';
import logger from '../utils/logger';

interface DefaultAccountData {
  coinSymbol: string;
  coinName: string;
  twitterUsername: string;
  displayName: string;
  bio: string;
  followersCount: number;
  verified: boolean;
  relevanceScore: number;
  category: 'founder' | 'influencer' | 'analyst' | 'news' | 'community' | 'developer';
  description: string;
  priority: number;
}

const defaultRecommendedAccounts: DefaultAccountData[] = [
  // Bitcoin (BTC) - Enhanced list
  {
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    twitterUsername: 'APompliano',
    displayName: 'Anthony Pompliano',
    bio: 'Bitcoin maximalist, sharing Bitcoin market trends and investment strategies',
    followersCount: 1700000,
    verified: true,
    relevanceScore: 0.95,
    category: 'influencer',
    description: 'Bitcoin maximalist focused on macroeconomic analysis and price predictions, high-signal content suitable for monitoring market sentiment.',
    priority: 10,
  },
  {
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    twitterUsername: 'saylor',
    displayName: 'Michael Saylor',
    bio: 'MicroStrategy CEO, Bitcoin advocate and institutional adoption leader',
    followersCount: 3200000,
    verified: true,
    relevanceScore: 0.92,
    category: 'influencer',
    description: 'Corporate Bitcoin adoption leader, provides institutional perspective on Bitcoin investment.',
    priority: 9,
  },
  {
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    twitterUsername: 'CathyWoodARK',
    displayName: 'Cathie Wood',
    bio: 'ARK Invest CEO, focuses on Bitcoin as a disruptive asset',
    followersCount: 900000,
    verified: true,
    relevanceScore: 0.75,
    category: 'analyst',
    description: 'Shares Bitcoin analysis from traditional finance perspective, suitable for capturing institutional investment sentiment.',
    priority: 8,
  },
  {
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    twitterUsername: 'elonmusk',
    displayName: 'Elon Musk',
    bio: 'Tesla CEO, influential voice in crypto markets',
    followersCount: 150000000,
    verified: true,
    relevanceScore: 0.88,
    category: 'influencer',
    description: 'High-impact tweets that significantly move Bitcoin markets.',
    priority: 8,
  },
  {
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    twitterUsername: 'VitalikButerin',
    displayName: 'Vitalik Buterin',
    bio: 'Ethereum co-founder, but frequently discusses Bitcoin and its impact on blockchain ecosystem',
    followersCount: 5000000,
    verified: true,
    relevanceScore: 0.85,
    category: 'founder',
    description: 'Ethereum co-founder who provides technical and macroeconomic insights about Bitcoin, with deep content suitable for sentiment analysis.',
    priority: 9,
  },

  // Ethereum (ETH) - Significantly expanded list
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'VitalikButerin',
    displayName: 'Vitalik Buterin',
    bio: 'Ethereum co-founder, discusses Ethereum upgrades, DeFi and Web3',
    followersCount: 5000000,
    verified: true,
    relevanceScore: 0.98,
    category: 'founder',
    description: 'Ethereum core figure, content covers technical updates and market dynamics, highly relevant.',
    priority: 10,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'econoar',
    displayName: 'David Hoffman',
    bio: 'Bankless co-founder, Ethereum advocate',
    followersCount: 400000,
    verified: true,
    relevanceScore: 0.90,
    category: 'influencer',
    description: 'Bankless co-founder with strong Ethereum advocacy and market analysis.',
    priority: 9,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'RyanSAdams',
    displayName: 'Ryan Sean Adams',
    bio: 'Bankless co-founder, Ethereum investor',
    followersCount: 350000,
    verified: true,
    relevanceScore: 0.88,
    category: 'influencer',
    description: 'Bankless co-founder focused on Ethereum investment strategies.',
    priority: 9,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'Camila_Russo',
    displayName: 'Camila Russo',
    bio: 'The Defiant founder, author of "The Infinite Machine"',
    followersCount: 300000,
    verified: true,
    relevanceScore: 0.90,
    category: 'news',
    description: 'Focuses on Ethereum and DeFi news and analysis, suitable for monitoring ecosystem dynamics.',
    priority: 9,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'haydenzadams',
    displayName: 'Hayden Adams',
    bio: 'Uniswap founder, DeFi pioneer on Ethereum',
    followersCount: 280000,
    verified: true,
    relevanceScore: 0.85,
    category: 'founder',
    description: 'Uniswap founder with insights into Ethereum DeFi ecosystem.',
    priority: 8,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'sassal0x',
    displayName: 'Sassal',
    bio: 'Ethereum educator, shares Ethereum technical progress and community dynamics',
    followersCount: 250000,
    verified: false,
    relevanceScore: 0.88,
    category: 'developer',
    description: 'Provides deep technical insights about Ethereum, suitable for sentiment analysis.',
    priority: 8,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'StaniKulechov',
    displayName: 'Stani Kulechov',
    bio: 'Aave founder, DeFi leader on Ethereum',
    followersCount: 200000,
    verified: true,
    relevanceScore: 0.83,
    category: 'founder',
    description: 'Aave founder with deep DeFi and Ethereum market insights.',
    priority: 8,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'ryanberckmans',
    displayName: 'Ryan Berckmans',
    bio: 'Ethereum researcher and analyst, focuses on ETH price predictions',
    followersCount: 180000,
    verified: false,
    relevanceScore: 0.85,
    category: 'analyst',
    description: 'Ethereum price analyst with strong technical analysis background.',
    priority: 8,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'kaiynne',
    displayName: 'Kain Warwick',
    bio: 'Synthetix founder, Ethereum DeFi builder',
    followersCount: 150000,
    verified: false,
    relevanceScore: 0.80,
    category: 'founder',
    description: 'Synthetix founder with Ethereum ecosystem development insights.',
    priority: 7,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'spencernoon',
    displayName: 'Spencer Noon',
    bio: 'Variant Fund partner, DeFi investor',
    followersCount: 140000,
    verified: false,
    relevanceScore: 0.80,
    category: 'analyst',
    description: 'DeFi investor with Ethereum market analysis.',
    priority: 7,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'rleshner',
    displayName: 'Robert Leshner',
    bio: 'Compound founder, DeFi pioneer',
    followersCount: 130000,
    verified: true,
    relevanceScore: 0.78,
    category: 'founder',
    description: 'Compound founder with DeFi lending market insights.',
    priority: 7,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'AnthonyLeeZhang',
    displayName: 'Anthony Lee Zhang',
    bio: 'Ethereum researcher, DeFi analyst',
    followersCount: 120000,
    verified: false,
    relevanceScore: 0.82,
    category: 'analyst',
    description: 'DeFi and Ethereum ecosystem analyst with detailed market insights.',
    priority: 7,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'ljxie',
    displayName: 'Linda Xie',
    bio: 'Scalar Capital co-founder, Ethereum investor',
    followersCount: 110000,
    verified: false,
    relevanceScore: 0.75,
    category: 'analyst',
    description: 'Ethereum investor with institutional perspective on ETH markets.',
    priority: 7,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'koeppelmann',
    displayName: 'Martin Köppelmann',
    bio: 'Gnosis co-founder, Ethereum ecosystem builder',
    followersCount: 90000,
    verified: false,
    relevanceScore: 0.78,
    category: 'founder',
    description: 'Gnosis co-founder with Ethereum infrastructure insights.',
    priority: 7,
  },
  {
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    twitterUsername: 'laurashin',
    displayName: 'Laura Shin',
    bio: 'Crypto journalist, Unchained podcast host',
    followersCount: 300000,
    verified: true,
    relevanceScore: 0.72,
    category: 'news',
    description: 'Leading crypto journalist with Ethereum market coverage.',
    priority: 6,
  },

  // Solana (SOL)
  {
    coinSymbol: 'SOL',
    coinName: 'Solana',
    twitterUsername: 'aeyakovenko',
    displayName: 'Anatoly Yakovenko',
    bio: 'Solana co-founder, discusses Solana technical development and ecosystem projects',
    followersCount: 400000,
    verified: true,
    relevanceScore: 0.95,
    category: 'founder',
    description: 'Direct from Solana core team, content highly relevant to Solana ecosystem.',
    priority: 10,
  },
  {
    coinSymbol: 'SOL',
    coinName: 'Solana',
    twitterUsername: 'rajgokal',
    displayName: 'Raj Gokal',
    bio: 'Solana co-founder, ecosystem development',
    followersCount: 200000,
    verified: true,
    relevanceScore: 0.90,
    category: 'founder',
    description: 'Solana co-founder with ecosystem development insights.',
    priority: 9,
  },
  {
    coinSymbol: 'SOL',
    coinName: 'Solana',
    twitterUsername: 'solanafloor',
    displayName: 'Solana Floor',
    bio: 'Solana ecosystem news account, shares NFT, DeFi and on-chain activities',
    followersCount: 150000,
    verified: false,
    relevanceScore: 0.85,
    category: 'news',
    description: 'Focuses on real-time updates in Solana ecosystem, suitable for monitoring community sentiment.',
    priority: 8,
  },
  {
    coinSymbol: 'SOL',
    coinName: 'Solana',
    twitterUsername: 'superteamdao',
    displayName: 'Superteam DAO',
    bio: 'Solana community DAO, shares Solana projects and developer dynamics',
    followersCount: 100000,
    verified: false,
    relevanceScore: 0.80,
    category: 'community',
    description: 'Represents Solana community activity, suitable for capturing emerging trends.',
    priority: 7,
  },

  // BNB (Binance Coin)
  {
    coinSymbol: 'BNB',
    coinName: 'Binance Coin',
    twitterUsername: 'cz_binance',
    displayName: 'Changpeng Zhao (CZ)',
    bio: 'Binance CEO, shares BNB and Binance ecosystem updates',
    followersCount: 10000000,
    verified: true,
    relevanceScore: 0.95,
    category: 'founder',
    description: 'Binance CEO with 10M followers, shares BNB and Binance ecosystem updates.',
    priority: 10,
  },
  {
    coinSymbol: 'BNB',
    coinName: 'Binance Coin',
    twitterUsername: 'BinanceResearch',
    displayName: 'Binance Research',
    bio: 'Binance research team, shares BNB market analysis',
    followersCount: 200000,
    verified: true,
    relevanceScore: 0.88,
    category: 'analyst',
    description: 'Binance research team, shares BNB market analysis, 200K followers.',
    priority: 9,
  },

  // Cardano (ADA)
  {
    coinSymbol: 'ADA',
    coinName: 'Cardano',
    twitterUsername: 'IOHK_Charles',
    displayName: 'Charles Hoskinson',
    bio: 'Cardano founder, shares Cardano technology and vision',
    followersCount: 300000,
    verified: true,
    relevanceScore: 0.95,
    category: 'founder',
    description: 'Cardano founder, 300K followers, shares Cardano technology and vision.',
    priority: 10,
  },
  {
    coinSymbol: 'ADA',
    coinName: 'Cardano',
    twitterUsername: 'CardanoFeed',
    displayName: 'Cardano Feed',
    bio: 'Cardano community news, covers Cardano ecosystem dynamics',
    followersCount: 100000,
    verified: false,
    relevanceScore: 0.82,
    category: 'news',
    description: 'Cardano community news, 100K followers, covers Cardano ecosystem dynamics.',
    priority: 8,
  },

  // Polkadot (DOT)
  {
    coinSymbol: 'DOT',
    coinName: 'Polkadot',
    twitterUsername: 'gavofyork',
    displayName: 'Gavin Wood',
    bio: 'Polkadot founder, Web3 Foundation president',
    followersCount: 250000,
    verified: true,
    relevanceScore: 0.95,
    category: 'founder',
    description: 'Polkadot founder with Web3 ecosystem insights.',
    priority: 10,
  },

  // Dogecoin (DOGE)
  {
    coinSymbol: 'DOGE',
    coinName: 'Dogecoin',
    twitterUsername: 'elonmusk',
    displayName: 'Elon Musk',
    bio: 'Tesla CEO, Dogecoin supporter',
    followersCount: 150000000,
    verified: true,
    relevanceScore: 0.90,
    category: 'influencer',
    description: 'Major Dogecoin influencer with market-moving tweets.',
    priority: 10,
  },
  {
    coinSymbol: 'DOGE',
    coinName: 'Dogecoin',
    twitterUsername: 'BillyM2k',
    displayName: 'Billy Markus',
    bio: 'Dogecoin co-creator',
    followersCount: 2000000,
    verified: true,
    relevanceScore: 0.95,
    category: 'founder',
    description: 'Dogecoin co-creator with authentic community insights.',
    priority: 9,
  },

  // Chainlink (LINK)
  {
    coinSymbol: 'LINK',
    coinName: 'Chainlink',
    twitterUsername: 'SergeyNazarov',
    displayName: 'Sergey Nazarov',
    bio: 'Chainlink co-founder, oracle network pioneer',
    followersCount: 300000,
    verified: true,
    relevanceScore: 0.95,
    category: 'founder',
    description: 'Chainlink co-founder with oracle and DeFi insights.',
    priority: 10,
  },

  // TRUMP (Meme coin)
  {
    coinSymbol: 'TRUMP',
    coinName: 'TRUMP',
    twitterUsername: 'realDonaldTrump',
    displayName: 'Donald J. Trump',
    bio: 'Former President, influential in TRUMP token markets',
    followersCount: 90000000,
    verified: true,
    relevanceScore: 0.85,
    category: 'influencer',
    description: 'High-impact political figure affecting TRUMP token sentiment.',
    priority: 9,
  },
];

export async function initializeRecommendedAccounts(): Promise<void> {
  try {
    logger.info('Starting initialization of recommended accounts...');

    // Ensure database connection
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Sync the RecommendedAccount model
    await RecommendedAccount.sync({ force: false });
    logger.info('RecommendedAccount model synced');

    // Check if data already exists
    const existingCount = await RecommendedAccount.count();
    if (existingCount > 0) {
      logger.info(`Found ${existingCount} existing recommended accounts. Skipping initialization.`);
      return;
    }

    // Insert default recommended accounts
    const createdAccounts = [];
    for (const accountData of defaultRecommendedAccounts) {
      try {
        const account = await RecommendedAccount.create({
          coinSymbol: accountData.coinSymbol,
          coinName: accountData.coinName,
          twitterUsername: accountData.twitterUsername,
          displayName: accountData.displayName,
          bio: accountData.bio,
          followersCount: accountData.followersCount,
          verified: accountData.verified,
          relevanceScore: accountData.relevanceScore,
          category: accountData.category,
          description: accountData.description,
          isActive: true,
          priority: accountData.priority,
        });

        createdAccounts.push(account);
        logger.info(`Created recommended account: ${account.twitterUsername} for ${account.coinSymbol}`);
      } catch (error) {
        logger.error(`Failed to create account ${accountData.twitterUsername}:`, error);
      }
    }

    logger.info(`Successfully initialized ${createdAccounts.length} recommended accounts`);

    // Log summary by coin
    const summary = createdAccounts.reduce((acc, account) => {
      acc[account.coinSymbol] = (acc[account.coinSymbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    logger.info('Recommended accounts summary by coin:', summary);

  } catch (error) {
    logger.error('Failed to initialize recommended accounts:', error);
    throw error;
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeRecommendedAccounts()
    .then(() => {
      logger.info('Recommended accounts initialization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Recommended accounts initialization failed:', error);
      process.exit(1);
    });
} 