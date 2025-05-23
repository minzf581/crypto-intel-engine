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