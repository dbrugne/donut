var express = require('express');
var router = express.Router();

router.get('/!', function(req, res) { // @todo : guest handling!
    res.locals.user = req.user;
    return res.render('chat', {
        layout: 'chat_layout'
    });
});

module.exports = router;