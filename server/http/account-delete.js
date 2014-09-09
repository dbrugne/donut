var express = require('express');
var router = express.Router();
var isLoggedIn = require('../app/middlewares/isloggedin');
var cloudinary = require('../app/cloudinary');
var i18next = require('../app/i18next');

router.get('/account/delete', isLoggedIn, function(req, res) {
  var user = req.user;
  var avatarId = user.avatarId();
  user.remove(function(err) {
    if (err) {
      req.flash('error', err)
      return res.redirect('/');
    }

    // asynchronous cloudinary image removing
    if (avatarId) {
      cloudinary.api.delete_resources([avatarId],
        function(result){ console.log(result.deleted); });
    }

    req.logout();
    req.flash('success', i18next.t("account.delete.success"));
    res.redirect('/');
  });
});

module.exports = router;