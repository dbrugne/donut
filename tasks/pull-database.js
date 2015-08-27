var async = require('async');
var _ = require('underscore');
var fs = require('fs');

module.exports = function(grunt) {

  var tmp = './mongotmp';
  var last = null;
  var pattern = new RegExp("[0-9]{8}-[0-9]{6}");

  grunt.loadNpmTasks("grunt-extend-config");

  /*****************************************************************************************************************
   *
   * grunt-prompt
   *
   *****************************************************************************************************************/
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
      },
      confirmationuselast: {
        options: {
          questions: [{
            config: 'confirmationuselast',
            type: 'confirm',
            message: 'Backup already exists do you want use?',
            default: true
          }]
        }
      },
      confirmationrmdir: {
        options: {
          questions: [{
            config: 'confirmationrmdir',
            type: 'confirm',
            message: 'Are you sure, you remove the directory ' + tmp,
            default: false
          }]
        }
      }
    }
  });

  /*****************************************************************************************************************
   *
   * registerTask Check-*
   *
   *****************************************************************************************************************/
  grunt.registerTask('check-confirmation', function() {
    var confirmation = grunt.config('confirmation');
    if (confirmation !== true)
      grunt.fail.fatal('Operation aborted by user');
  });
  grunt.registerTask('check-confirmation-uselast', function() {
    var confirmation = grunt.config('confirmationuselast');
    if (confirmation !== true) {
      grunt.task.run('sftp:lastbackup');
      grunt.task.run('untar:donut');
    }
  });
  grunt.registerTask('check-confirmation-rmdir', function() {
    var confirmation = grunt.config('confirmationrmdir');
    if (confirmation)
      grunt.task.run('donut-tmp-rmdir');
    else
      grunt.log.ok('the directory ' + tmp + ' was not deleted');
  });
  grunt.registerTask('check-last-exists', function() {
    var files = fs.readdirSync(tmp);
    var islast = false;
    _.each(files, function(file) {
      if (fs.lstatSync(tmp).isDirectory(file) && pattern.test(file) && fs.lstatSync(tmp+'/'+file).isDirectory('donut'))
        islast = true;
    });
    if (islast) {
      grunt.task.run('prompt:confirmationuselast');
      grunt.task.run('check-confirmation-uselast');
    }
    else {
      grunt.task.run('sftp:lastbackup');
      grunt.task.run('untar:donut');
    }
  });

  /*****************************************************************************************************************
   *
   * registerTask Directory
   *
   *****************************************************************************************************************/
  grunt.registerTask('donut-tmp-mkdir', function() {
    grunt.file.mkdir(tmp);
  });
  grunt.registerTask('donut-tmp-rmdir', function() {
    var options = { force: true };
    grunt.file.delete(tmp, options);
    grunt.log.ok('the directory ' + tmp + ' has been deleted');
  });
  grunt.registerTask('donut-tmp-rmtar', function() {
    if (grunt.file.exists(tmp + '/last.tar.gz'))
      grunt.file.delete(tmp + '/last.tar.gz', {force : true});
  });

  /*****************************************************************************************************************
   *
   * Other
   *
   *****************************************************************************************************************/
  grunt.loadNpmTasks('grunt-ssh');
  var sshKey = (process.env.HOME)
    ? process.env.HOME
    : process.env.USERPROFILE;
  sshKey += '/.ssh/id_rsa';
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
          username: grunt.option('user') || process.env.USER,
          privateKey: grunt.file.read(sshKey),
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

  grunt.registerTask('donut-find-and-restore-last-backup', function() {
    var backup = [];
    var files = fs.readdirSync(tmp);
    _.each(files, function(file) {
      if (fs.lstatSync(tmp).isDirectory(file) && pattern.test(file) && fs.lstatSync(tmp+'/'+file).isDirectory('donut'))
        backup.push(tmp+'/'+file+'/donut');
    });

    grunt.log.ok('mongotmp backup found: [' + backup + ']');
    backup = _.sortBy(backup, 'name').reverse();
    last = backup[0];

    if (!last)
      grunt.fail.fatal('Unable to find a valid database dump in '+tmp);
    grunt.log.ok('Last backup found: '+last);

    grunt.loadNpmTasks('grunt-mongo-backup');
    grunt.extendConfig({
      mongobackup: {
        options: {
          db : 'donut',
          restore: {
            path: last,
            drop : true
          }
        }
      }
    });
    grunt.task.run('mongobackup:restore');
  });


  grunt.registerTask("donut-pull-database", "Retrieve last production database backup and replace local one",[
    'prompt:confirmation',
    'check-confirmation',
    'donut-tmp-mkdir',
    'check-last-exists',
    'donut-tmp-rmtar',
    'donut-find-and-restore-last-backup',
    'prompt:confirmationrmdir',
    'check-confirmation-rmdir'
  ]);
};