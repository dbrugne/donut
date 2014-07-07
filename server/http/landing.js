var express = require('express');
var router  = express.Router();
var Room    = require('../app/models/room');

router.get('/', function(req, res) {
  if (req.isAuthenticated()) {
    // If authenticated go to chat directly
    return res.redirect('/!');
  }

  return res.render('landing', {
    layout: 'l'
  });
});

module.exports = router;