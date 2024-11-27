import { bcrypAdapter, envs, JwtAdapter, regularExps } from '../../config';
import { CustomError } from '../../domain';
import { AccountLoginDto } from '../../domain/dtos/auth/AccountLoginDto';
import { AccountRegisterDto } from '../../domain/dtos/auth/AccountRegisterDto';
import { AccountEntity } from '../../domain/entities/AccountEntity';
import { PrismaAccountRepository } from '../../domain/repository/PrismaAccountRepository';
import { EmailService } from './email-service';

export class AccountService {
  constructor(
    private readonly prismaAccountRepository: PrismaAccountRepository,
    private readonly emailService: EmailService
  ) {}

  public async registerUser(accountRegisterDto: AccountRegisterDto) {
    const existAccount = await this.prismaAccountRepository.findByEmail(accountRegisterDto.email);
    if(existAccount) throw CustomError.badRequest('El correo ya está registrado');

    try {
      accountRegisterDto.password = bcrypAdapter.hash(accountRegisterDto.password);
      const account = await this.prismaAccountRepository.create(accountRegisterDto);

      if(account == null) throw CustomError.internalServer('Internal Server Error');

      // Envíar correo de verificación.
      await this.sendEmailValidationLink(account.email);
      const { password, ...rest } = AccountEntity.fromObject(account);

      const token = await JwtAdapter.generateToken({ id: account.id });
      if(!token) throw CustomError.internalServer('Error while creating JWT');
      return {
        account: rest,
        token: token
      };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }

  public async loginUser (accountLoginDto: AccountLoginDto) {
    try {
      const existAccount = await this.prismaAccountRepository.findByEmail(accountLoginDto.email);
      if(!existAccount) throw CustomError.badRequest('El correo no existe');
      const isMatch = bcrypAdapter.compare(accountLoginDto.password, existAccount.password);
      if(!isMatch) throw CustomError.badRequest('La contraseña es incorrecta');
      const { password, ...user } = AccountEntity.fromObject(existAccount);

      const token = await JwtAdapter.generateToken({ id: existAccount.id, email: existAccount.email });
      if(!token) throw CustomError.internalServer('Error while creating JWT');
      return {
        account: user,
        token: token
      };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }

  private sendEmailValidationLink = async (email: string) => {
    const token = await JwtAdapter.generateToken({ email });
    if(!token) throw CustomError.internalServer('Error getting token');
    const link = `${envs.WERSERVICE_URL}/auth/validate-email/${token}`;
    const html = `
      <h1>Verifica tu correo electrónico</h1>
      <p>Da click en el siguiente enlace para verificar tu correo electrónico</p>
      <a href="${link}">Valida tu correo</a>
    `;

    const options = {
      to: email,
      subject: 'Validate your email',
      htmlBody: html
    };

    const isSent = await this.emailService.sendEmail(options);
    if(!isSent) throw CustomError.internalServer('Error sending email');
    return true;
  }

  public validateEmail = async (token:string) => {
    const payload = await JwtAdapter.validateToken(token);
    if (!payload) throw CustomError.unauthorized('Invalid Token');
    
    const { email } = payload as { email: string };
    if (!email) throw CustomError.internalServer('Email not in token');

    const user = await this.prismaAccountRepository.findByEmail(email);
    if (!user) throw CustomError.internalServer('User not exists');
    await this.prismaAccountRepository.updateEmailValidate(email, { email_validated: true });    
    return true;
  } 
}