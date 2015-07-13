var async = require('async');
var _ = require('underscore');
var path = require('path');

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-extend-config');

  grunt.registerTask('load-pomelo-configuration', function() {
    var env = process.env.NODE_ENV || 'development';
    var basePath = path.join(__dirname, '..', 'game-server/config');
    var configuration = {};

    // master config
    var masterConfig = require(basePath + '/master');
    configuration.master = masterConfig[env];

    // admin config
    configuration.adminUser = require(basePath + '/adminUser');

    grunt.config('pomelo', configuration);
  });
};