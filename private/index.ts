require('dotenv').config();

import express from 'express';
import expressLayout from 'express-ejs-layouts';
import passport from 'passport';
import flash from 'express-flash';
import session from 'express-session';
import PGSimple from 'connect-pg-simple';
import { DataSource } from 'typeorm';
import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';
import { initPassport } from './config/passport-config';
import createSceneRouter from './routes/scene/createScene';
import authRouter from './routes/auth/authRouter';
import userRouter from './routes/user/userRouter';
import fetchSceneRouter from './routes/scene/fetchScene';
import tenorApiRouter from './routes/api/tenorApiRouter';
import rateSceneRouter from './routes/scene/rateScene';
import guidelineRouter from './routes/guidelinesRouter';
import homeRouter from './routes/homeRouter';
import csrf from 'csurf';
import { configLocals, handleErrors } from './routes/middleware';
import { Scene } from './entities/Scene';
import { User } from './entities/User';
import { Token } from './entities/Token';
import { Badge } from './entities/Badges'
import { SceneRating, UserRating } from './entities/Rating';
import { initTenor, validateTenor } from './config/tenor-utils';
import { closeTransporter, initTransporter } from './config/mailer';

async function mainApp() {
  
  // ************************************************** //
  //                    ENV CHECK                       //
  // ************************************************** //

  const necessary_envs = [
    'ABSOLUTE_URL',
    'POSTGRESQL_URL',
    'SESSION_SECRET',
    'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS',
    'TENOR_API_VERSION', 'TENOR_KEY'
  ];

  let missing_env = false;
  necessary_envs.forEach(name => {
    if (!process.env[name]) {
      missing_env = true;
      console.log(`Failed to start: Environment variable ${name} not set`);
    }
  });
  if (missing_env) {
    process.exit();
  }

  // ************************************************** //
  //                      SET UP                        //
  // ************************************************** //

  console.log('>>> Rabbit Search Game <<<');
  console.log();

  //
  // configure globals
  //
  const globals = {
    rootdir: `${__dirname}/..`, // .../root/private/..
  };

  //
  // connects to postgresql database
  //
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.POSTGRESQL_URL!,
    //ssl: { rejectUnauthorized: false },
    entities: [ Scene, User, Token, Badge, UserRating, SceneRating ],
    synchronize: true
  });
  await dataSource.initialize(); //establishes connection to postgresql databse
  await Scene.createRelationsCache(dataSource);

  console.log('Connected to PostgreSQL Database');
  
  //
  // sets up express session with postgresql database
  //
  const sessionConfig = {
    store: new (PGSimple(session))({
      pool: (dataSource.driver as PostgresDriver).master,
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 4 * 60 * 60 * 1000 } // 4 hours
  }

  console.log('Configured Express Session with Database');

  //
  // connects to mail server
  //
  let mailOptions = {
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT!),
    secure: true,
    auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!
    }
  };
  if (!(await initTransporter(mailOptions, globals))) {
    process.exit();
  }

  console.log('Connected to Mail Server');
  
  //
  // initializes passport (keeps track of login authentication)
  //
  initPassport(passport, dataSource);

  console.log('Initialized Authentication Passport');
  
  //
  // sets up tenor (gif library)
  //
  const tenorCredentials:any = {
    "Key": process.env.TENOR_KEY!, // https://developers.google.com/tenor/guides/quickstart
    "Filter": "off", // "off", "low", "medium", "high", not case sensitive
    "Locale": "en_US", // Your locale here, case-sensitivity depends on input
    "MediaFilter": "minimal", // either minimal or basic, not case sensitive
    "DateFormat": "D/MM/YYYY - H:mm:ss A" // Change this accordingly
  };
  const Tenor = initTenor(tenorCredentials);
  if (!(await validateTenor())) {
    console.log('Error: Could not initialize Tenor API');
    process.exit();
  }
  
  console.log('Initialized Tenor GIF API');

  //
  // sets up csrf tokens
  //
  const csrfProtection = csrf({
    cookie: false
  });

  console.log('Initialized CSRF Tokens');
  console.log();
  
  console.log(`Total scenes: ${Scene.scene_count}`);
  console.log(`Higest scene id: ${Scene.last_id}`);

  // ************************************************** //
  //                    Express App                     //
  // ************************************************** //
  let app = express();
  let port = process.env.PORT || 5000;

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
  app.use(configLocals());

  //routers
  app.use(homeRouter());
  app.use(guidelineRouter());
  app.use(authRouter({ dataSource, passport }));
  app.use(fetchSceneRouter({ dataSource }));
  app.use(rateSceneRouter({ dataSource }))
  app.use(createSceneRouter({ dataSource }));
  app.use(userRouter({ dataSource }));
  app.use(tenorApiRouter({ Tenor }));

  //handle errors
  app.use(handleErrors);

  //clean up on exit
  process.on('exit', function(_code) {
    console.log();
    console.log('Shutting down server...');

    dataSource.destroy();
    closeTransporter();

    console.log('Goodbye');
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