import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Initialize Firebase Admin SDK
    const projectId = this.configService.get('FIREBASE_PROJECT_ID');
    const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');

    if (projectId && privateKey && clientEmail) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });
        console.log('✅ Firebase Admin initialized');
      } catch (error) {
        console.warn('⚠️ Firebase Admin initialization skipped:', error.message);
      }
    } else {
      console.warn('⚠️ Firebase credentials not configured - push notifications disabled');
    }
  }

  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    try {
      if (!admin.apps.length) {
        console.warn('Firebase Admin not initialized');
        return false;
      }

      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: fcmToken,
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
      return true;
    } catch (error) {
      console.error('Error sending FCM message:', error);
      return false;
    }
  }
}
