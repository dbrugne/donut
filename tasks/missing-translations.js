var _ = require('underscore');

module.exports = function (grunt) {
  grunt.registerTask('donut-missing-translations', function () {
    var en = require('../locales/en/translation');
    var fr = require('../locales/fr/translation');

    var analyseTree = function (subject, compare, label) {
      var processNode = function (element, key) {
        if (_.isObject(element) && !_.isArray(element)) {
          return _.each(element, function (_element, _key, _list) {
            var path = (key)
              ? key + '.' + _key
              : _key; // root
            processNode(_element, path);
          });
        }

        if (!key) {
          return;
        } // root

        // Missing array special case
        var pattern = /(\.[0-9]+$)/;
        if (pattern.test(key)) {
          key = key.replace(pattern, '');
        }

        var steps = key.split('.');
        steps.unshift(compare);
        if (!checkNested.apply(this, steps)) {
          grunt.log.error('Missing key in ' + label + ': ' + key);
        }
      };

      // @source:
      // http://stackoverflow.com/questions/2631001/javascript-test-for-existence-of-nested-object-key
      function checkNested (obj) {
        var args = Array.prototype.slice.call(arguments, 1);

        for (var i = 0; i < args.length; i++) {
          var key = args[ i ];

          if (!obj || !obj.hasOwnProperty(key)) {
            return false;
          }

          obj = obj[ key ];
        }
        return true;
      }

      // run it
      processNode(subject);
    };

    analyseTree(fr, en, 'EN');
    analyseTree(en, fr, 'FR');
  });
};
