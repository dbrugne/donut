var express = require('express');
var errors = require('./app/middlewares/errors');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var less = require('less-middleware');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('./app/middlewares/session');
var passport = require('./app/passport');
var csrf = require('csurf');
var flash = require('connect-flash');
var prepareViews = require('./app/middlewares/prepareviews');
var expressValidator = require('./app/validator');
var googleAnalytics = require('./app/middlewares/googleanalytics');
var conf = require('./config/index');

/****************************************************************************
 * Order of middleware is VERY important to avoid useless computing/storage *
 ****************************************************************************/

var app = express();

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(less(__dirname+'/public'));
app.use('/medias', express.static(path.join(__dirname, 'medias')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser());
app.use(expressValidator()); // must be immediately after bodyParser()
app.use(cookieParser());
app.use(session);
app.use(passport.initialize());
app.use(passport.session());
app.use(csrf());
app.use(flash());
app.use(prepareViews());
app.use(googleAnalytics());

app.engine('html', require('hogan-express'));
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.set('view engine', 'html');

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

app.use(errors('404'));
app.use(errors('500', app));

module.exports = app;