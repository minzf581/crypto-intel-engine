import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface AccountCoinRelevanceAttributes {
  id: string;
  twitterAccountId: string;
  coinSymbol: string;
  relevanceScore: number;
  mentionCount: number;
  totalPosts: number;
  mentionFrequency: number;
  avgSentiment: number;
  avgImpact: number;
  lastMentionAt: Date;
  historicalData: {
    date: string;
    mentions: number;
    sentiment: number;
    impact: number;
  }[];
  keywordFrequency: Record<string, number>;
  correlationScore: number;
  isConfirmed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AccountCoinRelevance extends Model<AccountCoinRelevanceAttributes> implements AccountCoinRelevanceAttributes {
  public id!: string;
  public twitterAccountId!: string;
  public coinSymbol!: string;
  public relevanceScore!: number;
  public mentionCount!: number;
  public totalPosts!: number;
  public mentionFrequency!: number;
  public avgSentiment!: number;
  public avgImpact!: number;
  public lastMentionAt!: Date;
  public historicalData!: {
    date: string;
    mentions: number;
    sentiment: number;
    impact: number;
  }[];
  public keywordFrequency!: Record<string, number>;
  public correlationScore!: number;
  public isConfirmed!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AccountCoinRelevance.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    twitterAccountId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'twitter_accounts',
        key: 'id',
      },
    },
    coinSymbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    relevanceScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    mentionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalPosts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    mentionFrequency: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    avgSentiment: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      validate: {
        min: -1.0,
        max: 1.0,
      },
    },
    avgImpact: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    lastMentionAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    historicalData: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    keywordFrequency: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    correlationScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      validate: {
        min: -1.0,
        max: 1.0,
      },
    },
    isConfirmed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

  },
  {
    sequelize,
    tableName: 'account_coin_relevances',
    indexes: [
      {
        fields: ['twitterAccountId'],
      },
      {
        fields: ['coinSymbol'],
      },
      {
        fields: ['relevanceScore'],
      },
      {
        fields: ['correlationScore'],
      },
      {
        fields: ['isConfirmed'],
      },
      {
        unique: true,
        fields: ['twitterAccountId', 'coinSymbol'],
      },
    ],
  }
);

// Initialize associations
export const initializeAssociations = () => {
  // AccountCoinRelevance belongs to TwitterAccount
  AccountCoinRelevance.belongsTo(require('./TwitterAccount').TwitterAccount, {
    foreignKey: 'twitterAccountId',
    as: 'account',
  });
}; 