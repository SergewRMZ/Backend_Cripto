import { PasswordResetCode } from '@prisma/client';
export abstract class PasswordResetRepository {
  abstract saveVerificationCode(code: string, userId: number, expires_at: Date):Promise<void>;
  abstract getCode(id:number):Promise<PasswordResetCode | null>;
}