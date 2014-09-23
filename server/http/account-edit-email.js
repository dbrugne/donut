var express = require('express');
var router = express.Router();
var User = require('../app/models/user');
var isLoggedIn = require('../app/middlewares/isloggedin');
var i18next = require('../app/i18next');
var emailer = require('../app/emailer');

var validateInput = function(req, res, next) {
  req.checkBody(['user','fields','email'], i18next.t("account.email.error.format")).isEmail();
  if (req.validationErrors()) {
    return res.render('account_edit_email', {
      layout: 'layout-form',
      partials: {head: '_head'},
      meta: {title: i18next.t("title.default")},
      userFields: req.body.user.fields,
      is_errors: true,
      errors: req.validationErrors(),
      scripts: [{src: '/validator.min.js'}]
    });
  }

  var pattern = req.body.user.fields.email.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var r = new RegExp('^'+pattern+'$', 'i');
  User.findOne({
    $and: [
      {'local.email': {$regex: r}},
      {_id: { $ne: req.user._id }}
    ]
  }, function(err, user) {
    if (err) {
      req.flash('error', 'Error while searching existing email: ' + err);
      return res.redirect('/account/edit/email');
    }

    if (user) {
      return res.render('account_edit_email', {
        layout: 'layout-form',
        partials: {head: '_head'},
        meta: {title: i18next.t("title.default")},
        userFields: req.body.user.fields,
        error: i18next.t("account.email.error.alreadyexists"),
        scripts: [
          {src: '/validator.min.js'}
        ]
      });
    }

    return next();
  });
};

router.route('/account/edit/email')
    .get(isLoggedIn, function(req, res) {
        var userFields = {email: req.user.local.email}
        res.render('account_edit_email', {
          layout: 'layout-form',
          partials: {head: '_head'},
          meta: {title: i18next.t("title.default")},
          userFields: userFields,
          scripts: [{src: '/validator.min.js'}]
        });
    })
    .post([
        isLoggedIn,
        validateInput
    ], function(req, res) {
        var email = req.body.user.fields.email;
        req.user.local.email = email.toLowerCase();
        req.user.save(function(err) {
            if (err) {
                req.flash('error', err)
                return res.redirect('/');
            } else {
              emailer.emailChanged(req.user.local.email, req.get('host'), function(err) {
                if (err)
                  return console.log('Unable to sent email changed email: '+err);
              });

              req.flash('success', i18next.t("account.email.success"));
              res.redirect('/account/edit/email');
            }
        });
    });

module.exports = router;