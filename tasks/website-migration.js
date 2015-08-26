var async = require('async');
var _ = require('underscore');
var RoomModel = require('../shared/models/room');
var UserModel = require('../shared/models/user');
var linkify = require('@dbrugne/donut-common').getLinkify();

module.exports = function(grunt) {

  grunt.registerTask('website-migration', 'Replace old website attribute with new one', function() {
    var done = this.async();
    grunt.log.ok('starting');

    var start = Date.now();
    var count = {
      room: { found: 0, updated: 0 },
      user: { found: 0, updated: 0 }
    };

    var linkifyIterator = function(m, fn) {
      var type = (m.name)
        ? 'room'
        : 'user';
      var identifier = (m.name)
        ? m.name
        : '@' + m.username;

      count[type].found ++;

      if (_.isObject(m.website) && m.website.href && m.website.title) {
        grunt.log.ok('[' +identifier + '] already linkified');
        return fn(null);
      }

      var website = null;
      if (!_.isString(m.website)) {
        grunt.log.warn('[' +identifier + '] invalid website value', m.website);
      } else {

        var link = linkify.find(m.website);
        if (!link || !link[0]) {
          grunt.log.warn('[' +identifier + '] unable to linkify this string', m.website);
        } else if (link[0].type !== 'url') {
          grunt.log.warn('[' +identifier + '] bad URL type found', m.website, link[0]);
        } else {
          website = {
            title: link[0].value,
            href: link[0].href
          };
          grunt.log.ok('[' +identifier + '] updating with:', website);
        }
      }

      var update = (website)
        ? { $set: { website: website } }
        : { $unset: { website: true } };
      m.update(update).exec(function(err) {
        if (err)
          return callback(err);
        count[type].updated ++;
        fn();
      });

    };

    async.series([

      /**
       * First step, remove all empty .website
       */
      function cleanup(callback) {
        RoomModel.update({ website: { $exists: true, $eq: '' }}, { $unset: { website: true } }, {multi: true}, function(err, num) {
          if (err)
            return callback(err);

          grunt.log.ok('removed ' + num.n + ' empty website fields on rooms');
          UserModel.update({ website: { $exists: true, $eq: '' }}, { $unset: { website: true } }, {multi: true}, function(err, num) {
            if (err)
              return callback(err);

            grunt.log.ok('removed ' + num.n + 'empty website fields on users');
            return callback(null);
          });
        });
      },

      /**
       * Next, retrieve and run iterator on every rooms
       */
      function rooms(callback) {
        RoomModel.find({ website: { $exists: true }}, 'name website', function(err, models) {
          if (err)
            return callback(err);

          async.each(models, linkifyIterator, callback);
        });
      },

      /**
       * Finally, retrieve and run iterator on every users
       */
      function users(callback) {
        UserModel.find({ website: { $exists: true }}, 'username website', function(err, models) {
         if (err)
          return callback(err);

          async.each(models, linkifyIterator, callback);
        });
      }

    ], function(err) {
      if (err) {
        grunt.log.error(err + ' ');
        return done();
      }

      var duration = Date.now() - start;
      grunt.log.ok('Successfully done (' + count.room.found + ' rooms found and ' + count.room.updated + ' updated ; '
        + count.user.found +  ' users found and ' + count.user.updated + ' updated, in ' + duration + 'ms)');
      done();
    });

  });

}
