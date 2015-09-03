var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-extend-config');
  grunt.loadNpmTasks('grunt-contrib-copy');

  // .js migration
  var fromPath = './web-server/public/donut';
  var toPath = './web-server/public/web';
  var exclude = [
    'index.js',
    'templates.js',
    'translations.js',
    'templates'
  ];
  var npms = [
    'backbone',
    'underscore',
    'debug',
    'jquery',
    'i18next-client',
    'moment',
    'moment-fr',
    'desktop-notify',
    'html.sortable',
    'common'
  ];
  var scanDir = function (path) {
    var base = (path + '/').replace(fromPath, '');
    var relativeFromPath = fromPath + base;

    grunt.log.ok('scanning folder ' + relativeFromPath);

    _.each(fs.readdirSync(relativeFromPath), function (f) {
      if (f.substr(0, 1) === '.')
        return;
      if (exclude.indexOf(f) !== -1) {
        grunt.log.ok('ignore ' + relativeFromPath + f);
        return;
      }

      var file = relativeFromPath + f;

      var s = fs.statSync(file);
      if (s.isFile())
        convertFile(file, toPath + base + f);
      else if (s.isDirectory())
        scanDir(file);
      else
        grunt.log.error('unable to find ' + file + ' type');
    });
  };
  var convertFile = function (from, to) {
    grunt.log.ok('convert file ' + from + ' to ' + to);
    var content = fs.readFileSync(from, {encoding: 'UTF-8'});
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // Windows line returns
    var splitFile = /define\(\[([^\]]+)]\s*,\s*function\s*\(([^\)]+)\)\s*\{((.|\n)*)}\);/gi; // in local context to avoid reuse of RegExp object on each .exec() call
    var parts = splitFile.exec(content);

    if (!parts) {
      grunt.log.error('unable to parse file ' + from);
      return;
    }

    // deps list
    var depsString = parts[1].replace(/\s/g, '').replace(/("|')/g, '');
    var deps = [];
    _.each(depsString.split(','), function (dep) {
      deps.push(dep);
    });

    // names list
    var namesString = parts[2].replace(/\s/g, '').replace(/("|')/g, '');
    var names = [];
    _.each(namesString.split(','), function (name) {
      names.push(name);
    });

    // merge names and deps
    var requires = {};
    _.each(deps, function (dep, index) {
      requires[dep] = (names[index]) ? names[index] : false;
    });

    // body
    var body = parts[3].replace(/^  /mg, ''); // ident
    body = body.replace(/^\s+|\s+$/g, ''); // white space
    var returnString = body.substr(body.lastIndexOf('return'));
    body = body.substr(0, body.lastIndexOf('return'));
    body += '\n' + returnString.replace('return ', 'module.exports = '); // return => module.exports

    if (deps.length !== names.length) {
      return grunt.log.error('not the same number of deps and names');
    }

    // new file content
    var source = '';

    var base = path.dirname(from).replace(fromPath, '').replace(/^\//, '');
    var isDeep = (fromPath !== path.dirname(from))
      ? true
      : false;

    _.each(requires, function (name, dep) {
      var depBase = (dep.indexOf('/') !== -1)
        ? dep.substr(0, dep.indexOf('/'))
        : '';

      var key;
      if (npms.indexOf(dep) !== -1) {
        key = dep;
      } else if (depBase === base) {
        key = './' + dep.replace(depBase + '/', '');
      } else {
        key = (isDeep)
          ? '../' + dep
          : './' + dep;
      }

      if (key === '../_templates') {
        source += 'var ' + name + " = require('../_templates')();\n";
        return;
      }
      if (key === 'common') {
        key = '@dbrugne/donut-common';
      }
      if (key === './pomelo') {
        key = './libs/pomelo';
      }
      if (key === '../socket.io') {
        key = 'socket.io-client';
      }

      source += 'var ' + name + " = require('" + key + "');\n";
    });
    source += '\n';
    source += body;

    // check folder existence
    if (!fs.existsSync(path.dirname(to)))
      fs.mkdirSync(path.dirname(to));

    fs.writeFileSync(to, source, {flag: 'w+'});
  };

  // template (copy)
  grunt.extendConfig({
    copy: {
      templates: {
        files: [
          {
            expand: true,
            cwd: './web-server/public/donut/templates',
            src: ['*.html', '**/*.html'],
            dest: './web-server/public/web/templates'
          }
        ]
      }
    }
  });

  grunt.registerTask('browserify-migration', 'Replace old mention markup with new one', function () {
    grunt.log.ok('starting');
    scanDir(fromPath);
    grunt.task.run('copy:templates');
  });

}
