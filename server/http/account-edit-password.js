var express = require('express');
var router = express.Router();
var isLoggedIn = require('../app/middlewares/isloggedin');
var i18next = require('../app/i18next');
var emailer = require('../app/emailer');

router.route('/account/edit/password')
    .get(isLoggedIn, function(req, res) {
        res.render('account_edit_password', {
          layout: 'layout-form',
          partials: {head: '_head', foot: '_foot'},
          meta: {title: i18next.t("title.default")}
        });
    })
    .post([isLoggedIn, function(req, res, next) {
        req.checkBody(['user','fields','password'], i18next.t("account.password.error.confirm")).equals(req.body.user.fields.confirm);
        req.checkBody(['user','fields','password'], i18next.t("account.password.error.length")).isLength(6, 50);
        if (req.validationErrors()) {
            return res.render('account_edit_password', {
              layout: 'layout-form',
              partials: {head: '_head', foot: '_foot'},
              meta: {title: i18next.t("title.default")},
              userFields: req.body.user.fields,
              is_errors: true,
              errors: req.validationErrors()
            });
        }
        return next();
    }], function(req, res) {
        req.user.local.password = req.user.generateHash(req.body.user.fields.password);
        req.user.save(function(err) {
            if (err) {
                req.flash('error', err)
                return res.redirect('/');
            } else {
              emailer.passwordChanged(req.user.local.email, req.get('host'), function(err) {
                if (err)
                  return console.log('Unable to sent password changed email: '+err);
              });

              req.flash('success', i18next.t("account.password.success"));
              res.redirect('/account/edit/password');
            }
        });
    });

module.exports = router;