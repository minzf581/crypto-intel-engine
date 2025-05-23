import { User } from './User';
import { Asset } from './Asset';
import { Signal, initializeAssociations as initSignalAssociations } from './Signal';
import { Notification, initializeAssociations as initNotificationAssociations } from './Notification';
import { AlertSetting, initializeAssociations as initAlertSettingAssociations } from './AlertSetting';

// Initialize all model associations
const initializeAssociations = () => {
  // Remove the many-to-many association that was causing naming collision
  // User will maintain selectedAssets as a JSON field instead
  
  // Initialize signal model associations
  initSignalAssociations();

  // Initialize notification model associations
  initNotificationAssociations();

  // Initialize alert setting model associations
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