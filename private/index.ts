require('dotenv').config();

import express from 'express';
import expressLayout from 'express-ejs-layouts';
import passport from 'passport';
import flash from 'express-flash';
import session from 'express-session';
import PGSimple from 'connect-pg-simple';
import { DataSource } from 'typeorm';
import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';
import initPassport from './utils/passport-config';
import createSceneRouter from './routes/createSceneRouter';
import authenticationRouter from './routes/authenticationRouter';
import fetchSceneRouter from './routes/fetchSceneRouter';
import guidelineRouter from './routes/guidelinesRouter';
import homeRouter from './routes/homeRouter';
import csrf from 'csurf';
import { configLocals, handleErrors } from './routes/middleware';
import { Scene } from './entities/Scene';
import { User } from './entities/User';
import { Token } from './entities/Token';
import { Badge } from './entities/Badges'
import { SceneRating, UserRating } from './entities/Rating';
import { initTenor } from './utils/tenor-utils';
import fetchTenorRouter from './routes/fetchTenorRouter';

async function mainApp() {
  
  // ************************************************** //
  //                    ENV CHECK                       //
  // ************************************************** //

  if (!process.env.DATABASE_URL) {
    console.log("Failed to start: Environment variable DATABASE_URL not set");
    process.exit();
  }

  if (!process.env.SESSION_SECRET) {
    console.log("Failed to start: Environment variable SESSION_SECRET not set");
    process.exit();
  }

  if (!process.env.TENOR_API_VERSION) {
    console.log("Failed to start: Environment variable TENOR_API_VERSION not set");
    process.exit();
  }

  if (!process.env.TENOR_KEY) {
    console.log("Failed to start: Environment variable TENOR_KEY not set");
    process.exit();
  }

  // ************************************************** //
  //                      SET UP                        //
  // ************************************************** //

  const globals:any = {};
  
  //connects to postgresql database
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    //ssl: { rejectUnauthorized: false },
    entities: [ Scene, User, Token, Badge, UserRating, SceneRating ],
    synchronize: true
  });
  await dataSource.initialize(); //establishes connection to postgresql databse
  await Scene.createRelationsCache(dataSource);

  globals.scene_count = (await Scene.count()) -1 //removes root scene

  const last_scene = await dataSource.getRepository(Scene)
    .createQueryBuilder('scene')
    .select(['scene.id AS id'])
    .orderBy('scene.id', 'DESC')
    .getRawOne();

  
  globals.last_id = (last_scene) ? last_scene.id : -1; //different from scene_count since it accounts for holes (deleted scenes)

  console.log(`Total scenes: ${globals.scene_count}`);
  console.log(`Higest scene id: ${globals.last_id}`);

  // const pool = new Pool({
  //   connectionString: process.env.DATABASE_URL,
  //   //ssl: { rejectUnauthorized: false }
  // });
  // const client = await pool.connect();
  
  //sets up express session with postgresql database
  const sessionConfig = {
    store: new (PGSimple(session))({
      //pool: pool,
      pool: (dataSource.driver as PostgresDriver).master,
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || '',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 4 * 60 * 60 * 1000 } // 4 hours
  }
  
  //initializes passport (keeps track of login authentication)
  initPassport(passport,
    async (email: string) => await dataSource.getRepository(User).createQueryBuilder('user').select(['user', 'user.password']).where('user.email = :email', { email }).getOne(),
    async (id: number) => await dataSource.getRepository(User).createQueryBuilder('user').select(['user', 'user.password']).where('user.id = :id', { id }).getOne()
  );
  
  //sets up tenor (gif library)
  const Credentials:any = {
    "Key": process.env.TENOR_KEY, // https://developers.google.com/tenor/guides/quickstart
    "Filter": "off", // "off", "low", "medium", "high", not case sensitive
    "Locale": "en_US", // Your locale here, case-sensitivity depends on input
    "MediaFilter": "minimal", // either minimal or basic, not case sensitive
    "DateFormat": "D/MM/YYYY - H:mm:ss A" // Change this accordingly
  };
  const Tenor = require("tenorjs").client(Credentials);
  if (process.env.TENOR_API_VERSION == '1') {
    Credentials.Gate = "https://g.tenor.com/v1"; //overrides the value set in the above function
  }
  // else if (process.env.TENOR_API_VERSION == '2') {
    // Credentials.Gate = "https://tenor.googleapis.com/v2";
  // }
  initTenor(Tenor);

  //sets up csrf tokens
  const csrfProtection = csrf({
    cookie: false
    // ignoreMethods: ['POST', 'GET', 'HEAD', 'OPTIONS']
  });

  // if (!(await tenorIdsExist(["23616422"]))) {
  //   console.log("");
  // }

  // ************************************************** //
  //                    Express App                     //
  // ************************************************** //
  var app = express();
  var port = process.env.PORT || 9000;

  //Static Files
  app.use(express.static('public'));
  app.use('/img', express.static(__dirname + 'public/img'));
  app.use('/css', express.static(__dirname + 'public/css'));
  app.use('/js', express.static(__dirname + 'public/js'));

  //Templating Engine
  app.set('view engine', 'ejs');
  
  //Middleware Configuration

  //ejs
  app.use(expressLayout);
  //parses incoming requests
  app.use(express.urlencoded({ extended: false }));
  //loads cookies
  app.use(flash());
  app.use(session(sessionConfig));
  //csrf
  app.use(csrfProtection);
  //loads active user
  app.use(passport.initialize());
  app.use(passport.session());
  //My middleware
  //load default values to locals
  app.use(configLocals({ globals }));

  //page routers
  app.use(homeRouter());
  app.use(guidelineRouter());
  app.use(authenticationRouter({ dataSource, passport }));
  app.use(fetchSceneRouter({ dataSource }));
  app.use(createSceneRouter({ dataSource, globals }));
  app.use(fetchTenorRouter({ Tenor }));

  //handle errors
  app.use(handleErrors)

  //clean up on exit
  process.on('exit', function(_code) {
    console.log('Shutting down server...');
    dataSource.destroy();
    // client.release();
    console.log('Database saved!');
  });

  //handles ctrl+c
  process.on('SIGINT', function() {
    process.exit();
  });

  app.listen(port);
  console.log(`Server running on port ${port}`);
}

mainApp().catch((error) => {
  console.error(error);
});