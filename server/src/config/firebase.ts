import * as admin from 'firebase-admin';
import logger from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = () => {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccount) {
      logger.warn('Firebase service account key not found. Push notifications will be disabled.');
      return null;
    }

    const serviceAccountKey = JSON.parse(serviceAccount);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
      projectId: serviceAccountKey.project_id,
    });

    logger.info('Firebase initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
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