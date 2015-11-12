'use strict';
var conf = require('../../../config');
var urls = require('../../../shared/util/url');

/**
 * Register systematically some variables in views
 */
module.exports = function () {
  return function (req, res, next) {
    // pass current session user to all views
    if (req.user) {
      res.locals.user = req.user.toObject(); // .toObject() avoid modification on original req.user object (like avatar)
      res.locals.user.avatar = req.user._avatar(80);
    } else {
      res.locals.user = false;
    }

    // pass flash messages to all views
    res.locals.success = req.flash('success');
    if (res.locals.success === '') {
      res.locals.success = false;
    }
    res.locals.info = req.flash('info');
    if (res.locals.info === '') {
      res.locals.info = false;
    }
    res.locals.warning = req.flash('warning');
    if (res.locals.warning === '') {
      res.locals.warning = false;
    }
    res.locals.error = req.flash('error');
    if (res.locals.error === '') {
      res.locals.error = false;
    }

    // configuration
    res.locals.cloudinary = conf.cloudinary;
    res.locals.facebook = conf.facebook;
    res.locals.recaptcha = conf.google.recaptcha;
    res.locals.room_default_color = conf.room.default.color;
    res.locals.group_room_default = conf.group.default.name;
    res.locals.message_maxedittime = conf.chat.message.maxedittime * 60 * 1000;

    // default
    res.locals.meta = false;
    res.locals.avoidFa = false;

    // language
    // @todo dbr: hotfix to workaround fr_FR or fr-FR, force 'en' or 'fr'
    //        see https://github.com/smhg/express-locale in remplacement
    var short = 'fr';
    if (/en/i.test(req.locale)) {
      short = 'en';
    }
    res.locals.locale = short;
    res.locals.locale_iso = (req.locale === 'fr')
      ? 'fr_FR'
      : 'en_US';

    // outside page scripts
    res.locals.script = (process.env.NODE_ENV !== 'development')
      ? '/build/outside-' + req.locale + '.js'
      : '/outside-' + req.locale + '.js';

    next();
  };
};
