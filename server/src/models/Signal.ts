import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Asset } from './Asset';

// Source interface
interface Source {
  platform: 'twitter' | 'reddit' | 'news' | 'price' | 'technical' | 'onchain';
  count?: number;
  priceChange?: number;  // Price change percentage
  currentPrice?: number; // Current price
  previousPrice?: number; // Previous price
  timeframe?: string;    // Time range for price change (e.g. "1h", "24h")
}

// Signal interface
interface SignalAttributes {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  assetLogo: string;
  type: 'sentiment' | 'narrative' | 'price' | 'technical' | 'onchain';
  strength: number;
  description: string;
  sources: Source[];
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Signal interface (for creation)
interface SignalCreationAttributes extends Optional<SignalAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Signal model class
class Signal extends Model<SignalAttributes, SignalCreationAttributes> implements SignalAttributes {
  public id!: string;
  public assetId!: string;
  public assetSymbol!: string;
  public assetName!: string;
  public assetLogo!: string;
  public type!: 'sentiment' | 'narrative' | 'price' | 'technical' | 'onchain';
  public strength!: number;
  public description!: string;
  public sources!: Source[];
  public timestamp!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize signal model
Signal.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    assetId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'assets',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    assetSymbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetLogo: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    type: {
      type: DataTypes.ENUM('sentiment', 'narrative', 'price', 'technical', 'onchain'),
      allowNull: false,
    },
    strength: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sources: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Signal',
    tableName: 'signals',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['id'],
      },
      {
        fields: ['assetId', 'timestamp'],
        name: 'signals_asset_id_timestamp'
      },
    ],
  }
);

// Establish associations (delayed to ensure all models are defined)
export const initializeAssociations = () => {
  // For now, signals are independent of direct model associations
  // In the future, could add associations with assets, users, etc.
};

export { Signal }; 