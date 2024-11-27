import { Request, Response } from 'express';
import { CustomError } from '../../domain';
import { AccountRegisterDto } from '../../domain/dtos/auth/AccountRegisterDto';
import { AccountService } from '../services/account-service';
import { AccountLoginDto } from '../../domain/dtos/auth/AccountLoginDto';

export class AuthController {
  constructor(public readonly accountService: AccountService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal serve error' });
  } 

  public registerUser = (req: Request, res: Response) => {
    const [error, accountRegisterDto] = AccountRegisterDto.create(req.body);
    if (error) return res.status(400).json({ error });
    
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
}