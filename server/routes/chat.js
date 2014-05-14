var express = require('express');
var router = express.Router();

router.get('/!', function(req, res) {

  // Is user authenticated
  // @todo : guest support
  if (!req.isAuthenticated()) {
    req.flash('warning', 'You should be authenticated to access chat.');
    return res.redirect('/');
  }

  // Has user a username
  if (!req.user.username) {
    return res.redirect('/choose-username');
  }

  // ... otherwise open chat
  return res.render('chat', {
    layout: 'chat_layout'
  });

});

module.exports = router;