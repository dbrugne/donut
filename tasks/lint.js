var async = require('async');
var _ = require('underscore');
var fs = require('fs');

var semistandardFormat = require('semistandard/node_modules/semistandard-format');

module.exports = function(grunt) {
  grunt.registerTask('donut-lint', function() {
    var done = this.async();

    var count = 0;

    var lint = function (path) {
      grunt.file.recurse(path, function(abspath, rootdir, subdir, filename) {
        if (!grunt.file.isFile(abspath)) {
          return grunt.log.warn('not a file', abspath);
        }

        if (/web-server\/public\/vendor/.test(abspath)) {
          return;// grunt.log.warn('vendor subdir', abspath);
        }
        if (/web-server\/public\/javascripts/.test(abspath)) {
          return;// grunt.log.warn('almost-vendor subdir', abspath);
        }

        if (!/\.js$/.test(abspath)) {
          return;// grunt.log.warn('not a js file', abspath);
        }

        count += 1;
        grunt.log.ok('(' + count + ') linting', abspath);
        var text = grunt.file.read(abspath);
        text = semistandardFormat.transform(text);

        if (!/^'use strict'/.test(text) && !/\.json$/.test(abspath)) {
          text = "'use strict';\n" + text;
        }

        grunt.file.write(abspath, text);
      });
    };

    lint('/www/donut/config');
    lint('/www/donut/shared');
    lint('/www/donut/test');
    //lint('/www/donut/ws-server');
    //lint('/www/donut/web-server');

    done();
  });
};