import { error } from 'console';
import { regularExps } from '../../config';
import { CustomError } from '../errors/CustomError';
export class AccountEntity {
  constructor(
    public id: string,
    public username: string, 
    public email: string,
    public password: string,
    public email_validated: boolean,
    public createdAt: string
  ) {}

  static fromObject(object: { [key:string]: any; } ) {
    const { 
      id,
      username,
      email,
      password,
      email_validated,
      created_at } = object;

    if (!id) throw CustomError.badRequest('Missing id');
    if(!username) throw CustomError.badRequest('Missing username');
    if (!email) throw CustomError.badRequest('Missing email');
    if (!password) throw CustomError.badRequest('Missing password');
    if (!created_at) throw CustomError.badRequest('Missing createdAt');

    return new AccountEntity(id, username, email, password, email_validated, created_at);
  }
}