import { User } from './User';
import { Asset } from './Asset';
import { Signal, initializeAssociations as initSignalAssociations } from './Signal';
import { Notification, initializeAssociations as initNotificationAssociations } from './Notification';
import { AlertSetting, initializeAssociations as initAlertSettingAssociations } from './AlertSetting';
import { TwitterAccount, initializeAssociations as initTwitterAccountAssociations } from './TwitterAccount';
import { TwitterPost, initializeAssociations as initTwitterPostAssociations } from './TwitterPost';
import { AccountCoinRelevance, initializeAssociations as initAccountCoinRelevanceAssociations } from './AccountCoinRelevance';
import { RecommendedAccount, initializeAssociations as initRecommendedAccountAssociations } from './RecommendedAccount';
import { VolumeAnalysis } from './VolumeAnalysis';
import { NewsData } from './NewsData';
import { NotificationHistory } from './NotificationHistory';
import { NotificationSettings } from './NotificationSettings';

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

  // Initialize social sentiment model associations
  initTwitterAccountAssociations();
  initTwitterPostAssociations();
  initAccountCoinRelevanceAssociations();
  initRecommendedAccountAssociations();
};

export { 
  User, 
  Asset, 
  Signal,
  Notification,
  AlertSetting,
  TwitterAccount,
  TwitterPost,
  AccountCoinRelevance,
  RecommendedAccount,
  VolumeAnalysis,
  NewsData,
  NotificationHistory,
  NotificationSettings,
  initializeAssociations 
}; 