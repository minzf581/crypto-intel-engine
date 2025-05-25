import * as admin from 'firebase-admin';
import logger from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = () => {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccount) {
      logger.warn('Firebase service account key not found. Push notifications will be disabled.');
      logger.info('To enable push notifications, set FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
      return null;
    }

    // Validate JSON format
    let serviceAccountKey;
    try {
      serviceAccountKey = JSON.parse(serviceAccount);
    } catch (parseError) {
      logger.error('Invalid Firebase service account key format. Must be valid JSON.');
      return null;
    }

    // Validate required fields
    if (!serviceAccountKey.project_id || !serviceAccountKey.private_key || !serviceAccountKey.client_email) {
      logger.error('Firebase service account key missing required fields (project_id, private_key, client_email)');
      return null;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
      projectId: serviceAccountKey.project_id,
    });

    logger.info('Firebase initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    logger.warn('Push notifications will be disabled');
    return null;
  }
};

export const getFirebaseApp = (): admin.app.App | null => {
  return firebaseApp;
};

export const getMessaging = (): admin.messaging.Messaging | null => {
  if (!firebaseApp) {
    return null;
  }
  return admin.messaging(firebaseApp);
}; 