var express = require('express');
var router = express.Router();

router.get('/!', function(req, res) { // @todo : guest handling!
  if (req.isAuthenticated()) {
    return res.render('chat', {
      layout: 'chat_layout'
    });
  }
  req.flash('warning', 'You should be authenticated to access chat.');
  res.redirect('/');
});

module.exports = router;