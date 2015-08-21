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
    var count = { found: 0, updated: 0 };

    async.series([

      function rooms(callback) {
        RoomModel.find({}, 'name website', function(err, roomModels) {
          if (err)
            return callback(err);
          _.each(roomModels, function(m) {

            if (_.isObject(m.website) && !m.website.href && !m.website.title) {
              grunt.log.error('room: name[' + m.name + '] website[empty object]');
              m.update({website: m.website}, {$unset: {website: {}}}).exec(function(err){
                if (err)
                  return callback(err);
                grunt.log.ok('room: name[' + m.name + '] delete website empty object');
              });
              return;
            }

            if (m.website == undefined) {
              grunt.log.ok('room: name[' + m.name + '] website[undefined]');
              return;
            }

            if (m.website === '') {
              m.update({website: m.website}, {$unset: {website:''}}).exec(function(err){
                if (err)
                  return callback(err);
                grunt.log.ok('room: name[' + m.name + '] website empty unset');
              });
              return;
            }

            if (m.website && _.isObject(m.website)) {
              grunt.log.ok('room: name[' + m.name + '] website[' + m.website.title + '] => already Linkify');
              return;
            }

            var link = common.getLinkify().find(m.website);
            if (!link || !link[0]){
              grunt.log.error('Linkify error => room: name[' + m.name + '] website[' + m.website + '] error url');
              return;
            }

            var website = {
              href: link[0].href,
              title: link[0].value
            }

            m.update({$set: {website: website}}).exec(function(err){
              if (err)
                return callback(err);
              grunt.log.ok('Linkify ok => room: name[' + m.name + '] website[' + link[0].value + ']');
            });

          });
        });
        //return callback(null);
      },

      function users(callback) {
        UserModel.find({}, "website", function(err, userModels) {
          if (err)
            return callback(err);
          _.each(userModels, function(m) {
            if (m.website)
              grunt.log.ok('user:' + m.website);
          });
        });
        return callback(null);
      }

    ], function(err) {
      if (err) {
        grunt.log.error(err+' ');
        done();
      } else {
        var duration = Date.now() - start;
        grunt.log.ok('Successfully done ('+count.found+' found and ' + count.updated + ' updated in '+duration+'ms)');
        done();
      }
    });

  });

}
