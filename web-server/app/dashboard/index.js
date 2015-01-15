var debug = require('debug')('donut:web:admin');
var express = require('express');
var router = express.Router();
var async = require('async');
var _ = require('underscore');
var User = require('../../../shared/models/user');

var isAdmin = function(req, res, next) {
  if (!req.isAuthenticated() || req.user.admin !== true) {
    debug('Someone tried to access /dashboard without being authenticated as admin user');
    return res.redirect('/');
  }
  next();
};

router.get('/dashboard', isAdmin, function(req, res) {
    return res.render('dashboard', {
    layout: false,
    meta: "DONUT dashboard"
  });
});

router.get('/dashboard/users-list', isAdmin, function(req, res) {
  async.waterfall([

    function retrieve(callback) {
      User.find({}).sort({_id: 'asc'}).exec(callback);
    },

    function prepare(users, callback) {
      if (!users || users.length < 1)
        return callback('No user to list in current database');

      var csv = '"id";"username";"name";"email";"facebook";"created time";"last time online"';
      _.each(users, function(u) {
        var cols = [];

        // simple
        cols.push(u._id.toString());
        cols.push(u.username);

        // name
        if (u.name)
          cols.push(u.name);
        else if (u.facebook && u.facebook.name)
          cols.push(u.facebook.name);
        else
          cols.push('N/A');

        // email
        if (u.local.email)
          cols.push(u.local.email);
        else if (u.facebook && u.facebook.email)
          cols.push(u.facebook.email);
        else
          cols.push('N/A');

        // is Facebook?
        if (u.facebook && u.facebook.token)
          cols.push('yes');
        else
          cols.push('no');

        // dates
        var d;
        d = new Date(u.created_at);
        cols.push(d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear());
        if (u.lastonline_at) {
          d = new Date(u.lastonline_at);
          cols.push(d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear());
        } else {
          cols.push('never');
        }

        var line = '"'+cols.join('";"')+'"';
        csv += '\r\n'+line;
      });

      return callback(null, csv);
    }

  ], function(err, csv) {
    if (err)
      return res.send('Error while generating users CSV: '+err);

    var d = new Date();
    var date = ''+d.getFullYear()+('0'+(d.getMonth()+1)).substr(-2, 2)+('0'+(d.getDate())).substr(-2, 2)+d.getHours()+d.getMinutes()+d.getSeconds()+d.getMilliseconds();
    var filename = 'users-list-'+date+'.csv';
    res.attachment(filename);
    res.send(csv);
  });

});

module.exports = router;