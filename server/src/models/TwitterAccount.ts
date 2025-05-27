import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface TwitterAccountAttributes {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  verified: boolean;
  profileImageUrl: string;
  isInfluencer: boolean;
  influenceScore: number;
  lastActivityAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TwitterAccount extends Model<TwitterAccountAttributes> implements TwitterAccountAttributes {
  public id!: string;
  public username!: string;
  public displayName!: string;
  public bio!: string;
  public followersCount!: number;
  public followingCount!: number;
  public tweetsCount!: number;
  public verified!: boolean;
  public profileImageUrl!: string;
  public isInfluencer!: boolean;
  public influenceScore!: number;
  public lastActivityAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TwitterAccount.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    followersCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    followingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tweetsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    profileImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isInfluencer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    influenceScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

  },
  {
    sequelize,
    tableName: 'twitter_accounts',
    indexes: [
      {
        fields: ['username'],
      },
      {
        fields: ['followersCount'],
      },
      {
        fields: ['influenceScore'],
      },
      {
        fields: ['isInfluencer'],
      },
      {
        fields: ['lastActivityAt'],
      },
    ],
  }
);

// Initialize associations
export const initializeAssociations = () => {
  // TwitterAccount has many TwitterPosts
  TwitterAccount.hasMany(require('./TwitterPost').TwitterPost, {
    foreignKey: 'twitterAccountId',
    as: 'posts',
  });

  // TwitterAccount has many AccountCoinRelevances
  TwitterAccount.hasMany(require('./AccountCoinRelevance').AccountCoinRelevance, {
    foreignKey: 'twitterAccountId',
    as: 'coinRelevances',
  });
}; 