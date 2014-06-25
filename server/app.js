// Load dependencies
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var less = require('less-middleware');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var csrf = require('csurf');
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var expressValidator = require('./app/validator');
var conf = require('./config/index');
var googleanalytics = require('./app/middlewares/googleanalytics');

// express
var app = express();

// session store
var redisStore = new RedisStore({});

// MongoDB
mongoose.connect(conf.mongo.url);

// Passport
require('./app/passport')(passport, conf.facebook); // note: will modify passport object

// http server
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(less(__dirname+'/public')); // maintain before other middleware to avoid useless computing
app.use('/medias', express.static(path.join(__dirname, 'medias'))); // maintain before other middleware to avoid useless computing
app.use(express.static(path.join(__dirname, 'public'))); // maintain before other middleware to avoid useless computing
app.use(bodyParser());
app.use(expressValidator()); // must be immediately after bodyParser()
app.use(cookieParser());
app.use(session({
  store : redisStore,
  secret: conf.sessions.secret,
  key   : conf.sessions.key
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(function (req, res, next) { // pass user to all views
  res.locals.user = req.user;
  next();
});
app.use(csrf());
app.use(function (req, res, next) { // add csrf helper in all views
  res.locals.token = req.csrfToken();
  next();
});
app.use(flash());
app.use(function (req, res, next) { // pass flash messages to all views
  res.locals.success = req.flash('success');
  res.locals.info = req.flash('info');
  res.locals.warning = req.flash('warning');
  res.locals.error = req.flash('error');
  next();
});
app.use(googleanalytics());

// view engine setup
app.engine('html', require('hogan-express'));
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.set('view engine', 'html');
app.locals.title = conf.title;
app.locals.cloudinary = conf.cloudinary;

// routes
app.use(require('./routes/index'));
app.use(require('./routes/signup'));
app.use(require('./routes/reset-password'));
app.use(require('./routes/account-login'));
app.use(require('./routes/account-link'));
app.use(require('./routes/user-profile'));
app.use(require('./routes/room-profile'));
app.use(require('./routes/chat'));
app.use(require('./routes/choose-username'));
app.use(require('./routes/account'));
app.use(require('./routes/account-delete'));
app.use(require('./routes/account-edit-email'));
app.use(require('./routes/account-edit-password'));
app.use(require('./routes/account-edit-profile'));
app.use(require('./routes/room-edit'));

/// catch 404 and forwarding to error handler
app.use(function (req, res, next) {
  if (req.user) {
    res.locals.user = req.user;
  }
  res.render('404', {}, function (err, html) {
    res.send(404, html);
  });
});

if (app.get('env') === 'dev') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message      : err.message,
      errorObject  : err,
      layout       : false
    });
  });
}

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message   : err.message,
    error     : {},
    layout    : false
  });
});

module.exports = {
  app         : app,
  passport    : passport,
  sessionStore: redisStore
};
