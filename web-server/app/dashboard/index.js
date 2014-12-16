var debug = require('debug')('donut:web:admin');
var express = require('express');
var router = express.Router();

router.get('/dashboard', function(req, res) {

  // Is user authenticated
  if (!req.isAuthenticated() || req.user.admin !== true) {
    debug('Someone tried to access /dashboard without being authenticated as admin user');
    return res.redirect('/');
  }

  return res.render('dashboard', {
    layout: false,
    meta: "DONUT dashboard"
  });

});

module.exports = router;