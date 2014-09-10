var conf = require('../../config/index');

/**
 * Register systematically some variables in views
 */
module.exports = function() {
  return function (req, res, next) {
    // pass current session user to all views
    res.locals.user = req.user;

    // pass flash messages to all views
    res.locals.success = req.flash('success');
    res.locals.info = req.flash('info');
    res.locals.warning = req.flash('warning');
    res.locals.error = req.flash('error');

    // pass CSRF token to all views
    res.locals.token = req.csrfToken();

    res.locals.cloudinary = conf.cloudinary;
    res.locals.facebook = conf.facebook;

    next();
  };
};
