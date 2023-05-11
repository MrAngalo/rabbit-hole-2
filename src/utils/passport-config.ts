import { Strategy as LocalStrategy } from 'passport-local';
import { PassportStatic } from 'passport';
import bcrypt2 from 'bcrypt';
import { User } from 'src/entities/User';

module.exports = initPassport;
export = initPassport;

async function initPassport(passport:PassportStatic, getUserByEmail:(email: string) => Promise<User | null>, getUserById:(id: number) => Promise<User | null>) {
  const authenticateUser = async (email:string, password:string, done:(err: any, user?: any, options?: any) => void) => {
      const user = await getUserByEmail(email);
      if (user == null)
          return done(null, false, { message: 'Error: No user with that email' });
      
      try {
        
        if (await bcrypt2.compare(password, user.password)) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Error: Password incorrect'});
        }
        
      } catch (err) {
          return done(err);
      }
  }

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));
  passport.serializeUser(async (user:any, done) => done(null, user.id));
  passport.deserializeUser(async (id:any, done) => done(null, await getUserById(id)));
}