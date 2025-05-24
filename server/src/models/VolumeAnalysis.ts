import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { VolumeAnalysis as IVolumeAnalysis } from '../types/notification';

interface VolumeAnalysisCreationAttributes extends Optional<IVolumeAnalysis, 'id'> {}

export class VolumeAnalysis extends Model<IVolumeAnalysis, VolumeAnalysisCreationAttributes> implements IVolumeAnalysis {
  public id!: string;
  public symbol!: string;
  public timestamp!: Date;
  public volume24h!: number;
  public volumeChange!: number;
  public volumeAvg7d!: number;
  public volumeRatio!: number;
  public unusualVolumeDetected!: boolean;
  public volumeSpike!: boolean;
}

VolumeAnalysis.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    volume24h: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    volumeChange: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
    },
    volumeAvg7d: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    volumeRatio: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
    },
    unusualVolumeDetected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    volumeSpike: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'volume_analysis',
    timestamps: false,
    indexes: [
      {
        fields: ['symbol', 'timestamp'],
      },
      {
        fields: ['unusualVolumeDetected'],
      },
      {
        fields: ['volumeSpike'],
      },
    ],
  }
); 