import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { NotificationHistory as INotificationHistory } from '../types/notification';

interface NotificationHistoryCreationAttributes extends Optional<INotificationHistory, 'id' | 'read' | 'archived' | 'readAt'> {}

export class NotificationHistory extends Model<INotificationHistory, NotificationHistoryCreationAttributes> implements INotificationHistory {
  public id!: string;
  public userId!: string;
  public title!: string;
  public message!: string;
  public type!: 'price_alert' | 'signal' | 'news' | 'system';
  public priority!: 'low' | 'medium' | 'high' | 'critical';
  public data!: any;
  public read!: boolean;
  public archived!: boolean;
  public fcmToken?: string;
  public sentAt!: Date;
  public readAt?: Date;
  public groupId?: string;
  public quickActions?: any;
}

NotificationHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('price_alert', 'signal', 'news', 'system'),
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    fcmToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    groupId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quickActions: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'notification_history',
    timestamps: false,
    indexes: [
      {
        fields: ['userId', 'sentAt'],
      },
      {
        fields: ['type', 'priority'],
      },
      {
        fields: ['read', 'archived'],
      },
    ],
  }
); 