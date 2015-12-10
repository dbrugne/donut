'use strict';
var logger = require('pomelo-logger').getLogger('web', __filename);
module.exports = function (code, app) {
  // Error 404
  if (code === '404') {
    return function (req, res, next) {
      if (req.user) {
        res.locals.user = req.user;
      }
      res.render('404', {
        meta: {title: '404 (donuts) error'}
      }, function (err, html) {
        if (err) {
          logger.debug(err);
        }
        res.status(404).send(html);
      });
    };
  }

  // Error 500
  return function (err, req, res, next) {
    logger.error(err);
    res.status(err.status || 500);
    if (req.accepts(['html', 'json']) === 'json') {
      res.json({err: err.message});
    } else {
      res.render('error', {
        message: err.message,
        meta: {title: 'Error'}
      });
    }
  };
};
