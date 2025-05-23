/**
 * 计算信号强度
 * @param value 需要映射到强度值的数值
 * @param min 最小阈值
 * @param max 最大阈值
 * @param minStrength 最小强度
 * @param maxStrength 最大强度
 * @returns 强度值
 */
export const calculateSignalStrength = (
  value: number,
  min: number,
  max: number,
  minStrength: number = 0,
  maxStrength: number = 100
): number => {
  // 确保值在范围内
  const boundedValue = Math.max(min, Math.min(max, value));
  
  // 映射到强度值
  const normalizedValue = (boundedValue - min) / (max - min);
  const strength = minStrength + normalizedValue * (maxStrength - minStrength);
  
  // 四舍五入到整数
  return Math.round(strength);
};

/**
 * 根据信号类型和数值计算信号强度
 * @param value 数值
 * @param type 信号类型
 * @returns 强度值(0-100)
 */
export const calculateStrength = (value: number, type: 'price' | 'sentiment' | 'narrative'): number => {
  switch (type) {
    case 'price':
      // 价格变化百分比映射到强度
      // 0-5% -> 20-50, 5-15% -> 50-80, >15% -> 80-100
      if (value <= 5) {
        return calculateSignalStrength(value, 0, 5, 20, 50);
      } else if (value <= 15) {
        return calculateSignalStrength(value, 5, 15, 50, 80);
      } else {
        return Math.min(100, 80 + (value - 15) / 2);
      }
    
    case 'sentiment':
      // 情感分数映射到强度 (0-100)
      return Math.max(10, Math.min(100, value));
    
    case 'narrative':
      // 叙事强度映射
      return Math.max(20, Math.min(100, value));
    
    default:
      return 50; // 默认中等强度
  }
};

/**
 * 确定信号强度级别描述
 * @param strength 信号强度值(0-100)
 * @returns 信号级别描述
 */
export const getSignalStrengthLevel = (strength: number): string => {
  if (strength >= 85) return '非常强';
  if (strength >= 70) return '强';
  if (strength >= 50) return '中等';
  if (strength >= 30) return '弱';
  return '非常弱';
};

/**
 * 检查信号是否为显著的情绪变化
 * @param oldStrength 之前的强度值
 * @param newStrength 新的强度值
 * @param threshold 变化阈值(默认20)
 * @returns 是否为显著变化
 */
export const isSignificantStrengthShift = (
  oldStrength: number,
  newStrength: number,
  threshold: number = 20
): boolean => {
  return Math.abs(newStrength - oldStrength) >= threshold;
}; 