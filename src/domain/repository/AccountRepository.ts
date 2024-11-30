import { User } from '@prisma/client';
import { AccountRegisterDto } from '../dtos/auth/AccountRegisterDto';

export abstract class AccountRepository {
  abstract findByEmail(email: string): Promise<User | null>;
  abstract create(accountRegisterDto: AccountRegisterDto): Promise<User | null>;
  abstract updateEmailValidate(email: string, updateData: Partial<User>): Promise<User | null>;
  abstract updatePassword(userId: number, newPassword: string): Promise<void>;
}