'use strict';
var express = require('express');
var router = express.Router();
var logger = require('pomelo-logger').getLogger('web', __filename);
var i18next = require('../../../shared/util/i18next');
var verifyEmail = require('../../../shared/util/verify-email');
var isMobile = require('ismobilejs');

var verified = function (req, res, next) {
  verifyEmail.validate(req.params.token, function (err) {
    var renderObject = {
      meta: {title: i18next.t('title.default')},
      token: req.csrfToken(),
      user: req.user,
      isIphone: isMobile(req.headers['user-agent'] || 'unknown').apple.phone,
      isAndroid: isMobile(req.headers['user-agent'] || 'unknown').android.phone,
      isWindows: isMobile(req.headers['user-agent'] || 'unknown').windows.phone,
      isMobile: isMobile(req.headers['user-agent'] || 'unknown').phone
    };
    if (err) {
      logger.debug(err);
      renderObject.errors = [{msg: i18next.t('verify.error.' + err)}];
    } else {
      renderObject.success = [{msg: i18next.t('verify.success')}];
    }

    return res.render('mail_verify', renderObject);
  });
};

router.route('/verify/:token')
  .get([require('csurf')(), verified]);

module.exports = router;
