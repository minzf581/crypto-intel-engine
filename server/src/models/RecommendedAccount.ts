import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface RecommendedAccountAttributes {
  id: string;
  coinSymbol: string;
  coinName: string;
  twitterUsername: string;
  twitterUserId?: string;
  displayName: string;
  bio: string;
  followersCount: number;
  verified: boolean;
  profileImageUrl?: string;
  relevanceScore: number;
  category: 'founder' | 'influencer' | 'analyst' | 'news' | 'community' | 'developer';
  description: string;
  isActive: boolean;
  priority: number; // 1-10, higher = more important
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendedAccountCreationAttributes 
  extends Optional<RecommendedAccountAttributes, 'id' | 'twitterUserId' | 'profileImageUrl' | 'createdAt' | 'updatedAt'> {}

export class RecommendedAccount extends Model<RecommendedAccountAttributes, RecommendedAccountCreationAttributes>
  implements RecommendedAccountAttributes {
  public id!: string;
  public coinSymbol!: string;
  public coinName!: string;
  public twitterUsername!: string;
  public twitterUserId?: string;
  public displayName!: string;
  public bio!: string;
  public followersCount!: number;
  public verified!: boolean;
  public profileImageUrl?: string;
  public relevanceScore!: number;
  public category!: 'founder' | 'influencer' | 'analyst' | 'news' | 'community' | 'developer';
  public description!: string;
  public isActive!: boolean;
  public priority!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RecommendedAccount.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    coinSymbol: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 10],
      },
    },
    coinName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    twitterUsername: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: false, // Same username can be recommended for multiple coins
      validate: {
        notEmpty: true,
        len: [1, 50],
      },
    },
    twitterUserId: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    displayName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    followersCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    profileImageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    relevanceScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.5,
      validate: {
        min: 0,
        max: 1,
      },
    },
    category: {
      type: DataTypes.ENUM('founder', 'influencer', 'analyst', 'news', 'community', 'developer'),
      allowNull: false,
      defaultValue: 'influencer',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 1,
        max: 10,
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'RecommendedAccount',
    tableName: 'recommended_accounts',
    timestamps: true,
    indexes: [
      {
        fields: ['coinSymbol'],
      },
      {
        fields: ['twitterUsername'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['isActive'],
      },
      {
        fields: ['coinSymbol', 'priority'],
      },
    ],
  }
);

export const initializeAssociations = () => {
  // Add any associations here if needed in the future
}; 