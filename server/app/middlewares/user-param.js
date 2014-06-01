var User = require('../models/user');

module.exports = function(req, res, next, username) {
  if (username == undefined || username == '') {
    res.render('404', {}, function(err, html) {
      res.send(404, html);
    });
  }

  User.findOne({ 'username': username }, function(err, user) {
    if (err) {
      req.flash('error', err)
      return res.redirect('/');
    }

    if (user) {
      req.requestedUser = user;
      next();
    } else {
      res.render('404', {}, function(err, html) {
        res.send(404, html);
      });
    }

  });
}