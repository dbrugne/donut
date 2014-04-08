// Load dependencies
var express = require('express'),
    http = require('http'),
    path = require('path'),
    favicon = require('static-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    flash = require('connect-flash'),
    expressValidator = require('express-validator');

// per-environment configuration
configuration = require('./config/app_dev');

// express
var app = express();

// mongoDB
mongoose.connect(configuration.mongo.url);

// passport
require('./app/passport')(passport);

// view engine setup
app.engine('html', require('hogan-express'));
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.set('view engine', 'html');
app.locals.title = configuration.title;

// http server
app.use(favicon());
app.use(logger('dev'));
app.use(express.bodyParser());
app.use(expressValidator());
app.use(cookieParser());
app.use(express.session({ secret: 'q4qsd65df45s4d5f45ds5fsf4s' }));
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(app.router);

// routes
require('./app/routes')(app, passport);

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
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
