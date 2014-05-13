var express = require('express');
var router = express.Router();
var isLoggedIn = require('../app/isloggedin');

router.get('/account', isLoggedIn, function(req, res) {
  var avatarUrl = (req.user.avatar)
    ? req.user.avatarUrl('medium')
    : null;
    res.render('account', { avatarUrl: avatarUrl });
});

module.exports = router;