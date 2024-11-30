import { Router } from 'express';
import { AuthController } from './AuthController';
import { AccountService } from '../services/account-service';
import { PrismaAccountRepository } from '../../domain/repository/PrismaAccountRepository';
import { EmailService } from '../services/email-service';
import { envs } from '../../config';
import { PrismaPasswordResetRepository } from '../../domain/repository/PrismaPasswordResetRepository';

export class AuthRoutes {
  static get routes(): Router {
    const router = Router();
    const prismaAccountRepository = new PrismaAccountRepository();
    const prismaPasswordResetRepository = new PrismaPasswordResetRepository();
    const emailService = new EmailService(
      envs.MAILER_SERVICE,
      envs.MAILER_EMAIL,
      envs.MAILER_SECRET_KEY,
      envs.SEND_EMAIL,
    );

    const accountService = new AccountService(
      prismaAccountRepository, 
      prismaPasswordResetRepository, 
      emailService);

    const authController = new AuthController(accountService);
    router.post('/register', authController.registerUser);
    router.post('/login', authController.loginUser);
    router.get('/validate-email/:token', authController.validateEmail);
    router.post('/send-reset-password', authController.sendEmailResetPassword);
    router.post('/reset-password/:token', authController.resetPassword);
    router.get('/validate-token/:token', authController.validateToken);
    router.post('/validate-code/:token', authController.validateVerificationCode);
    return router;
  }
}