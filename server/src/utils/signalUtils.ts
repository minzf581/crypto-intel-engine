/**
 * Signal utility functions
 * 
 * This module provides utility functions for:
 * 1. Calculating signal strength
 * 2. Formatting signal data
 * 3. Validating signal types
 */

/**
 * Calculate signal strength based on value and type
 * @param value Signal value (percentage, sentiment score, etc.)
 * @param type Signal type
 * @returns Strength value (0-100)
 */
export const calculateStrength = (value: number, type: 'price' | 'sentiment' | 'narrative' | 'technical' | 'onchain'): number => {
  let strength = 0;
  
  switch (type) {
    case 'price':
      // Map price change percentage to strength
      if (value >= 20) strength = 100;
      else if (value >= 15) strength = 90;
      else if (value >= 10) strength = 80;
      else if (value >= 7) strength = 70;
      else if (value >= 5) strength = 60;
      else if (value >= 3) strength = 50;
      else if (value >= 2) strength = 40;
      else if (value >= 1) strength = 30;
      else if (value >= 0.5) strength = 20;
      else strength = 10;
      break;
      
    case 'sentiment':
      // Map sentiment score (-1 to 1) to strength (0-100)
      strength = Math.round(Math.abs(value) * 100);
      break;
      
    case 'narrative':
      // Narrative strength usually preset
      strength = Math.min(100, Math.max(0, value));
      break;
      
    case 'technical':
      // Technical analysis strength
      strength = Math.min(100, Math.max(0, value));
      break;
      
    case 'onchain':
      // On-chain analysis strength
      strength = Math.min(100, Math.max(0, value));
      break;
  }
  
  return Math.round(strength);
};

/**
 * Calculate signal strength using linear mapping
 * @param value Value to map to strength
 * @param min Minimum threshold
 * @param max Maximum threshold
 * @param minStrength Minimum strength value
 * @param maxStrength Maximum strength value
 * @returns Strength value
 */
export const calculateSignalStrength = (
  value: number,
  min: number,
  max: number,
  minStrength: number = 0,
  maxStrength: number = 100
): number => {
  // Ensure value is within bounds
  const boundedValue = Math.max(min, Math.min(max, value));
  
  // Map to strength value
  const normalizedValue = (boundedValue - min) / (max - min);
  const strength = minStrength + normalizedValue * (maxStrength - minStrength);
  
  // Round to integer
  return Math.round(strength);
};

/**
 * Get signal strength level description
 * @param strength Signal strength value (0-100)
 * @returns Signal level description
 */
export const getSignalStrengthLevel = (strength: number): string => {
  if (strength >= 85) return 'Very Strong';
  if (strength >= 70) return 'Strong';
  if (strength >= 50) return 'Medium';
  if (strength >= 30) return 'Weak';
  return 'Very Weak';
};

/**
 * Check if signal represents a significant strength change
 * @param oldStrength Previous strength value
 * @param newStrength New strength value
 * @param threshold Change threshold (default 20)
 * @returns Whether this is a significant change
 */
export const isSignificantStrengthShift = (
  oldStrength: number,
  newStrength: number,
  threshold: number = 20
): boolean => {
  return Math.abs(newStrength - oldStrength) >= threshold;
}; 