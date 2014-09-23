
module.exports = function(code, app) {

  // Error 404
  if (code == '404') {
    return function (req, res, next) {
      if (req.user) {
        res.locals.user = req.user;
      }
      res.render('404', {
        layout       : 'layout',
        partials: {head: '_head'},
        meta: {title: '404 (donuts) error'}
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
        message: err.message,
        error  : {},
        layout : false,
        partials: {head: '_head'},
        meta: {title: '500 (donuts) error'}
      });
    };
  } else {
    // Display full error message
    return function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message      : err.message,
        errorObject  : err,
        layout       : false,
        partials: {head: '_head'},
        meta: {title: '500 (donuts) error'}
      });
    };
  }

};