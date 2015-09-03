var async = require('async');
var _ = require('underscore');
var path = require('path');
var fs = require('fs');

module.exports = function (grunt) {
  grunt.loadNpmTasks("grunt-extend-config");
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jst');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // locales
  grunt.registerTask('i18next', function() {
    var locales = {};
    var localesPath = './locales';
    var languages = fs.readdirSync(localesPath);
    _.each(languages, function (l) {
      locales[l] = {};
      var namespaces = fs.readdirSync(path.join(localesPath, l));
      _.each(namespaces, function(_ns) {
        var ns = _ns.replace('.json', '');
        var json = JSON.parse(fs.readFileSync(path.join(localesPath, l, _ns)));
        locales[l][ns] = json;
      });
    });
    locales = _.omit(locales, ['404', 'title', 'meta', 'email']);
    // var content = 'module.exports = ' + JSON.stringify(locales) + ';';
    fs.writeFileSync('./web-server/public/web/locales.json', JSON.stringify(locales), { flag: 'w+' });
  });

  // templates
  grunt.extendConfig({
    jst: {
      compile: {
        options: {
          processName: function (filename) {
            return filename.replace('web-server/public/donut/templates/', '');
          }
        },
        files: {
          'web-server/public/web/_templates.js': [
            'web-server/public/donut/templates/**/*.html'
          ]
        }
      }
    }
  });
  grunt.registerTask('jst-commonjs-wrapper', function () {
    var content = 'var _ = require(\'underscore\');\n';
    content += 'module.exports = function() {\n';
    content += fs.readFileSync('web-server/public/web/_templates.js');
    content += 'return this["JST"]; };\n';
    fs.writeFileSync('web-server/public/web/_templates.js', content, { flag: 'w+' });
  });

  // browserify
  grunt.extendConfig({
    browserify: {
      donut: {
        src: ['web-server/public/web/index.js'],
        dest: 'web-server/public/web/_build.js',
        options: {}
      }
    }
  });

  // concat
  grunt.extendConfig({
    concat: {
      donut: {
        src: [
          'web-server/public/web/_build.js'
        ],
        dest: 'web-server/public/web/bundle.js'
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
          'web-server/public/build.js': ['web-server/public/web/bundle.js']
        }
      }
    }
  });

  // chrono
  grunt.registerTask('chrono-start', function () {
    grunt.config.chronoStart = grunt.config.chronoLast = Date.now();
  });
  grunt.registerTask('chrono-interval', function () {
    var duration = Date.now() - grunt.config.chronoLast;
    grunt.log.ok('last step done in ' + duration + 'ms');
    grunt.config.chronoLast = Date.now();
  });
  grunt.registerTask('chrono-end', function () {
    var duration = Date.now() - grunt.config.chronoStart;
    var stats = fs.statSync('web-server/public/web/bundle.js')
    grunt.log.ok('built in ' + duration + 'ms, size: ' + stats['size']/1024 + 'ko');
  });

  grunt.registerTask('build', 'Build Web client', [
    'chrono-start',
    'jst',
    'jst-commonjs-wrapper',
    'chrono-interval',
    'i18next',
    'chrono-interval',
    'browserify:donut',
    'chrono-interval',
    'concat:donut',
    'chrono-interval',
    //'uglify:donut',
    //'chrono-interval',
    'chrono-end'
  ]);
};
