import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';
import { Asset } from './Asset';

// Alert settings interface
export interface AlertSettingAttributes {
  id?: string;
  userId: string;
  assetId?: string;
  assetSymbol?: string;
  isGlobal: boolean; // Whether this is a global setting
  sentimentThreshold: number; // Sentiment change threshold
  priceChangeThreshold: number; // Price change threshold (%)
  enableSentimentAlerts: boolean; // Whether to enable sentiment alerts
  enablePriceAlerts: boolean; // Whether to enable price alerts
  enableNarrativeAlerts: boolean; // Whether to enable narrative alerts
  alertFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly'; // Alert frequency
  emailNotifications: boolean; // Whether to send email notifications
  pushNotifications: boolean; // Whether to send push notifications
}

// Alert settings interface (for creation)
export interface AlertSettingCreationAttributes extends Omit<AlertSettingAttributes, 'id'> {}

// Alert settings model class
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

// Initialize alert settings model
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
      defaultValue: 20, // Default 20 point change
      validate: {
        min: 0,
        max: 100,
      },
    },
    priceChangeThreshold: {
      type: DataTypes.FLOAT,
      defaultValue: 5.0, // Default 5% change
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

// Establish associations
export const initializeAssociations = () => {
  AlertSetting.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  AlertSetting.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
};

export default AlertSetting; 