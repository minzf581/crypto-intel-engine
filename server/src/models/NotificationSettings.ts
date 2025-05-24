import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { NotificationSettings as INotificationSettings } from '../types/notification';

interface NotificationSettingsCreationAttributes extends Optional<INotificationSettings, 'id' | 'createdAt' | 'updatedAt'> {}

export class NotificationSettings extends Model<INotificationSettings, NotificationSettingsCreationAttributes> implements INotificationSettings {
  public id!: string;
  public userId!: string;
  public pushEnabled!: boolean;
  public soundEnabled!: boolean;
  public emailEnabled!: boolean;
  public soundType!: 'default' | 'bell' | 'chime' | 'alert';
  public priority!: 'low' | 'medium' | 'high' | 'critical';
  public groupingEnabled!: boolean;
  public maxPerHour!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

NotificationSettings.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    pushEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    soundEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    emailEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    soundType: {
      type: DataTypes.ENUM('default', 'bell', 'chime', 'alert'),
      defaultValue: 'default',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },
    groupingEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    maxPerHour: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
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
    tableName: 'notification_settings',
    timestamps: true,
  }
); 