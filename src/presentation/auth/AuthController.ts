import { Request, Response } from 'express';
import { CustomError } from '../../domain';
import { AccountRegisterDto } from '../../domain/dtos/auth/AccountRegisterDto';
import { AccountService } from '../services/account-service';
import { AccountLoginDto } from '../../domain/dtos/auth/AccountLoginDto';
import { error } from 'console';

export class AuthController {
  constructor(private readonly accountService: AccountService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal serve error' });
  } 

  public registerUser = (req: Request, res: Response) => {
    const [error, accountRegisterDto] = AccountRegisterDto.create(req.body);
    if (error) return res.status(400).json({ error });
    console.log(accountRegisterDto);
    this.accountService.registerUser(accountRegisterDto!)
      .then((user) => res.json(user))
      .catch(error => this.handleError(error, res));
  };

  public loginUser = (req: Request, res: Response) => {
    const [error, accountLoginDto] = AccountLoginDto.create(req.body);
    if(error) return res.status(400).json({ error });

    this.accountService.loginUser(accountLoginDto!)
      .then((user) => res.json(user))
      .catch(error => this.handleError(error, res));
  }

  public validateEmail = (req:Request, res:Response) => {
    const { token } = req.params;
    console.log(token);
    this.accountService.validateEmail(token)
      .then(() => res.json('Correo validado'))
      .catch(error => this.handleError(error, res));
  }

  public sendEmailResetPassword = (req: Request, res:Response) => {
    const { email } = req.body;
    this.accountService.sendResetPasswordLink(email)
      .then(() => res.json({ message: 'Se ha enviado un enlace al correo electrónico, verifica tu bandeja de entrada'}))
      .catch(error => this.handleError(error, res));
  }

  public resetPassword = (req:Request, res:Response) => {
    const { token } = req.params;
    const { newPassword } = req.body;
    this.accountService.resetPassword(token, newPassword)
      .then(() => res.status(200).json({ message: 'Contraseña reestablecida correctamente', verifyPassword: true }))
      .catch(error => this.handleError(error, res));
  }

  public validateVerificationCode = (req:Request, res:Response) => {
    const { token } = req.params;
    const { code } = req.body;
    this.accountService.verifyResetCode(token, code)
      .then(() => res.status(200).json({ message: 'Código de verificación válidado correctamente', verifyCode: true}))
      .catch(error => this.handleError(error, res));
  }

  public validateToken = (req:Request, res:Response) => {
    const { token } = req.params;
    this.accountService.validateToken(token)
      .then(() => res.status(200).json({ message: 'Token válido', authenticated: true }))
      .catch(error => this.handleError(error, res));
  }
}