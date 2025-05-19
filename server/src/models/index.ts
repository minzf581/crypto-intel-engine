import User from './User';
import Asset from './Asset';
import Signal, { initializeAssociations } from './Signal';

// 初始化模型关联
initializeAssociations();

export {
  User,
  Asset,
  Signal
}; 