import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { Asset } from './Asset';

// 来源接口
export interface Source {
  platform: 'twitter' | 'reddit' | 'price';
  count?: number;
  priceChange?: number;  // 价格变化百分比
  currentPrice?: number; // 当前价格
  previousPrice?: number; // 之前价格
  timeframe?: string;    // 价格变化的时间范围 (如 "1h", "24h")
}

// 信号接口
export interface SignalAttributes {
  id?: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  assetLogo: string;
  type: 'sentiment' | 'narrative' | 'price';
  strength: number;
  description: string;
  sources: Source[];
  timestamp: Date;
}

// 信号接口(创建时)
export interface SignalCreationAttributes extends Omit<SignalAttributes, 'id'> {}

// 信号模型类
export class Signal extends Model<SignalAttributes, SignalCreationAttributes> {
  declare id: string;
  declare assetId: string;
  declare assetSymbol: string;
  declare assetName: string;
  declare assetLogo: string;
  declare type: 'sentiment' | 'narrative' | 'price';
  declare strength: number;
  declare description: string;
  declare sources: Source[];
  declare timestamp: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// 初始化信号模型
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
      type: DataTypes.ENUM('sentiment', 'narrative', 'price'),
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
        fields: ['assetId', 'timestamp'],
      },
    ],
  }
);

// 建立关联（延迟建立关联，确保所有模型都已定义）
export const initializeAssociations = () => {
  Signal.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
};

export default Signal; 