import { bcrypAdapter, envs, JwtAdapter, regularExps } from '../../config';
import { CustomError } from '../../domain';
import { AccountLoginDto } from '../../domain/dtos/auth/AccountLoginDto';
import { AccountRegisterDto } from '../../domain/dtos/auth/AccountRegisterDto';
import { AccountEntity } from '../../domain/entities/AccountEntity';
import { PrismaAccountRepository } from '../../domain/repository/PrismaAccountRepository';
import { PrismaPasswordResetRepository } from '../../domain/repository/PrismaPasswordResetRepository';
import { EmailService } from './email-service';

export class AccountService {
  constructor(
    private readonly prismaAccountRepository: PrismaAccountRepository,
    private readonly prismaPasswordResetRepository: PrismaPasswordResetRepository,
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

      const token = await JwtAdapter.generateToken({ id: account.id, email: account.email });
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

  /**
   * Servicio para poder enviar un correo para reestablecer contraseña generando un token
   * con base en el hash del correo electrónico de un usuario. La ruta debe ser protegida en
   * el frontend, evitando que se acceda a ella hasta no autenticar que el token contiene en el payload
   * el hash del correo del usuario.
   * @param email 
   * @returns 
   */
  public sendResetPasswordLink = async (email: string) => {
    const user = await this.prismaAccountRepository.findByEmail(email);
    if(!user) throw CustomError.badRequest('El correo no está registrado');

    // Generar código de verificación.
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    if(!code) throw CustomError.internalServer('Error al generar el código');

    // Generar Token con el email.
    const token = await JwtAdapter.generateToken({ email: user.email }, '15m');
    if(!token) throw CustomError.internalServer('Error al generar el token');

    
    const resetLink = `http://localhost:5173/new-pass/${token}`;

    // Almacenar el registro en la base de datos.
    this.prismaPasswordResetRepository.saveVerificationCode(
      bcrypAdapter.hash(code),
      user.id,
      new Date(Date.now() + 15 * 60 * 1000) 
    )

    const html = `
      <h1>Solicitud de restablecimiento de contraseña</h1>
      <p>Haz click en el siguiente enlace para restablecer tu contraseña. Este enlace es válido solo por 5 minutos</p>
      <a href="${resetLink}">Reestablecer Contraseña</a>
      <h2>Código de verificación ${code}</h2>
    `;

    const options = {
      to: email,
      subject: 'Reestablece tu contraseña',
      htmlBody: html
    };

    const isSent = await this.emailService.sendEmail(options);
    if(!isSent) throw CustomError.internalServer('Error enviando el correo');
    return true;
  }

  /**
   * Servicio para reestablecer la contraseña.
   * @param token Token de autenticación del usuario.
   * @param newPassword Nueva contraseña.
   * @returns 
   */
  public resetPassword = async (token: string, newPassword: string) => {
    console.log(token, newPassword);
    const payload = await JwtAdapter.validateToken(token);
    if(!payload) throw CustomError.unauthorized('Token invalido o expirado');

    // Validar nueva contraseña
    if(!regularExps.password.test(newPassword)) throw CustomError.badRequest('La contraseña debe contener mayúsculas, minúsculas, números y por lo menos un caracter especial');
    const { email } = payload as { email: string };
    if(!email) throw CustomError.internalServer('El correo no ha sido encontrado o el token ha sido alterado');

    const user = await this.prismaAccountRepository.findByEmail(email);
    if(!user) throw CustomError.badRequest('El usuario no existe');

    const hashedNewPassword = bcrypAdapter.hash(newPassword);
    await this.prismaAccountRepository.updatePassword(user.id, hashedNewPassword);

    return true;
  }

  /**
   * Servicio para enviar un correo con un link de verificación de correo electrónico.
   * @param email 
   * @returns 
   */
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
    if(!isSent) throw CustomError.internalServer('Error enviando el correo');
    return true;
  }

  public async verifyResetCode(token:string, code:string) {
    const payload = await JwtAdapter.validateToken(token);
    if(!payload) throw CustomError.unauthorized('El token es inválido o ha expirado');
    const { email } = payload as { email: string }
    if (!email) throw CustomError.internalServer('Email not in token');

    const user = await this.prismaAccountRepository.findByEmail(email);    
    if(!user) throw CustomError.badRequest('El usuario no existe');
    const passwordReset = await this.prismaPasswordResetRepository.getCode(user.id);
    if(!passwordReset) throw CustomError.badRequest('El código de verificación no se ha encontrado o ha caducado');
    const isMatch = bcrypAdapter.compare(code, passwordReset.code);
    if(!isMatch) throw CustomError.badRequest('Código de verificación incorrecto');

    return true;
  }

  /**
   * Servicio para validar el correo electrónico de los usuarios.
   * @param token Token de autenticación del usuario.
   * @returns 
   */
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

  /**
   * Servicio para validar un token de autenticación en el frontend.
   * @param token 
   * @returns 
   */
  public validateToken = async (token: string) => {
    const payload = await JwtAdapter.validateToken(token);
    if(!payload) throw CustomError.unauthorized('Token invalido o expirado');

    const { email } = payload as {email: string};
    if(!email) throw CustomError.internalServer('Email no in token');

    const user = await this.prismaAccountRepository.findByEmail(email);
    if (!user) throw CustomError.internalServer('User not exists');
    return true;
  }

  
}
