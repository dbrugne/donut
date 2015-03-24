var express = require('express');
var router = express.Router();
var User = require('../../../shared/models/user');
var isLoggedIn = require('../middlewares/isloggedin');
var i18next = require('../../../shared/util/i18next');
var emailer = require('../../../shared/io/emailer');

var validateInput = function(req, res, next) {
  req.checkBody(['user','fields','email'], i18next.t("account.email.error.format")).isEmail();
  if (req.validationErrors()) {
    return res.render('account_edit_email', {
      layout: 'layout-form',
      partials: {head: '_head', foot: '_foot'},
      meta: {title: i18next.t("title.default")},
      userFields: req.body.user.fields,
      is_errors: true,
      errors: req.validationErrors(),
      token: req.csrfToken()
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
        partials: {head: '_head', foot: '_foot'},
        meta: {title: i18next.t("title.default")},
        userFields: req.body.user.fields,
        error: i18next.t("account.email.error.alreadyexists")
      });
    }

    return next();
  });
};

router.route('/account/edit/email')
    .get([require('csurf')(), isLoggedIn], function(req, res) {
        var userFields = {email: req.user.local.email}
        res.render('account_edit_email', {
          layout: 'layout-form',
          partials: {head: '_head', foot: '_foot'},
          meta: {title: i18next.t("title.default")},
          userFields: userFields,
          token: req.csrfToken()
        });
    })
    .post([
        require('csurf')(),
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
              emailer.emailChanged(req.user.local.email, function(err) {
                if (err)
                  return console.log('Unable to sent email changed email: '+err);
              });

              req.flash('success', i18next.t("account.email.success"));
              res.redirect('/account/edit/email');
            }
        });
    });

module.exports = router;