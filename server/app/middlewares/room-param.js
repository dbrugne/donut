var Room = require('../models/room');

module.exports = function(req, res, next, roomname) {
  if (roomname == undefined || roomname == '') {
    res.render('404', {}, function(err, html) {
      res.send(404, html);
    });
  }

  Room.findByName('#'+roomname)
    .populate('owner')
    .exec(function(err, room) {
      if (err) {
        req.flash('error', err)
        return res.redirect('/');
      }

      if (room) {
        req.room = room;
        next();
      } else {
        res.render('404', {}, function(err, html) {
          res.send(404, html);
        });
      }

    });
}
