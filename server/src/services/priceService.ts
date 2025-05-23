import axios from 'axios';
import { Asset, Signal } from '../models';
import logger from '../utils/logger';
import notificationService from './notificationService';
import { calculateStrength } from '../utils/signalUtils';

// CoinGecko API配置
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const PRICE_UPDATE_INTERVAL = 60000; // 1分钟更新一次
const PRICE_CHANGE_THRESHOLD = 5; // 5%变化阈值

// 加密货币ID映射(CoinGecko API使用的ID)
const COIN_ID_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum', 
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'DOGE': 'dogecoin'
};

// 价格数据接口
interface PriceData {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  lastUpdated: Date;
}

// 存储上次价格数据
const priceHistory: Record<string, PriceData> = {};

class PriceService {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * 获取加密货币实时价格
   */
  async fetchRealPrices(): Promise<PriceData[]> {
    try {
      const assets = await Asset.findAll();
      const coinIds = assets
        .map(asset => COIN_ID_MAP[asset.symbol])
        .filter(Boolean)
        .join(',');

      if (!coinIds) {
        logger.warn('没有找到支持的加密货币ID');
        return [];
      }

      logger.info(`获取价格数据: ${coinIds}`);

      const response = await axios.get(`${COINGECKO_API_BASE}/simple/price`, {
        params: {
          ids: coinIds,
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_last_updated_at: true
        },
        timeout: 10000
      });

      const priceData: PriceData[] = [];

      for (const asset of assets) {
        const coinId = COIN_ID_MAP[asset.symbol];
        if (!coinId || !response.data[coinId]) {
          logger.warn(`未找到 ${asset.symbol} 的价格数据`);
          continue;
        }

        const data = response.data[coinId];
        priceData.push({
          symbol: asset.symbol,
          currentPrice: data.usd || 0,
          priceChange24h: data.usd_24h_change || 0,
          priceChangePercentage24h: data.usd_24h_change || 0,
          lastUpdated: new Date(data.last_updated_at * 1000 || Date.now())
        });
      }

      logger.info(`成功获取 ${priceData.length} 个币种的价格数据`);
      return priceData;

    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.error('CoinGecko API 请求频率限制');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        logger.error('网络连接失败，无法获取价格数据');
      } else {
        logger.error('获取价格数据失败:', error.message);
      }
      throw new Error(`价格数据获取失败: ${error.message}`);
    }
  }

  /**
   * 分析价格变化并生成信号
   */
  async analyzePriceChanges(priceData: PriceData[]): Promise<void> {
    for (const data of priceData) {
      const previousData = priceHistory[data.symbol];
      
      // 如果没有历史数据，保存当前数据并跳过
      if (!previousData) {
        priceHistory[data.symbol] = data;
        continue;
      }

      // 计算价格变化百分比
      const priceChangePercent = Math.abs(data.priceChangePercentage24h);
      
      // 只有当价格变化超过阈值时才生成信号
      if (priceChangePercent >= PRICE_CHANGE_THRESHOLD) {
        await this.createPriceSignal(data, previousData);
      }

      // 更新历史数据
      priceHistory[data.symbol] = data;
    }
  }

  /**
   * 创建价格信号
   */
  private async createPriceSignal(currentData: PriceData, previousData: PriceData): Promise<void> {
    try {
      // 获取资产信息
      const asset = await Asset.findOne({ where: { symbol: currentData.symbol } });
      if (!asset) {
        logger.warn(`未找到资产: ${currentData.symbol}`);
        return;
      }

      const changePercent = currentData.priceChangePercentage24h;
      const isPositive = changePercent > 0;
      
      // 生成信号描述
      const description = isPositive 
        ? `${asset.name} 价格在24小时内上涨 ${changePercent.toFixed(2)}%，当前价格 $${currentData.currentPrice.toLocaleString()}`
        : `${asset.name} 价格在24小时内下跌 ${Math.abs(changePercent).toFixed(2)}%，当前价格 $${currentData.currentPrice.toLocaleString()}`;

      // 计算信号强度（基于价格变化幅度）
      const strength = calculateStrength(Math.abs(changePercent), 'price');

      // 创建信号
      const signal = await Signal.create({
        assetId: asset.id,
        assetSymbol: asset.symbol,
        assetName: asset.name,
        assetLogo: asset.logo,
        type: 'price',
        strength,
        description,
        sources: [{
          platform: 'price',
          priceChange: changePercent,
          currentPrice: currentData.currentPrice,
          previousPrice: previousData.currentPrice,
          timeframe: '24h'
        }],
        timestamp: new Date()
      });

      logger.info(`生成价格信号: ${asset.symbol} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%, 强度: ${strength})`);

      // 发送通知
      await notificationService.processSignal(signal);

    } catch (error) {
      logger.error(`创建价格信号失败:`, error);
    }
  }

  /**
   * 启动价格监控
   */
  startPriceMonitoring(): void {
    if (this.intervalId) {
      logger.warn('价格监控已在运行');
      return;
    }

    logger.info('启动实时价格监控服务');

    // 立即执行一次
    this.monitorPrices();

    // 设置定时监控
    this.intervalId = setInterval(() => {
      this.monitorPrices();
    }, PRICE_UPDATE_INTERVAL);
  }

  /**
   * 停止价格监控
   */
  stopPriceMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('价格监控已停止');
    }
  }

  /**
   * 执行价格监控
   */
  private async monitorPrices(): Promise<void> {
    try {
      logger.info('开始价格监控检查...');
      const priceData = await this.fetchRealPrices();
      
      if (priceData.length > 0) {
        await this.analyzePriceChanges(priceData);
        logger.info(`价格监控完成，处理了 ${priceData.length} 个币种`);
      } else {
        logger.warn('未获取到任何价格数据');
      }
    } catch (error) {
      logger.error('价格监控过程中发生错误:', error);
    }
  }

  /**
   * 获取当前价格历史数据
   */
  getPriceHistory(): Record<string, PriceData> {
    return { ...priceHistory };
  }

  /**
   * 手动触发价格检查（用于测试）
   */
  async triggerPriceCheck(): Promise<void> {
    await this.monitorPrices();
  }
}

// 导出单例
const priceService = new PriceService();

/**
 * 初始化价格监控服务
 */
export const initializePriceMonitor = () => {
  logger.info('初始化实时价格监控服务');
  priceService.startPriceMonitoring();
};

export default priceService; 