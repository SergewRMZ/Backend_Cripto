import { PrismaClient } from "@prisma/client";
import { PasswordResetCode } from "@prisma/client";
import { PasswordResetRepository } from "./PasswordResetRepository";


export class PrismaPasswordResetRepository implements PasswordResetRepository {
  private prisma = new PrismaClient();

  async getCode(id:number):Promise<PasswordResetCode | null> {
    return this.prisma.passwordResetCode.findFirst({
      where: {
        userId: id,
        expires_at: {
          gt: new Date()
        },
        used:false
      },

      orderBy: {
        expires_at: 'desc'
      }
    });
  }

  async saveVerificationCode(
    code: string,
    userId: number,
    expires_at: Date
  ): Promise<void> {
    try {
      await this.prisma.passwordResetCode.create({
        data: {
          code,
          expires_at,
          userId,
        }
      });
    } catch (error) {
      throw new Error('No se pudo guardar el código de verificación');
    }
  }

}