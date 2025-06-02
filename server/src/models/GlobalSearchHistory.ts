import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface GlobalSearchHistoryAttributes {
  id: string;
  query: string;
  coinSymbol: string;
  coinName: string;
  userId: string;
  userName: string;
  searchFilters: {
    minFollowers?: number;
    maxFollowers?: number;
    includeVerified?: boolean;
    accountCategories?: string[];
    minEngagementRate?: number;
    language?: string;
    location?: string;
    hasRecentActivity?: boolean;
  };
  resultsCount: number;
  searchMethod: string; // 'api' | 'fallback' | 'cached'
  isSuccessful: boolean;
  searchDuration: number; // in milliseconds
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GlobalSearchHistoryCreationAttributes 
  extends Optional<GlobalSearchHistoryAttributes, 'id' | 'createdAt' | 'updatedAt' | 'ipAddress' | 'userAgent'> {}

export class GlobalSearchHistory extends Model<GlobalSearchHistoryAttributes, GlobalSearchHistoryCreationAttributes> 
  implements GlobalSearchHistoryAttributes {
  public id!: string;
  public query!: string;
  public coinSymbol!: string;
  public coinName!: string;
  public userId!: string;
  public userName!: string;
  public searchFilters!: {
    minFollowers?: number;
    maxFollowers?: number;
    includeVerified?: boolean;
    accountCategories?: string[];
    minEngagementRate?: number;
    language?: string;
    location?: string;
    hasRecentActivity?: boolean;
  };
  public resultsCount!: number;
  public searchMethod!: string;
  public isSuccessful!: boolean;
  public searchDuration!: number;
  public ipAddress?: string;
  public userAgent?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GlobalSearchHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    query: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 500],
      },
    },
    coinSymbol: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 20],
      },
    },
    coinName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    searchFilters: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    resultsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    searchMethod: {
      type: DataTypes.ENUM('api', 'fallback', 'cached'),
      allowNull: false,
      defaultValue: 'api',
    },
    isSuccessful: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    searchDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIP: true,
      },
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'global_search_history',
    timestamps: true,
    indexes: [
      {
        fields: ['query'],
      },
      {
        fields: ['coinSymbol'],
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['createdAt'],
      },
      {
        fields: ['isSuccessful'],
      },
      {
        fields: ['searchMethod'],
      },
      {
        fields: ['query', 'coinSymbol'],
      },
      {
        fields: ['createdAt', 'isSuccessful'],
      },
    ],
  }
);

export default GlobalSearchHistory; 