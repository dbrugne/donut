require('newrelic');
var debug = require('debug')('donut:web');
var express = require('express');
var errors = require('./app/middlewares/errors');
var path = require('path');
var compression = require('compression')
var favicon = require('serve-favicon');
var logger = require('morgan');
var less = require('less-middleware');
var fqdn = require('./app/middlewares/fqdn');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('./app/middlewares/session');
var passport = require('../shared/authentication/passport');
var csrf = require('csurf');
var flash = require('connect-flash');
var i18n = require('./app/middlewares/i18n');
var prepareViews = require('./app/middlewares/prepareviews');
var expressValidator = require('../shared/util/validator');
var googleAnalytics = require('./app/middlewares/googleanalytics');
var conf = require('../shared/config/index');
var debugMiddleware = require('./app/middlewares/debug');
var facebookLocale = require('./app/middlewares/facebooklocale');

/****************************************************************************
 * Order of middleware is VERY important to avoid useless computing/storage *
 ****************************************************************************/

var app = express();
app.enable('trust proxy'); // nginx

app.use(compression());
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(less(__dirname+'/public', { force: conf.less.force }));
app.use(express.static(path.join(__dirname, 'node_modules/socket.io-client'))); // => require('socket.io-client');
app.use(express.static(path.join(__dirname, '../shared/cloudinary'))); // cloudinary common logic
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));
app.use(fqdn());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator()); // must be immediately after bodyParser()
app.use(cookieParser());
app.use(session);
app.use(passport.initialize());
app.use(passport.session());
app.use(csrf());
app.use(flash());
app.use(debugMiddleware);
app.use(facebookLocale);
app.use(i18n.middleware);
app.use(i18n.router);
app.use(prepareViews());
app.use(googleAnalytics());

app.engine('html', require('hogan-express'));
app.set('views', path.join(__dirname, '/views'));
app.set('layout', false);
app.set('view engine', 'html');

// public routes
app.use(require('./app/routes/seo'));
app.use(require('./app/routes/landing'));
app.use(require('./app/routes/account-signup'));
app.use(require('./app/routes/account-login'));
app.use(require('./app/routes/account-link'));
app.use(require('./app/routes/account-forgot'));
app.use(require('./app/routes/user-profile'));
app.use(require('./app/routes/room-profile'));
app.use(require('./app/routes/chat'));
app.use(require('./app/routes/choose-username'));
app.use(require('./app/routes/account-delete'));
app.use(require('./app/routes/account-edit-email'));
app.use(require('./app/routes/account-edit-password'));
app.use(require('./app/routes/static'));

// admin routes
app.use(require('./app/dashboard/index'));
app.use(require('./app/dashboard/rest'));

app.use(errors('404'));
app.use(errors('500', app));

// Launch HTTP server
var port = process.env.PORT || 3000;
var server = app.listen(port, function() {
  debug('Express server listening on port ' + server.address().port);
});
