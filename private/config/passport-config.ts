import { Strategy as LocalStrategy } from 'passport-local';
import { PassportStatic } from 'passport';
import bcrypt from 'bcrypt';
import { VerifyFunctionWithRequest } from 'passport-local';
import { DataSource, ObjectLiteral } from 'typeorm';
import { User } from '../entities/User';
import { Token } from '../entities/Token';

let dataSource: DataSource;
let getUserByEmail:(email: string) => Promise<User | null>;
let getUserById:(id: number) => Promise<User | null>;

export async function initPassport(passport:PassportStatic, _dataSource: DataSource) {
  dataSource = _dataSource;

  getUserByEmail = async (email: string) => getUserWhere('user.email = :email', { email });
  getUserById = async (id: number) => getUserWhere('user.id = :id', { id });

  passport.use(new LocalStrategy({ usernameField: 'email', passReqToCallback: true }, authenticateUser));
  passport.serializeUser(async (user:any, done) => done(null, user.id));
  passport.deserializeUser(async (id:any, done) => done(null, await getUserById(id)));
}

const authenticateUser: VerifyFunctionWithRequest = async (req, email, password, done) => {
  const user = await getUserByEmail(email.toLowerCase());

  if (user == null) {
    (req.session as any).myinfo = { error: 'Error: No user with that email' }
    return done(null, false);
  }
   
  if (!(await bcrypt.compare(password, user.password))) {
    (req.session as any).myinfo = { error: 'Error: Password incorrect' };
    return done(null, false);
  }

  if (!user.confirmed && !(await Token.validate(dataSource, req.body.token, user.id, tokenSuccessCB))) {
    (req.session as any).myinfo = { warn: 'Error: You must verify your email first. Click <a href="/verify">here</a> to resend the verification email' };
    return done(null, false);
  }

  //only executes for those who are not confirmed
  function tokenSuccessCB(token: Token) {
    user!.confirmed = true;
    user!.save(); //async
    token.remove(); //async
  }

  (req.session as any).myinfo = { info: `Welcome ${user.username}!`};
  done(null, user);
}

async function getUserWhere (where:string, param?: ObjectLiteral) {
  return dataSource.getRepository(User)
    .createQueryBuilder('user')
    .select(['user', 'user.password'])
    .where(where, param)
    .getOne();
}