import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';
import { Asset } from './Asset';

// 通知类型
export type NotificationType = 'signal' | 'price' | 'system';

// 通知接口
export interface NotificationAttributes {
  id?: string;
  userId: string;
  assetId?: string;
  assetSymbol?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: any; // 附加数据
  timestamp: Date;
}

// 通知接口(创建时)
export interface NotificationCreationAttributes extends Omit<NotificationAttributes, 'id'> {}

// 通知模型类
export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> {
  declare id: string;
  declare userId: string;
  declare assetId?: string;
  declare assetSymbol?: string;
  declare type: NotificationType;
  declare title: string;
  declare message: string;
  declare read: boolean;
  declare data?: any;
  declare timestamp: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// 初始化通知模型
Notification.init(
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
    type: {
      type: DataTypes.ENUM('signal', 'price', 'system'),
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
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    data: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'read', 'timestamp'],
      },
      {
        fields: ['assetSymbol'],
      },
    ],
  }
);

// 建立关联
export const initializeAssociations = () => {
  Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Notification.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
};

export default Notification; 