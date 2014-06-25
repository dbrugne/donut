var express = require('express');
var router = express.Router();

var paramHandler = require('../app/middlewares/user-param');
router.param('user', paramHandler);

router.get('/user/:user', function(req, res) {
    res.render('user_profile', {
      requestedUser: req.requestedUser,
      avatarUrl: req.requestedUser.avatarUrl('large'),
      scripts: [
        {src: '/javascripts/plugins/jquery.linkify.min.js'}
      ]
    });
});

module.exports = router;