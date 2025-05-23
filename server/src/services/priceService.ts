import axios from 'axios';
import { Asset, Signal } from '../models';
import logger from '../utils/logger';
import { sendSignalToSubscribers } from './socket';
import { Server as SocketIOServer } from 'socket.io';
import { calculateSignalStrength } from '../utils/signalUtils';

// 存储每个资产的最近价格历史，用于计算价格变化
const priceHistory: Record<string, { price: number, timestamp: number }[]> = {};

// 价格数据的最大历史长度
const MAX_PRICE_HISTORY = 24; // 保存最近24个价格点

/**
 * 从CoinGecko API获取价格数据
 * @param assetSymbols 要获取价格的资产符号数组
 * @returns 价格数据对象
 */
async function fetchPriceData(assetSymbols: string[]) {
  try {
    // 将资产符号转换为小写(CoinGecko API要求)
    const symbols = assetSymbols.map(symbol => symbol.toLowerCase());
    
    // 构建API请求URL
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbols.join(',')}&vs_currencies=usd&include_24hr_change=true`;
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    logger.error('获取价格数据失败:', error);
    return {};
  }
}

/**
 * 更新资产的价格历史
 * @param assetSymbol 资产符号
 * @param price 当前价格
 */
function updatePriceHistory(assetSymbol: string, price: number) {
  const now = Date.now();
  
  // 如果这个资产还没有历史记录，创建一个
  if (!priceHistory[assetSymbol]) {
    priceHistory[assetSymbol] = [];
  }
  
  // 添加新的价格点
  priceHistory[assetSymbol].push({ price, timestamp: now });
  
  // 保持历史记录在最大长度以内
  if (priceHistory[assetSymbol].length > MAX_PRICE_HISTORY) {
    priceHistory[assetSymbol].shift();
  }
}

/**
 * 计算价格变化百分比
 * @param assetSymbol 资产符号
 * @param currentPrice 当前价格
 * @returns 价格变化百分比
 */
function calculatePriceChange(assetSymbol: string, currentPrice: number): { change: number, prevPrice: number } {
  const history = priceHistory[assetSymbol];
  
  // 如果没有足够的历史数据，返回0
  if (!history || history.length < 2) {
    return { change: 0, prevPrice: currentPrice };
  }
  
  // 获取最旧的价格点进行比较
  const oldestPrice = history[0].price;
  
  // 计算变化百分比
  const change = ((currentPrice - oldestPrice) / oldestPrice) * 100;
  
  return { change, prevPrice: oldestPrice };
}

/**
 * 根据价格变化生成信号
 * @param asset 资产对象
 * @param currentPrice 当前价格
 * @param priceChange 价格变化百分比
 * @param previousPrice 之前的价格
 * @returns 生成的信号
 */
async function generatePriceSignal(asset: any, currentPrice: number, priceChange: number, previousPrice: number) {
  // 决定信号强度 (价格变化的绝对值)
  const absPriceChange = Math.abs(priceChange);
  
  // 计算信号强度 (将价格变化映射到0-100的范围)
  // 价格变化10%以上认为是强烈信号(强度85+)
  // 价格变化5-10%是中等信号(强度70-85)
  // 价格变化1-5%是轻微信号(强度50-70)
  // 价格变化<1%不生成信号
  let strength = 0;
  if (absPriceChange >= 10) {
    strength = Math.min(100, 85 + (absPriceChange - 10) / 2);
  } else if (absPriceChange >= 5) {
    strength = 70 + (absPriceChange - 5) * 3;
  } else if (absPriceChange >= 1) {
    strength = 50 + (absPriceChange - 1) * 5;
  } else {
    // 价格变化太小，不生成信号
    return null;
  }
  
  // 四舍五入强度值
  strength = Math.round(strength);
  
  // 根据价格变化方向生成描述
  let description = '';
  if (priceChange > 0) {
    description = `${asset.symbol}价格显著上涨${absPriceChange.toFixed(2)}%，从$${previousPrice.toFixed(2)}涨至$${currentPrice.toFixed(2)}`;
  } else {
    description = `${asset.symbol}价格显著下跌${absPriceChange.toFixed(2)}%，从$${previousPrice.toFixed(2)}跌至$${currentPrice.toFixed(2)}`;
  }
  
  // 创建新的信号
  const signal = await Signal.create({
    assetId: asset.id,
    assetSymbol: asset.symbol,
    assetName: asset.name,
    assetLogo: asset.logo,
    type: 'price',
    strength,
    description,
    sources: [
      {
        platform: 'price',
        priceChange: priceChange,
        currentPrice: currentPrice,
        previousPrice: previousPrice,
        timeframe: `${Math.floor(MAX_PRICE_HISTORY / 6)}h`, // 时间范围约等于历史记录长度/6小时
      }
    ],
    timestamp: new Date()
  });
  
  return signal;
}

/**
 * 启动价格数据监控服务
 * @param io Socket.IO服务器实例
 */
export const initializePriceMonitor = async (io: SocketIOServer) => {
  logger.info('初始化价格监控服务');
  
  // 每5分钟运行一次
  setInterval(async () => {
    try {
      // 获取所有资产
      const assets = await Asset.findAll();
      
      if (assets.length === 0) {
        return;
      }
      
      // 获取所有资产的符号
      const assetSymbols = assets.map(asset => asset.symbol);
      
      // 获取价格数据
      const priceData = await fetchPriceData(assetSymbols);
      
      // 处理每个资产的价格数据
      for (const asset of assets) {
        try {
          // 获取资产在CoinGecko中的ID (假设是小写的符号)
          const coinId = asset.symbol.toLowerCase();
          
          // 检查是否有该资产的价格数据
          if (priceData[coinId]) {
            const currentPrice = priceData[coinId].usd;
            
            // 更新价格历史
            updatePriceHistory(asset.symbol, currentPrice);
            
            // 计算价格变化
            const { change, prevPrice } = calculatePriceChange(asset.symbol, currentPrice);
            
            // 如果价格变化显著，生成信号
            if (Math.abs(change) >= 1) {
              const signal = await generatePriceSignal(asset, currentPrice, change, prevPrice);
              
              // 如果生成了信号，发送给订阅者
              if (signal) {
                logger.info(`为${asset.symbol}生成价格信号: 变化${change.toFixed(2)}%, 强度${signal.strength}`);
                sendSignalToSubscribers(io, asset.symbol, signal.toJSON());
              }
            }
          }
        } catch (assetError) {
          logger.error(`处理资产${asset.symbol}的价格数据时出错:`, assetError);
        }
      }
    } catch (error) {
      logger.error('价格监控服务错误:', error);
    }
  }, 5 * 60 * 1000); // 5分钟
};

export default {
  initializePriceMonitor,
  fetchPriceData
}; 