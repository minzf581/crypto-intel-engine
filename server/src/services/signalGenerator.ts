import { Server as SocketIOServer } from 'socket.io';
import { Asset, Signal } from '../models';
import { sendSignalToSubscribers } from './socket';
import logger from '../utils/logger';
import env from '../config/env';

// 信号类型
const SIGNAL_TYPES = ['sentiment', 'narrative'];

// 社交媒体平台
const PLATFORMS = ['twitter', 'reddit'];

// 信号描述模板
const SENTIMENT_DESCRIPTIONS = [
  '多头情绪显著增加，可能表明市场看涨',
  '社区情绪变得负面，谨慎持仓',
  '市场情绪中性但逐渐趋向乐观',
  '突然出现大量负面评论，可能有抛售压力',
  '社交媒体上看涨讨论量创新高',
];

const NARRATIVE_DESCRIPTIONS = [
  '新的技术升级激发社区热烈讨论',
  '关于潜在合作的传闻正在广泛传播',
  '监管担忧导致社区不安',
  '知名投资者表态支持推动积极叙事',
  '核心开发团队宣布新路线图，社区反应积极',
];

/**
 * 随机生成信号数据
 * @param asset 资产数据
 * @returns 生成的信号对象
 */
const generateRandomSignal = async (asset: any) => {
  // 随机选择信号类型
  const type = SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)] as 'sentiment' | 'narrative';
  
  // 随机生成信号强度 (20-95)
  const strength = Math.floor(Math.random() * 76) + 20;
  
  // 根据类型选择描述
  const descriptions = type === 'sentiment' ? SENTIMENT_DESCRIPTIONS : NARRATIVE_DESCRIPTIONS;
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  // 生成随机来源数据
  const sourcesCount = Math.floor(Math.random() * 2) + 1; // 1-2个来源
  const sources = [];
  
  for (let i = 0; i < sourcesCount; i++) {
    const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)] as 'twitter' | 'reddit';
    const count = Math.floor(Math.random() * 500) + 50; // 50-549个提及
    
    sources.push({ platform, count });
  }
  
  // 创建新的信号
  const signal = await Signal.create({
    assetId: asset.id,
    assetSymbol: asset.symbol,
    assetName: asset.name,
    assetLogo: asset.logo,
    type,
    strength,
    description,
    sources,
    timestamp: new Date()
  });
  
  return signal;
};

/**
 * 初始化信号生成器服务
 * @param io Socket.IO服务器实例
 */
export const initializeSignalGenerator = (io: SocketIOServer) => {
  // 仅在开发环境或启用了模拟信号时生成模拟信号
  if (env.nodeEnv === 'production' && !env.enableMockSignals) {
    logger.info('模拟信号生成器在生产环境中已禁用');
    return;
  }
  
  logger.info('初始化模拟信号生成器');
  
  // 每隔一段时间生成随机信号
  setInterval(async () => {
    try {
      // 获取所有资产
      const assets = await Asset.findAll();
      
      if (assets.length === 0) {
        return;
      }
      
      // 随机选择一个资产
      const asset = assets[Math.floor(Math.random() * assets.length)];
      
      // 生成随机信号
      const signal = await generateRandomSignal(asset);
      
      logger.info(`为 ${asset.symbol} 生成信号: ${signal.type} (强度: ${signal.strength})`);
      
      // 通过WebSocket发送信号给订阅者
      sendSignalToSubscribers(io, asset.symbol, signal.toJSON());
    } catch (error) {
      logger.error('生成模拟信号时出错:', error);
    }
  }, 30000); // 每30秒生成一个信号
}; 