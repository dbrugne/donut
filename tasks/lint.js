var semistandardFormat = require('semistandard-format');

module.exports = function (grunt) {
  grunt.registerTask('donut-lint', function () {
    var done = this.async();

    var count = 0;

    var lint = function (path) {
      grunt.file.recurse(path, function (abspath) {
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

    lint('/www/donut/');

    done();
  });
};
