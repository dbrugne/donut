var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));

//app.use(express.methodOverride());
var router  = express.Router();
app.use(router);

app.set('view engine', 'jade');
app.set('views', __dirname + '/public');
app.set('view options', {layout: false});
app.set('basepath',__dirname + '/public');

//var oneYear = 31557600000;
//app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
app.use(express.static(__dirname + '/public'));

//app.use(express.errorHandler());
app.use(function(code, app) {

  // Error 404
  if (code == '404') {
    return function (req, res, next) {
      if (req.user) {
        res.locals.user = req.user;
      }
      res.render('404', {
        layout  : 'layout-form',
        partials: {head: '_head'},
        meta    : {title: '404 (donuts) error'}
      }, function (err, html) {
        res.status(404).send(html);
      });
    };
  }

  // Error 500
  if (app.get('env') === 'production') {
    // Display light error page
    return function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message : err.message,
        error   : {},
        layout  : false,
        partials: {head: '_head'},
        meta    : {title: '500 (donuts) error'}
      });
    };
  } else {
    // Display full error message
    return function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message    : err.message,
        errorObject: err,
        layout     : false,
        partials   : {head: '_head'},
        meta       : {title: '500 (donuts) error'}
      });
    };
  }
});

console.log("Web server has started.\nPlease log on http://127.0.0.1:3001/index.html");

app.listen(3001);
