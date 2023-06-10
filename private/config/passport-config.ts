import { Strategy as LocalStrategy } from 'passport-local';
import { PassportStatic } from 'passport';
import bcrypt from 'bcrypt';
import { VerifyFunctionWithRequest } from 'passport-local';
import { DataSource, ObjectLiteral } from 'typeorm';
import { User } from '../entities/User';
import { Token, TokenType } from '../entities/Token';

let pass = { initPassport }
module.exports = pass;
export = pass;

let dataSource: DataSource;
let getUserByEmail:(email: string) => Promise<User | null>;
let getUserById:(id: number) => Promise<User | null>;

async function initPassport(passport:PassportStatic, _dataSource: DataSource) {
  dataSource = _dataSource;

  async function getUserWhere (where:string, param?: ObjectLiteral) {
    return dataSource.getRepository(User)
      .createQueryBuilder('user')
      .select(['user', 'user.password'])
      .where(where, param)
      .getOne();
  }

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

  if (!user.confirmed && !(await tokenIsValid(user.id, req.body.token, tokenSuccessCB))) {
    (req.session as any).myinfo = { warn: 'Error: You must verify your email first. Click <a href="/verify">here</a> to resend the verification email' };
    return done(null, false);
  }

  function tokenSuccessCB(token: Token) { //only executes for those who are not confirmed
    user!.confirmed = true;
    user!.save(); //async
    token.remove(); //async
  }

  (req.session as any).myinfo = { info: `Welcome ${user.username}!`};
  done(null, user);
}

async function tokenIsValid(userid: number, token_input: string|undefined, cb: (token: Token) => void | Promise<void>) {
  
  //should always have at most one element, but it uses getMany() for flexibility
  const tokens = await dataSource.getRepository(Token)
    .createQueryBuilder('token')
    .select([
      'token.id',
      'token.type',
      'token.expires',
      'token.ownerId',
      'token.value',
    ])
    .where('token.ownerId = :userid', { userid })
    .andWhere('token.type = :type', { type: TokenType.VERIFY })
    .andWhere('token.expires > now()')
    .getMany();

  let foundToken = null;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].value == token_input) {
      foundToken = tokens[i];
      break;
    }
  }

  if (foundToken == null) {
    return false;
  }

  await cb(foundToken);
  return true;
}