var express = require('express');
var router  = express.Router();
var Room    = require('../app/models/room');

router.get('/', function(req, res) {
  if (!req.isAuthenticated()) {
    return res.render('index', {});
  }

  // If authenticated go to chat directly
  return res.redirect('/!');
});

module.exports = router;