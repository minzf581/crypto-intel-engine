import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

// Asset interface
export interface AssetAttributes {
  id?: string;
  symbol: string;
  name: string;
  logo: string;
  coingeckoId?: string; // CoinGecko API ID for price data
}

// Asset interface (for creation)
export interface AssetCreationAttributes extends Omit<AssetAttributes, 'id'> {}

// Asset model class
export class Asset extends Model<AssetAttributes, AssetCreationAttributes> {
  declare id: string;
  declare symbol: string;
  declare name: string;
  declare logo: string;
  declare coingeckoId?: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// Initialize asset model
Asset.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    logo: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    coingeckoId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'CoinGecko API ID for fetching price data'
    },
  },
  {
    sequelize,
    modelName: 'Asset',
    tableName: 'assets',
    timestamps: true,
  }
);

export default Asset; 