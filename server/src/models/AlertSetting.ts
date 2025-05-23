import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';
import { Asset } from './Asset';

// 警报设置接口
export interface AlertSettingAttributes {
  id?: string;
  userId: string;
  assetId?: string;
  assetSymbol?: string;
  isGlobal: boolean; // 是否是全局设置
  sentimentThreshold: number; // 情绪变化阈值
  priceChangeThreshold: number; // 价格变化阈值(%)
  enableSentimentAlerts: boolean; // 是否启用情绪警报
  enablePriceAlerts: boolean; // 是否启用价格警报
  enableNarrativeAlerts: boolean; // 是否启用叙事警报
  alertFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly'; // 警报频率
  emailNotifications: boolean; // 是否发送邮件通知
  pushNotifications: boolean; // 是否发送推送通知
}

// 警报设置接口(创建时)
export interface AlertSettingCreationAttributes extends Omit<AlertSettingAttributes, 'id'> {}

// 警报设置模型类
export class AlertSetting extends Model<AlertSettingAttributes, AlertSettingCreationAttributes> {
  declare id: string;
  declare userId: string;
  declare assetId?: string;
  declare assetSymbol?: string;
  declare isGlobal: boolean;
  declare sentimentThreshold: number;
  declare priceChangeThreshold: number;
  declare enableSentimentAlerts: boolean;
  declare enablePriceAlerts: boolean;
  declare enableNarrativeAlerts: boolean;
  declare alertFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  declare emailNotifications: boolean;
  declare pushNotifications: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// 初始化警报设置模型
AlertSetting.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    assetId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'assets',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    assetSymbol: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isGlobal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    sentimentThreshold: {
      type: DataTypes.INTEGER,
      defaultValue: 20, // 默认20点变化
      validate: {
        min: 0,
        max: 100,
      },
    },
    priceChangeThreshold: {
      type: DataTypes.FLOAT,
      defaultValue: 5.0, // 默认5%变化
      validate: {
        min: 0.1,
        max: 50.0,
      },
    },
    enableSentimentAlerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    enablePriceAlerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    enableNarrativeAlerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    alertFrequency: {
      type: DataTypes.ENUM('immediate', 'hourly', 'daily', 'weekly'),
      defaultValue: 'immediate',
    },
    emailNotifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    pushNotifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'AlertSetting',
    tableName: 'alert_settings',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['assetSymbol'],
      },
    ],
  }
);

// 建立关联
export const initializeAssociations = () => {
  AlertSetting.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  AlertSetting.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
};

export default AlertSetting; 