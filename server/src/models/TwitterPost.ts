import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface TwitterPostAttributes {
  id: string;
  twitterAccountId: string;
  content: string;
  hashtags: string[];
  mentions: string[];
  relevantCoins: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  impact: 'low' | 'medium' | 'high';
  impactScore: number;
  retweetCount: number;
  likeCount: number;
  replyCount: number;
  quoteCount: number;
  viewCount: number;
  isRetweet: boolean;
  originalPostId?: string;
  publishedAt: Date;
  processedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TwitterPost extends Model<TwitterPostAttributes> implements TwitterPostAttributes {
  public id!: string;
  public twitterAccountId!: string;
  public content!: string;
  public hashtags!: string[];
  public mentions!: string[];
  public relevantCoins!: string[];
  public sentiment!: 'positive' | 'negative' | 'neutral';
  public sentimentScore!: number;
  public impact!: 'low' | 'medium' | 'high';
  public impactScore!: number;
  public retweetCount!: number;
  public likeCount!: number;
  public replyCount!: number;
  public quoteCount!: number;
  public viewCount!: number;
  public isRetweet!: boolean;
  public originalPostId?: string;
  public publishedAt!: Date;
  public processedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TwitterPost.init(
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    hashtags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    mentions: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    relevantCoins: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    sentiment: {
      type: DataTypes.ENUM('positive', 'negative', 'neutral'),
      allowNull: false,
      defaultValue: 'neutral',
    },
    sentimentScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      validate: {
        min: -1.0,
        max: 1.0,
      },
    },
    impact: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'low',
    },
    impactScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    retweetCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    replyCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    quoteCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isRetweet: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    originalPostId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

  },
  {
    sequelize,
    tableName: 'twitter_posts',
    indexes: [
      {
        fields: ['twitterAccountId'],
      },
      {
        fields: ['publishedAt'],
      },
      {
        fields: ['sentiment'],
      },
      {
        fields: ['impact'],
      },
      {
        fields: ['sentimentScore'],
      },
      {
        fields: ['impactScore'],
      },
      {
        fields: ['relevantCoins'],
        using: 'gin', // For JSON array search (PostgreSQL)
      },
    ],
  }
);

// Initialize associations
export const initializeAssociations = () => {
  // TwitterPost belongs to TwitterAccount
  TwitterPost.belongsTo(require('./TwitterAccount').TwitterAccount, {
    foreignKey: 'twitterAccountId',
    as: 'account',
  });
}; 