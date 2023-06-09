import { IVerifyOptions, Strategy as LocalStrategy } from 'passport-local';
import { PassportStatic } from 'passport';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Request } from 'express-serve-static-core';
import { authenticateUserJSON } from '../routes/auth/authRouter';

export async function initPassport(config:{passport:PassportStatic, dataSource: DataSource}) {

  async function getUserById(id:any) {
    return config.dataSource.getRepository(User)
    .createQueryBuilder('user')
    .select(['user', 'user.password'])
    .where('user.id = :id', { id })
    .getOne();
  }

  type DoneFn = (error: any, user?: Express.User | false, options?: IVerifyOptions) => void;
  async function authenticateUser(req: Request, email: string, password: string, done: DoneFn) {
    
    const json = await authenticateUserJSON(req, email, password, config);
    if (json.code == 400) {
      if (json.error == 'You must verify your email first')
        json.error = 'You must verify your email first. Click <a href="/verify">here</a> to resend the verification email';

      (req.session as any).myinfo = { error: json.error }
      return done(null, false);
    }

    const user:User = json.response.user;
    (req.session as any).myinfo = { info: `Welcome ${user.username}!`};
    done(null, user);
  }

  config.passport.use(new LocalStrategy({ usernameField: 'email', passReqToCallback: true }, authenticateUser));
  config.passport.serializeUser(async (user:any, done) => done(null, user.id));
  config.passport.deserializeUser(async (id:any, done) => done(null, await getUserById(id)));
}