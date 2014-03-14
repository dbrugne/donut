// app.js

// Easy Node Authentication: http://scotch.io/tutorials/javascript/easy-node-authentication-setup-and-local

// set up =====================================================================
// get all the tools we need
var express  = require('express');
var app      = express();
var port     = 3000; // process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash 	 = require('connect-flash');

var configDB = require('./config/database.js');

require('underscore-express')(app, 'html'); // https://github.com/caseywebdev/underscore-express

// configuration ===============================================================
mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

app.configure(function() {

    // set up our express application
    app.use(express.logger('dev')); // log every request to the console
    app.use(express.cookieParser()); // read cookies (needed for auth)
    app.use(express.bodyParser()); // get information from html forms

    // required for passport
    app.use(express.session({ secret: '789645132v(xoe6_=s21vlc$p-5wij=4#t=wcwkc+0$ib@ch*0vyc0b8%!_azedqswxc' })); // session secret
    app.use(passport.initialize());
    app.use(passport.session()); // persistent login sessions
    app.use(flash()); // use connect-flash for flash messages stored in session

    // static files
    app.use("/assets", express.static(__dirname + '/assets'));
    app.use("/medias", express.static(__dirname + '/medias'));

});

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);
