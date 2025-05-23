import { Asset, Signal } from '../models';
import logger from '../utils/logger';
import notificationService from './notificationService';
import { calculateStrength } from '../utils/signalUtils';

/**
 * 真实信号生成器
 * 注意：这里移除模拟信号生成器
 * 实际信号应该来自：
 * 1. 价格监控服务 (priceService)
 * 2. 社交媒体情感分析API 
 * 3. 新闻情感分析API
 * 4. 其他真实数据源
 */

class RealSignalGenerator {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * 启动信号生成器
   * 注意：现在不再生成模拟信号
   */
  start(): void {
    logger.info('⚠️  模拟信号生成器已禁用');
    logger.info('📊 信号现在来自真实数据源：');
    logger.info('   - 价格监控服务 (实时价格变化)');
    logger.info('   - 待添加：社交媒体情感分析');
    logger.info('   - 待添加：新闻情感分析');
    logger.info('   - 待添加：技术指标分析');
    
    // 不再启动定时器生成模拟信号
    // 真实信号由各个数据源服务主动生成
  }

  /**
   * 停止信号生成器
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('信号生成器已停止');
    }
  }

  /**
   * 手动添加情感信号（API集成时使用）
   */
  async createSentimentSignal(
    assetSymbol: string, 
    sentimentScore: number, 
    sources: Array<{platform: 'twitter' | 'reddit', count: number}>
  ): Promise<void> {
    try {
      const asset = await Asset.findOne({ where: { symbol: assetSymbol } });
      if (!asset) {
        logger.error(`资产不存在: ${assetSymbol}`);
        return;
      }

      // 根据情感分数生成描述
      let description = '';
      if (sentimentScore > 0.6) {
        description = `${asset.name} 在社交媒体上的情感明显积极，投资者情绪乐观`;
      } else if (sentimentScore < -0.6) {
        description = `${asset.name} 在社交媒体上的情感明显消极，投资者情绪谨慎`;
      } else {
        description = `${asset.name} 在社交媒体上的情感保持中性`;
      }

      // 计算信号强度
      const strength = calculateStrength(Math.abs(sentimentScore * 100), 'sentiment');

      const signal = await Signal.create({
        assetId: asset.id,
        assetSymbol: asset.symbol,
        assetName: asset.name,
        assetLogo: asset.logo,
        type: 'sentiment',
        strength,
        description,
        sources,
        timestamp: new Date()
      });

      logger.info(`生成情感信号: ${assetSymbol} (分数: ${sentimentScore}, 强度: ${strength})`);
      await notificationService.processSignal(signal);

    } catch (error) {
      logger.error('创建情感信号失败:', error);
    }
  }

  /**
   * 手动添加叙事信号（API集成时使用）
   */
  async createNarrativeSignal(
    assetSymbol: string, 
    narrativeType: string, 
    description: string, 
    sources: Array<{platform: 'twitter' | 'reddit', count: number}>
  ): Promise<void> {
    try {
      const asset = await Asset.findOne({ where: { symbol: assetSymbol } });
      if (!asset) {
        logger.error(`资产不存在: ${assetSymbol}`);
        return;
      }

      // 基于叙事类型计算强度
      const narrativeStrengthMap: Record<string, number> = {
        'upgrade': 80,
        'partnership': 70,
        'adoption': 75,
        'regulation': 60,
        'technical': 65
      };

      const strength = narrativeStrengthMap[narrativeType] || 50;

      const signal = await Signal.create({
        assetId: asset.id,
        assetSymbol: asset.symbol,
        assetName: asset.name,
        assetLogo: asset.logo,
        type: 'narrative',
        strength,
        description,
        sources,
        timestamp: new Date()
      });

      logger.info(`生成叙事信号: ${assetSymbol} (类型: ${narrativeType}, 强度: ${strength})`);
      await notificationService.processSignal(signal);

    } catch (error) {
      logger.error('创建叙事信号失败:', error);
    }
  }

  /**
   * 获取待实现的数据源状态
   */
  getDataSourceStatus(): Record<string, boolean> {
    return {
      'priceMonitoring': true,    // 已实现
      'twitterSentiment': false,  // 待实现
      'redditSentiment': false,   // 待实现
      'newsAnalysis': false,      // 待实现
      'technicalAnalysis': false // 待实现
    };
  }
}

// 导出单例
const realSignalGenerator = new RealSignalGenerator();

/**
 * 初始化信号生成器
 */
export const initializeSignalGenerator = () => {
  realSignalGenerator.start();
};

export default realSignalGenerator; 