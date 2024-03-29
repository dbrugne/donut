/**
 * PM2 ecosystem declaration:
 * https://github.com/Unitech/PM2/blob/master/ADVANCED_README.md#json-app-declaration
 * PM2 deploy configuration:
 * https://github.com/Unitech/PM2/blob/master/ADVANCED_README.md#deployment-pm2--090
 */
module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-extend-config');
  grunt.loadNpmTasks('grunt-prompt');
  grunt.extendConfig({
    prompt: {
      deployEnvironment: {
        options: {
          questions: [ {
            config: 'deployEnvironment',
            type: 'list',
            choices: [
              { name: 'development', checked: true },
              { name: 'test' },
              { name: 'production' }
            ],
            message: 'Which environment?',
            default: 'development',
            when: function () {
              return !(grunt.option('deployEnvironment'));
            }
          } ]
        }
      }
    }
  });
  grunt.registerTask('generate-pm2-configuration', function () {
    var _ = require('underscore');
    var fs = require('fs');
    var env = grunt.option('deployEnvironment') || grunt.config('deployEnvironment');
    var pomeloMaster = require('../ws-server/config/master');
    var pomeloServers = require('../ws-server/config/servers');
    var ecosystem = {
      apps: []
    };

    // add web
    // @bug avoid cluster working in symlink dir https://github.com/dbrugne/donut/issues/1126
    ecosystem.apps.push({
      name: 'web',
      script: 'app.js',
      env: {
        NODE_ENV: env
      },
      exec_mode: 'fork',
      cwd: './web-server'
    });

    // add master
    if (!pomeloMaster[ env ] || !pomeloMaster[ env ].id) {
      grunt.fail.fatal('no master configuration for env=' + env);
    }
    var args = [
      'type=master'
    ];
    args.push('id=' + pomeloMaster[ env ].id);
    args.push('host=' + pomeloMaster[ env ].host);
    args.push('port=' + pomeloMaster[ env ].port);
    ecosystem.apps.push({
      name: 'master',
      script: 'app.js',
      env: {
        NODE_ENV: env
      },
      args: args,
      cwd: './ws-server'
    });

    // add servers
    if (!pomeloServers[ env ] || !pomeloServers[ env ].connector) {
      grunt.fail.fatal('no servers configuration for env=' + env);
    }
    _.each(pomeloServers[ env ], function (servers, role) {
      _.each(servers, function (server) {
        var args = [
          'serverType=' + role
        ];
        if (env === 'development') {
          args.push('debug=32312'); // debugger is on
        }
        _.each(server, function (value, key) {
          if (key === 'token') {
            return;
          }
          args.push(key + '=' + value);
        });
        ecosystem.apps.push({
          name: server.id,
          script: 'app.js',
          env: {
            NODE_ENV: env
          },
          args: args,
          cwd: './ws-server'
        });
      });
    });

    // add deploy
    ecosystem.deploy = require('../deploy').deploy;

    fs.writeFileSync('./ecosystem.json', JSON.stringify(ecosystem), { flag: 'w+' });
    grunt.log.ok('./ecosystem.json written for env=' + env);
  });
  grunt.registerTask('pm2', [ 'prompt:deployEnvironment', 'generate-pm2-configuration' ]);
};