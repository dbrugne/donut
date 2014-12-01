var debug = require('debug')('donut:web');
var express = require('express');
var errors = require('../server/app/middlewares/errors');
var path = require('path');
var compression = require('compression')
var favicon = require('serve-favicon');
var logger = require('morgan');
var less = require('less-middleware');
var fqdn = require('../server/app/middlewares/fqdn');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('../server/app/middlewares/session');
var passport = require('../server/app/passport');
var csrf = require('csurf');
var flash = require('connect-flash');
var i18n = require('../server/app/middlewares/i18n');
var prepareViews = require('../server/app/middlewares/prepareviews');
var expressValidator = require('../server/app/validator');
var googleAnalytics = require('../server/app/middlewares/googleanalytics');
var conf = require('../server/config/index');

/****************************************************************************
 * Order of middleware is VERY important to avoid useless computing/storage *
 ****************************************************************************/

var app = express();

app.use(compression());
app.use(favicon(__dirname + '/../server/public/favicon.ico'));
app.use(less(__dirname+'/../server/public', { force: conf.less.force }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '/../server/public')));
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
app.use(i18n.middleware);
app.use(i18n.router);
app.use(prepareViews());
app.use(googleAnalytics());

app.engine('html', require('hogan-express'));
app.set('views', path.join(__dirname, '/../server/views'));
app.set('layout', false);
app.set('view engine', 'html');

app.use(require('../server/http/landing'));
app.use(require('../server/http/account-signup'));
app.use(require('../server/http/account-login'));
app.use(require('../server/http/account-link'));
app.use(require('../server/http/account-forgot'));
app.use(require('../server/http/user-profile'));
app.use(require('../server/http/room-profile'));
app.use(require('../server/http/chat'));
app.use(require('../server/http/choose-username'));
app.use(require('../server/http/account-delete'));
app.use(require('../server/http/account-edit-email'));
app.use(require('../server/http/account-edit-password'));
app.use(require('../server/http/static'));

app.use(errors('404'));
app.use(errors('500', app));

// Launch HTTP server
var port = process.env.PORT || 3000;
var server = app.listen(port, function() {
  debug('Express server listening on port ' + server.address().port);
});

//var express = require('express');
//var app = express();
//var bodyParser = require('body-parser');

//app.use(bodyParser.urlencoded({ extended: true }));

//app.use(express.methodOverride());
//var router  = express.Router();
//app.use(router);

//app.set('view engine', 'jade');
//app.set('views', __dirname + '/public');
//app.set('view options', {layout: false});
//app.set('basepath',__dirname + '/public');

//var oneYear = 31557600000;
//app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
//app.use(express.static(__dirname + '/public'));

//app.use(express.errorHandler());

//console.log("Web server has started.\nPlease log on http://127.0.0.1:3001/index.html");
//
//app.listen(3001);
