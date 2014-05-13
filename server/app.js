// Load dependencies
var express = require('express')
    , path = require('path')
    , favicon = require('static-favicon')
    , logger = require('morgan')
    , cookieParser = require('cookie-parser')
    , bodyParser = require('body-parser')
    , session = require('express-session')
    , csrf = require('csurf');

var mongoose = require('mongoose')
    , passport = require('passport')
    , flash = require('connect-flash')
    , expressValidator = require('./app/validator');

// per-environment configuration
var configuration = require('./config/app_dev');

// express
var app = express();

// MongoDB
mongoose.connect(configuration.mongo.url);

// Sessions in MongoDB
var MongoStore = require('connect-mongo')({session: session}); // @todo: re-pass express instead of hash when npm will be updated https://www.npmjs.org/package/connect-mongo
var sessionStore = new MongoStore({mongoose_connection: mongoose.connection});

// Passport
require('./app/passport')(passport, configuration.facebook); // note that will modify passport object and

// http server
app.use(favicon());
app.use(logger('dev'));
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') })); // maintain before other middleware to avoid useless computing
app.use('/medias', express.static(path.join(__dirname, 'medias'))); // maintain before other middleware to avoid useless computing
app.use(express.static(path.join(__dirname, 'public'))); // maintain before other middleware to avoid useless computing
app.use(bodyParser());
app.use(expressValidator()); // must be immediately after bodyParser()
app.use(cookieParser());
app.use(session({
  secret:   configuration.sessions.secret,
  key:      configuration.sessions.key,
  store:    sessionStore
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next) { // pass user to all views
    res.locals.user = req.user;
    next();
});
//app.use(csrf()); // @todo : CSRF doesn't work everytinme (espacially with nested forms)
app.use(function(req, res, next) { // add csrf helper in all views
    res.locals.token = "xxx";//req.csrfToken();
    next();
});
app.use(flash());
app.use(function(req, res, next) { // pass flash messages to all views
    res.locals.success = req.flash('success');
    res.locals.info = req.flash('info');
    res.locals.warning = req.flash('warning');
    res.locals.error = req.flash('error');
    next();
});

// view engine setup
app.engine('html', require('hogan-express'));
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.set('view engine', 'html');
app.locals.title = configuration.title;

// routes
app.use(require('./routes/index'));
app.use(require('./routes/chat'));
app.use(require('./routes/authentication'));
app.use(require('./routes/account'));
app.use(require('./routes/user-profile'));
app.use(require('./routes/room-profile'));

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    if (req.user) {
        res.locals.user = req.user;
    }
    res.render('404', {}, function(err, html) {
        res.send(404, html);
    });
});

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
