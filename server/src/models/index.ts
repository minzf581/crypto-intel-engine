import { User } from './User';
import { Asset } from './Asset';
import { Signal, initializeAssociations as initSignalAssociations } from './Signal';
import { Notification, initializeAssociations as initNotificationAssociations } from './Notification';
import { AlertSetting, initializeAssociations as initAlertSettingAssociations } from './AlertSetting';

// 初始化所有模型关联
const initializeAssociations = () => {
  // 用户-资产 多对多关系 - 使用不同的关联名避免与selectedAssets属性冲突
  User.belongsToMany(Asset, { through: 'user_assets', as: 'watchedAssets' });
  Asset.belongsToMany(User, { through: 'user_assets', as: 'watchers' });
  
  // 初始化信号模型的关联
  initSignalAssociations();

  // 初始化通知模型的关联
  initNotificationAssociations();

  // 初始化警报设置模型的关联
  initAlertSettingAssociations();
};

export { 
  User, 
  Asset, 
  Signal,
  Notification,
  AlertSetting,
  initializeAssociations 
}; 