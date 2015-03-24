var conf = require('../../../shared/config/index');
var cloudinary = require('../../../shared/cloudinary/cloudinary');

/**
 * Register systematically some variables in views
 */
module.exports = function() {
  return function (req, res, next) {
    // pass current session user to all views
    if (req.user) {
      res.locals.user = req.user.toObject(); // .toObject() avoid modification on original req.user object (like avatar)
      res.locals.user.avatar = cloudinary.userAvatar(req.user._avatar(), 80);
      if (req.user.username)
        res.locals.user.url = req.protocol + '://' + conf.fqdn + '/user/' + (''+req.user.username).toLocaleLowerCase();
    }

    // pass flash messages to all views
    res.locals.success = req.flash('success');
    res.locals.info = req.flash('info');
    res.locals.warning = req.flash('warning');
    res.locals.error = req.flash('error');

    // configuration
    res.locals.cloudinary = conf.cloudinary;
    res.locals.facebook = conf.facebook;
    res.locals.recaptcha = conf.google.recaptcha;
    res.locals.room_default_color = conf.room.default.color;

    next();
  };
};
