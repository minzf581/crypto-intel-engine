import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

// 资产接口
export interface AssetAttributes {
  id?: string;
  symbol: string;
  name: string;
  logo: string;
}

// 资产接口(创建时)
export interface AssetCreationAttributes extends Omit<AssetAttributes, 'id'> {}

// 资产模型类
export class Asset extends Model<AssetAttributes, AssetCreationAttributes> {
  declare id: string;
  declare symbol: string;
  declare name: string;
  declare logo: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// 初始化资产模型
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
  },
  {
    sequelize,
    modelName: 'Asset',
    tableName: 'assets',
    timestamps: true,
  }
);

export default Asset; 