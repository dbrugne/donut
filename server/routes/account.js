var express = require('express');
var router = express.Router();
var isLoggedIn = require('../app/isloggedin');

router.get('/account', isLoggedIn, function(req, res) {
  res.render('account', { avatarUrl: req.user.avatarUrl('medium') });
});

module.exports = router;