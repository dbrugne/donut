var async = require('async');
var _ = require('underscore');
var fs = require('fs');

module.exports = function(grunt) {

  var tmp = './mongotmp';

  grunt.loadNpmTasks("grunt-extend-config");

  grunt.loadNpmTasks('grunt-prompt');
  grunt.extendConfig({
    prompt: {
      confirmation: {
        options: {
          questions: [{
            config: 'confirmation',
            type: 'confirm',
            message: 'Are you sure, YOU WILL OVERRIDE YOUR LOCAL DATABASE TOTALLY?',
            default: true
          }]
        }
      }
    }
  });

  grunt.registerTask('check-confirmation', function() {
    var confirmation = grunt.config('confirmation');
    if (confirmation !== true)
      grunt.fail.fatal('Operation aborted by user');
  });
  grunt.registerTask('donut-tmp-mkdir', function() {
    grunt.file.mkdir(tmp);
  });
  grunt.registerTask('donut-tmp-rmdir', function() {
    grunt.file.delete(tmp);
  });

  grunt.loadNpmTasks('grunt-ssh');
  grunt.extendConfig({
    sftp: {
      lastbackup: {
        files: {
          // local dest : remote src
          'last.tar.gz': 'last.tar.gz'
        },
        options: {
          path: '/opt/mongodb/backups/',
          destBasePath: tmp,
          host: '5.196.206.60',
          username: 'damien',
          privateKey: grunt.file.read(process.env.HOME+'/.ssh/id_rsa'),
          showProgress: true,
          mode: 'download'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-untar');
  var untarConfig = {
    untar: {
      donut: {
        files: {
        }
      }
    }
  };
  untarConfig.untar.donut.files[tmp] = tmp+'/last.tar.gz';
  grunt.extendConfig(untarConfig);

  grunt.registerTask('donut-find-last-folder', function() {
    var last = null;
    var pattern = new RegExp("[0-9]{8}-[0-9]{6}");
    var files = fs.readdirSync(tmp)
    _.each(files, function(file) {
      if (fs.lstatSync(tmp).isDirectory(file) && pattern.test(file) && fs.lstatSync(tmp+'/'+file).isDirectory('donut'))
        last = tmp+'/'+file+'/donut';
    });

    if (!last)
      grunt.fail.fatal('Unable to find a valid database dump in '+tmp);

    grunt.log.ok('Last backup found: '+last);
    fs.renameSync(last, tmp+'/last');
    grunt.log.ok('Renamed to '+tmp+'/last');
  });

  grunt.loadNpmTasks('grunt-mongo-backup');
  grunt.extendConfig({
    mongobackup: {
      options: {
        db : 'donut',
        restore: {
          path : tmp+'/last',
          drop : true
        }
      }
    }
  });

  grunt.registerTask("donut-pull-database", "Retrieve last production database backup and replace local one",[
    'prompt:confirmation',
    'check-confirmation',
    'donut-tmp-mkdir',
    'sftp:lastbackup',
    'untar:donut',
    'donut-find-last-folder',
    'mongobackup:restore',
    'donut-tmp-rmdir'
  ]);
};