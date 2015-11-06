'use strict';
var express = require('express');
var router = express.Router();
var _ = require('underscore');
var User = require('../../../shared/models/user');
var logger = require('pomelo-logger').getLogger('web', __filename);
var i18next = require('../../../shared/util/i18next');
var async = require('async');
var jwt = require('jsonwebtoken');
var conf = require('../../../config/');

var verified = function (req, res, next) {
  async.waterfall([
    function (done) {
      var payload;
      try {
        payload = jwt.verify(req.params.token, conf.verify.secret, {});
      } catch (e) {
        logger.error('Error within verify by token code: ' + e.message);
        return done('invalid');
      }
      User.findOne({
        '_id': payload.id,
        'emails.email': payload.email
      }, function (err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done('invalid');
        }
        if (_.findWhere(user.emails, {email: payload.email, confirmed: true})) {
          return done('already-validate');
        }
        User.update(
          {_id: payload.id,
            'emails.email': payload.email},
          {$set: {'emails.$.confirmed': true, confirmed: true}},
          {}
          , function (err) {
            return done(err);
          });
      });
    }

  ], function (err) {
    console.log(req.user);
    if (err) {
      logger.debug(err);
      return res.render('mail_verify', {
        meta: {title: i18next.t('title.default')},
        errors: [{msg: i18next.t('verify.error.' + err)}],
        token: req.csrfToken()
      });
    }
    return res.render('mail_verify', {
      meta: {title: i18next.t('title.default')},
      success: [{msg: i18next.t('verify.success')}],
      token: req.csrfToken()
    });
  });
};

router.route('/verify/:token')
  .get([require('csurf')(), verified]);

module.exports = router;
