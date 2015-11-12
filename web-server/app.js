'use strict';

// configure logger
require('pomelo-logger').configure(require('../ws-server/config/log4js'));

// middleware declaration order is VERY important to avoid useless computing
var logger = require('pomelo-logger').getLogger('web', __filename);
var express = require('express');
var errors = require('./app/middlewares/errors');
var path = require('path');
var favicon = require('serve-favicon');
var httpLogger = require('morgan');
var underscoreTemplate = require('../shared/util/underscore-template');
var less = require('less-middleware');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('./app/middlewares/session');
var passport = require('../shared/authentication/passport');
var flash = require('connect-flash');
var i18n = require('./app/middlewares/i18n');
var prepareViews = require('./app/middlewares/prepareviews');
var expressValidator = require('../shared/util/validator');
var googleAnalytics = require('./app/middlewares/googleanalytics');
var conf = require('../config/index');
var debugMiddleware = require('./app/middlewares/debug');
var facebookLocale = require('./app/middlewares/facebooklocale');
var cors = require('cors');

var app = express();
app.enable('trust proxy'); // nginx

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(cors()); // allow requests from mobile client (@todo dbr: whitelist allowed origins URLs)
app.use(less(__dirname + '/public', { force: conf.less.force }));
app.use(express.static(path.join(__dirname, '../node_modules/socket.io-client'))); // => require('socket.io-client');
app.use(express.static(path.join(__dirname, 'public')));
app.use(httpLogger('dev'));

// on-the-fly browserify middleware
if (process.env.NODE_ENV === 'development') {
  app.use(require('browserify-dev-middleware')({
    src: __dirname + '/public/web',
    transforms: [
      require('../shared/util/browserify-jst'),
      require('../shared/util/browserify-i18next')
    ]
  }));
  app.use(require('browserify-dev-middleware')({
    src: __dirname + '/public/outside',
    transforms: [
      require('../shared/util/browserify-jst'),
      require('../shared/util/browserify-i18next')
    ]
  }));
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // for react-native fetch()
app.use(expressValidator()); // must be immediately after bodyParser()
app.use(cookieParser());
app.use(session);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(debugMiddleware);
app.use(facebookLocale);
app.use(i18n.middleware);
app.use(i18n.router);
app.use(prepareViews());
app.use(googleAnalytics());

// template engine
app.engine('html', underscoreTemplate.express({}));
app.set('view engine', 'html');

// authentication routes
app.use(require('./app/authentication/oauth'));
app.use(require('./app/authentication/signup'));
app.use(require('./app/authentication/login'));
app.use(require('./app/authentication/link'));
app.use(require('./app/authentication/forgot'));
app.use(require('./app/authentication/username'));
app.use(require('./app/authentication/verify'));

// public routes
app.use(require('./app/routes/seo'));
app.use(require('./app/routes/landing'));
app.use(require('./app/routes/room-profile'));
app.use(require('./app/routes/group-profile'));
app.use(require('./app/routes/chat'));
app.use(require('./app/routes/contact-form'));
app.use(require('./app/routes/static'));
app.use(require('./app/routes/create'));
app.use(require('./app/routes/rest'));

app.use(errors('404'));
app.use(errors('500', app));

// Launch HTTP server
var port = process.env.PORT || 3000;
var server = app.listen(port, function () {
  logger.info('Express server listening on port ' + server.address().port);
});
