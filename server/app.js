// Load dependencies
var express = require('express')
    , path = require('path')
    , favicon = require('static-favicon')
    , logger = require('morgan')
    , cookieParser = require('cookie-parser')
    , bodyParser = require('body-parser')
    , session = require('express-session');

var mongoose = require('mongoose')
    , passport = require('passport')
    , flash = require('connect-flash')
    , expressValidator = require('express-validator');

// per-environment configuration
configuration = require('./config/app_dev');

// routes
var genericRoutes = require('./routes/index');
var chatRoutes = require('./routes/chat');
var authenticationRoutes = require('./routes/authentication');
var accountRoutes = require('./routes/account');
var profileRoutes = require('./routes/profile');

// express
var app = express();

// MongoDB
mongoose.connect(configuration.mongo.url);

// Sessions in MongoDB
var MongoStore = require('connect-mongo')({session: session}); // @todo: re-pass express instead of hash when npm will be updated https://www.npmjs.org/package/connect-mongo
var sessionStore = new MongoStore({mongoose_connection: mongoose.connection});

// Passport
require('./app/passport')(passport, configuration.facebook); // note that will modify passport object and
// @todo : important, populate automatically res.locals.user

// http server
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser());
app.use(expressValidator()); // must be immediately after bodyParser()
app.use(cookieParser());
app.use(session({ secret: 'q4qsd65df45s4d5f45ds5fsf4s', key: 'express.sid', store: sessionStore }));
app.use(passport.initialize());
app.use(passport.session());
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());

// view engine setup
app.engine('html', require('hogan-express'));
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.set('view engine', 'html');
app.locals.title = configuration.title;

app.use(genericRoutes);
app.use(chatRoutes);
app.use(authenticationRoutes);
app.use('/account', accountRoutes);
app.use(profileRoutes);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    if (req.user) {
        res.locals.user = req.user;
    }
    res.render('404', {}, function(err, html) {
        res.send(404, html);
    });
});

/// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            layout: 'error_layout'
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = {
    app: app,
    passport: passport,
    sessionStore: sessionStore
};
