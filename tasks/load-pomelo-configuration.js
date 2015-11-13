var getConfiguration = require('../shared/util/pomelo-configuration');

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-extend-config');

  grunt.registerTask('load-pomelo-configuration', function () {
    var configuration = getConfiguration();
    grunt.config('pomelo', configuration);
  });
};
