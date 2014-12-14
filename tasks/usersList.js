var async = require('async');
var _ = require('underscore');
var User = require('../shared/models/user');
var fs = require('fs');
var childProcess = require('child_process');

module.exports = function(grunt) {

  grunt.registerTask('users-list', function() {
    var done = this.async();

    grunt.log.ok('start');

    async.waterfall([

      function retrieve(callback) {
        User.find({}).sort({_id: 'asc'}).exec(callback);
      },

      function prepare(users, callback) {
        if (!users || users.length < 1)
          return callback('No user to list in current database');

        var csv = '"id","username","name","email","facebook","created time","last time online"';
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
          //grunt.log.writeln('new line: '+line);
        });

        return callback(null, csv);
      },

      function isDir(csv, callback) {
        var dir = './output';
        if (!fs.existsSync(dir))
          fs.mkdirSync(dir);

        return callback(null, csv)
      },

      function write(csv, callback) {
        var filename = './output/users-list.csv';
        fs.writeFileSync(filename, csv);
        return callback(null, filename);
      }

    ], function(err, filename) {
      if (err)
        grunt.log.error(err+' ');
      else
        grunt.log.ok('successfully written: '+filename+' ');
      done();
    });
  });
};