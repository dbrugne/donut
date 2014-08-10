var express = require('express');
var errors = require('./app/middlewares/errors');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var less = require('less-middleware');
var fqdn = require('./app/middlewares/fqdn');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('./app/middlewares/session');
var passport = require('./app/passport');
var csrf = require('csurf');
var flash = require('connect-flash');
var i18n = require('./app/middlewares/i18n');
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
app.use(less(__dirname+'/public', { force: conf.less.force }));
app.use('/medias', express.static(path.join(__dirname, 'medias')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(fqdn());
app.use(bodyParser());
app.use(expressValidator()); // must be immediately after bodyParser()
app.use(cookieParser());
app.use(session);
app.use(passport.initialize());
app.use(passport.session());
app.use(csrf());
app.use(flash());
app.use(i18n.middleware);
app.use(i18n.router);
app.use(prepareViews());
app.use(googleAnalytics());

app.engine('html', require('hogan-express'));
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.set('view engine', 'html');

app.use(require('./http/landing'));
app.use(require('./http/signup'));
app.use(require('./http/reset-password'));
app.use(require('./http/account-login'));
app.use(require('./http/account-link'));
app.use(require('./http/user-profile'));
app.use(require('./http/room-profile'));
app.use(require('./http/chat'));
app.use(require('./http/choose-username'));
app.use(require('./http/account'));
app.use(require('./http/account-delete'));
app.use(require('./http/account-edit-email'));
app.use(require('./http/account-edit-password'));

app.use(errors('404'));
app.use(errors('500', app));

module.exports = app;