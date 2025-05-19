import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database';

// 用户接口
export interface UserAttributes {
  id?: string;
  name: string;
  email: string;
  password: string;
  hasCompletedOnboarding: boolean;
  selectedAssets: string[];
}

// 用户接口(创建时)
export interface UserCreationAttributes extends Omit<UserAttributes, 'id'> {}

// 用户模型类
export class User extends Model<UserAttributes, UserCreationAttributes> {
  declare id: string;
  declare name: string;
  declare email: string;
  declare password: string;
  declare hasCompletedOnboarding: boolean;
  declare selectedAssets: string[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // 密码比较方法
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

// 初始化用户模型
User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100],
      },
    },
    hasCompletedOnboarding: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    selectedAssets: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
  }
);

// 密码哈希钩子
User.beforeCreate(async (user) => {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

export default User; 