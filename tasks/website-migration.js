var async = require('async');
var _ = require('underscore');
var RoomModel = require('../shared/models/room');
var UserModel = require('../shared/models/user');
var common = require('@dbrugne/donut-common');

module.exports = function(grunt) {

  grunt.registerTask('website-migration', 'Replace old website attribute with new one', function() {
    var done = this.async();
    grunt.log.ok('starting');

    var start = Date.now();
    var countRoom = { found: 0, updated: 0 };
    var countUser = { found: 0, updated: 0 };

    async.series([

      function rooms(callback) {
        RoomModel.find({}, 'name website', function(err, roomModels) {
          if (err)
            return callback(err);
          async.each(roomModels, function(m, fn) {
            countRoom.found ++;
            var update = '';

            if (m.website == undefined || _.isObject(m.website) && m.website.href && m.website.title)
              return grunt.log.ok('room: name[' + m.name + '] website[undefined] or already Linkify');

            if ((_.isObject(m.website) && (!m.website.href || !m.website.title)) || m.website === '') {
              grunt.log.error('room: name[' + m.name + '] website[empty object] or website[empty]');
              update = {$unset: {website: true}};
            } else {
              var link = common.getLinkify().find(m.website);
              if (!link || !link[0]) {
                grunt.log.error('room: name[' + m.name + '] website[' + m.website + '] => error Linkify');
                update = {$unset: {website: true}};
              } else {
                var website = {
                  href: link[0].href,
                  title: link[0].value
                }
                update = {$set: {website: website}};
              }
            }

            m.update(update).exec(function(err) {
              if (err)
                return callback(err);
            });
            (website)
              ? grunt.log.ok('room: name[' + m.name + '] href[' + website.href + '] title[' + website.title + '] => update Linkify ok')
              : grunt.log.ok('room: name[' + m.name + '] website[' + m.website + '] => delete');
            countRoom.updated ++;
          });
          return callback(null);
        });
      },

      function users(callback) {
        UserModel.find({}, 'username website', function(err, userModels) {
         if (err)
          return callback(err);
         async.each(userModels, function(m, fn) {
           countUser.found ++;
           var update = '';

           if (m.website == undefined || _.isObject(m.website) && m.website.href && m.website.title)
            return grunt.log.ok('user: username[' + m.username + '] website[undefined] or already Linkify');

           if ((_.isObject(m.website) && (!m.website.href || !m.website.title)) || m.website === '') {
             grunt.log.error('user: username[' + m.username + '] website[empty object] or website[empty]');
             update = {$unset: {website: true}};
           } else {
             var link = common.getLinkify().find(m.website);
             if (!link || !link[0]) {
               grunt.log.error('user: username[' + m.username + '] website[' + m.website + '] => error Linkify');
               update = {$unset: {website: true}};
             } else {
               var website = {
                 href: link[0].href,
                 title: link[0].value
               }
               update = {$set: {website: website}};
             }
           }

           m.update(update).exec(function(err) {
             if (err)
              return callback(err);
           });
           (website)
             ? grunt.log.ok('user: username[' + m.username + '] href[' + website.href + '] title[' + website.title + '] => update Linkify ok')
             : grunt.log.ok('user: username[' + m.username + '] website[' + m.website + '] => delete');
           countUser.updated ++;
         });
         return callback(null);
        });
      }

    ], function(err) {
      if (err) {
        grunt.log.error(err+' ');
        done();
      } else {
        var duration = Date.now() - start;
        grunt.log.ok('Successfully done (Rooms('+countRoom.found+ ' found and ' + countRoom.updated +' updated) and Users('+countUser.found+ ' found and ' + countUser.updated +' updated) in '+duration+'ms)');
        done();
      }
    });

  });

}
