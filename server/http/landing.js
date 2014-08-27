var express = require('express');
var router  = express.Router();
var Room    = require('../app/models/room');

router.get('/', function(req, res) {
  var logged = (req.isAuthenticated())
    ? true
    : false;

  return res.render('landing', {
    layout: 'layout-landing',
    logged: logged
  });
});

module.exports = router;