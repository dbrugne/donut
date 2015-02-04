var conf = require('../../../shared/config/index');
var cloudinary = require('../../../shared/cloudinary/cloudinary');

/**
 * Register systematically some variables in views
 */
module.exports = function() {
  return function (req, res, next) {
    // pass current session user to all views
    res.locals.user = req.user;
    if (req.user) {
      res.locals.user.avatar = cloudinary.userAvatar(req.user._avatar(), 80);
      res.locals.user.url = req.protocol + '://' + conf.fqdn + '/user/' + req.user.username.toLocaleLowerCase();
    }

    // pass flash messages to all views
    res.locals.success = req.flash('success');
    res.locals.info = req.flash('info');
    res.locals.warning = req.flash('warning');
    res.locals.error = req.flash('error');

    // pass CSRF token to all views
    res.locals.token = req.csrfToken();

    // configuration
    res.locals.cloudinary = conf.cloudinary;
    res.locals.facebook = conf.facebook;
    res.locals.room_default_color = conf.room.default.color;

    next();
  };
};
