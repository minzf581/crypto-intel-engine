import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { NewsData as INewsData } from '../types/notification';

interface NewsDataCreationAttributes extends Optional<INewsData, 'id'> {}

export class NewsData extends Model<INewsData, NewsDataCreationAttributes> implements INewsData {
  public id!: string;
  public title!: string;
  public description!: string;
  public url!: string;
  public source!: string;
  public publishedAt!: Date;
  public sentiment!: 'positive' | 'negative' | 'neutral';
  public relevantCoins!: string[];
  public impact!: 'low' | 'medium' | 'high';
  public category!: string;
}

NewsData.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    sentiment: {
      type: DataTypes.ENUM('positive', 'negative', 'neutral'),
      allowNull: false,
      defaultValue: 'neutral',
    },
    relevantCoins: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    impact: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'low',
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'general',
    },
  },
  {
    sequelize,
    tableName: 'news_data',
    timestamps: false,
    indexes: [
      {
        fields: ['publishedAt'],
      },
      {
        fields: ['sentiment'],
      },
      {
        fields: ['impact'],
      },
      {
        fields: ['source'],
      },
    ],
  }
); 