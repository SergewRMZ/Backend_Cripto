import { PrismaClient } from '@prisma/client';
import { User } from '@prisma/client';
import { AccountRepository } from './AccountRepository';
import { AccountRegisterDto } from '../dtos/auth/AccountRegisterDto';
import { AccountLoginDto } from '../dtos/auth/AccountLoginDto';

export class PrismaAccountRepository implements AccountRepository {
  private prisma = new PrismaClient();

  async findByEmail(email: string):Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user;
  }

  async create(accountRegisterDto: AccountRegisterDto):Promise<User | null> {
    const createAccount = await this.prisma.user.create({
      data: {
        name: accountRegisterDto.name,
        lastname: accountRegisterDto.lastname,
        email: accountRegisterDto.email,
        password: accountRegisterDto.password,
        created_at: new Date(accountRegisterDto.created_at)
      },
    });
    return createAccount;
  }

  async updateEmailValidate(email: string, updateData: Partial<User>): Promise<User | null> {
    try {
      const updatedAccount = await this.prisma.user.update({
        where: { email },
        data: updateData,
      });
      return updatedAccount;
    } catch (error) {
      console.error('Error updating account:', error);
      return null;
    }
  }
}