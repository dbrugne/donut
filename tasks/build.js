var fs = require('fs');

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-extend-config');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // browserify
  grunt.extendConfig({
    browserify: {
      donut: {
        src: ['web-server/public/web/web.js'],
        dest: 'web-server/public/build/bundle.js',
        options: {
          transform: [
            require('../shared/util/browserifyJst'),
            require('../shared/util/browserifyI18next')
          ]
        }
      }
    }
  });

  // uglify
  grunt.extendConfig({
    uglify: {
      donut: {
        options: {
          sourceMap: false
        },
        files: {
          'web-server/public/build/bundle.js': ['web-server/public/build/bundle.js']
        }
      }
    }
  });
  grunt.registerTask('bundle:uglify', function () {
    if (grunt.option('uglify') === true) {
      grunt.task.run('uglify:donut');
    }
  });

  // chrono
  grunt.registerTask('chrono-start', function () {
    grunt.config.chronoStart = grunt.config.chronoLast = Date.now();
  });
  function interval () {
    var duration = Date.now() - grunt.config.chronoLast;
    grunt.log.ok('last step done in ' + duration + 'ms');
    grunt.config.chronoLast = Date.now();
  }
  grunt.registerTask('chrono-interval', function () {
    interval();
  });
  grunt.registerTask('chrono-end', function () {
    interval();
    var duration = Date.now() - grunt.config.chronoStart;
    var stats = fs.statSync('web-server/public/build/bundle.js');
    grunt.log.ok('web-server/public/build/bundle.js built in ' +
      duration +
      'ms, size: ' + Math.floor(stats['size'] / 1024) + 'ko');

    // parts analysis
    // var _ = require('underscore');
    // var path = require('path');
    // var string = fs.readFileSync('web-server/public/build/bundle.js', {encoding: 'UTF-8'});
    // var parts = string.split('[function(require,module,exports){');
    // _.each(parts, function (p) {
    //   if (p.length <= 1024 * 30) {
    //     return;
    //   }
    //   grunt.log.ok('p is ' + Math.floor(p.length / 1024) + ' ko');
    //   grunt.log.ok(p.substr(0, 100).replace('\n', ''));
    // });
  });

  grunt.registerTask('build', 'Build Web client', [
    'chrono-start',
    'browserify:donut',
    'chrono-interval',
    'bundle:uglify',
    'chrono-end'
  ]);
};
