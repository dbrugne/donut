define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'views/modal-confirmation',
  'models/event',
  'models/current-user'
], function ($, _, Backbone, client, confirmationView, EventModel, currentUser) {
  var InputCommandsView = Backbone.View.extend({

    commandRegexp: /^\/([-a-z0-9]+)/i,

    initialize: function(options) {
    },

    render: function() {
      return this;
    },

    checkInput: function(input) {
      if (!this.commandRegexp.test(input))
        return false;

      // find alias and command
      var match = this.commandRegexp.exec(input.toLowerCase());
      if (!match[1])
        return false;
      var commandName = match[1];

      _.each(this.commands, function(cmd, key) {
        if (cmd.alias && cmd.alias == commandName)
          commandName = key;
      });

      if (!this.commands[commandName])
        return this.errorCommand(commandName, 'invalidatecommand');

      // find parameters
      var parametersPattern = this.parameters[this.commands[commandName].parameters];
      var parameters;
      if (parametersPattern) {
        var paramsString = input.replace(this.commandRegexp, '').replace(/^[\s]+/, '');
        var parameters = paramsString.match(parametersPattern);
      }

      // run
      this[commandName](paramsString, parameters);

      return true;
    },

    /**********************************************************
     *
     * Commands
     *
     **********************************************************/

    commands : {
      join: {
        alias: 'j',
        parameters: 'name',
        access: 'everywhere',
        help: '#donut',
        description: 'chat.commands.join'
      },
      leave: {
        alias: 'l',
        parameters: 'name',
        access: 'everywhere',
        help: '#donut',
        description: 'chat.commands.leave'
      },
      topic: {
        parameters: 'messageNotMandatory',
        access: 'room',
        help: '[topic]',
        description: 'chat.commands.topic'
      },
      op: {
        parameters: 'username',
        access: 'room',
        help: '@username',
        description: 'chat.commands.op'
      },
      deop: {
        parameters: 'username',
        access: 'room',
        help: '@username',
        description: 'chat.commands.deop'
      },
      kick: {
        parameters: 'username',
        access: 'room',
        help: '@username',
        description: 'chat.commands.kick'
      },
      ban: {
        parameters: 'username',
        access: 'everywhere',
        help: '@username',
        description: 'chat.commands.ban'
      },
      deban: {
        parameters: 'username',
        access: 'everywhere',
        help: '@username',
        description: 'chat.commands.deban'
      },
      voice: {
        parameters: 'username',
        access: 'room',
        help: '@username',
        description: 'chat.commands.voice'
      },
      devoice: {
        parameters: 'username',
        access: 'room',
        help: '@username',
        description: 'chat.commands.devoice'
      },
      msg: {
        parameters: 'usernameNameMsg',
        access: 'everywhere',
        help: '@username/#donut message',
        description: 'chat.commands.msg'
      },
      profile: {
        parameters: 'usernameName',
        access: 'everywhere',
        help: '@username/#donut',
        description: 'chat.commands.profile'
      },
      me: {
        parameters: 'message',
        access: 'everywhere',
        help: 'message',
        description: 'chat.commands.me'
      },
      ping: {
        parameters: 'nothing',
        access: 'everywhere',
        help: '',
        description: 'chat.commands.ping'
      },
      help: {
        parameters: 'helpCommand',
        access: 'everywhere',
        help: '[command]',
        description: 'chat.commands.help'
      }
    },

    parameters: {
      nothing: /([^\.])/,
      message: /(.+)/,
      messageNotMandatory: /(.*)/,
      helpCommand: /^\/([a-z]+)/i,
      name: /(^[#][a-z-.|^]+)/i,
      username: /^[@]([a-z-.|^]+)/i,
      usernameName: /^([@#][a-z-.|^]+)/i,
      usernameNameMsg: /^([@#][a-z-.|^]+)\s+(.+)/i
    },

    join: function(paramString, parameters) {
      if (!parameters)
        return this.errorCommand('join', 'parameters');
      currentUser.trigger('roomJoinCommand', parameters[1]);
    },
    leave: function(paramString, parameters) {
      if (!paramString) {
        client.roomLeave(this.model.get('name'));
        return;
      }
      if (!parameters)
        return this.errorCommand('leave', 'parameters');
      client.roomLeave(parameters[1]);
    },
    topic: function(paramString, parameters) {
      if (this.model.get('type') !== 'room')
        return this.errorCommand('topic', 'commandaccess');
      client.roomTopic(this.model.get('name'), parameters[1]);
    },
    op: function(paramString, parameters) {
      if (!parameters)
        return this.errorCommand('op', 'parameters');
      if (this.model.get('type') !== 'room')
        return;
      var that = this;
      confirmationView.open({}, function() {
        client.roomOp(that.model.get('name'), parameters[1]);
      });
    },
    deop: function(paramString, parameters) {
      if (!parameters)
        return this.errorCommand('deop', 'parameters');

      if (this.model.get('type') !== 'room')
        return;
      var that = this;
      confirmationView.open({}, function() {
        client.roomDeop(that.model.get('name'), parameters[1]);
      });
    },
    kick: function(paramString, parameters) {
      if (!parameters)
        return this.errorCommand('kick', 'parameters');

      if (this.model.get('type') !== 'room')
        return;
      var that = this;
      confirmationView.open({input: true}, function (reason) {
        client.roomKick(that.model.get('name'), parameters[1], reason);
      });
    },
    ban: function(paramString, parameters) {
      if (!parameters)
        return this.errorCommand('ban', 'parameters');

      if (this.model.get('type') !== 'room')
        return;
      var that = this;
      confirmationView.open({input : true}, function (reason) {
        client.roomBan(that.model.get('name'), parameters[1], reason);
      });
    },
    deban: function(paramString, parameters) {
      if (!parameters)
        return this.errorCommand('deban', 'parameters');

      if (this.model.get('type') !== 'room')
        return;
      client.roomDeban(this.model.get('name'), parameters[1]);
    },
    voice: function(paramString, parameters) {
      if (!parameters)
        return this.errorCommand('voice', 'parameters');

      if (this.model.get('type') !== 'room')
        return;
      client.roomVoice(this.model.get('name'), parameters[1]);
    },
    devoice: function(paramString, parameters) {
      if (!parameters)
        return this.errorCommand('devoice', 'parameters');

      if (this.model.get('type') !== 'room')
        return;
      var that = this;
      confirmationView.open({input : true}, function (reason) {
        client.roomDevoice(that.model.get('name'), parameters[1], reason);
      });
    },
    msg: function(paramString, parameters) {

      var oneParam = (!parameters) ? ((this.model.get('type') === 'room') ? this.model.get('name') : this.model.get('id')) : parameters[1];
      var message = (!parameters) ? paramString : parameters[2];

      if (/^#/.test(oneParam))
        client.roomMessage(oneParam, message, null);
      else {
        oneParam = oneParam.replace(/^@/, '');
        client.userMessage(oneParam, message, null);
      }
    },
    profile: function(paramString, parameters) {

      if (!parameters)
        return this.errorCommand('profile', 'parameters');

      var that = this;
      if ((/^#/.test(parameters[1]))) {
        client.roomRead(parameters[1], function (err, data) {
          if (err === 'unknown') {
            that.errorCommand('profile', 'invalidateroom');
            return;
          }
          if (!err)
            currentUser.trigger('roomProfileCommand', data);
        });
      } else {
        parameters[1] = parameters[1].replace(/^@/, '');
        client.userRead(parameters[1], function (err, data) {
          if (err === 'unknown') {
            that.errorCommand('profile', 'invalidateuser');
            return;
          }
          if (!err)
            currentUser.trigger('userProfileCommand', data);
        });
      }
    },
    me: function(paramString, parameters) {
      if (!parameters)
        return this.errorCommand('me', 'parameters');

      if (this.model.get('type') === 'room')
        client.roomMe(this.model.get('name'), parameters[1]);
      else
        client.userMe(this.model.get('id'), parameters[1]);
    },
    ping: function(paramString, parameters) {
      if (paramString)
        return this.errorCommand('ping', 'parameters');

      var that = this;
      client.ping(function (duration){
        var data = {
          avatar : currentUser.get('avatar'),
          username : currentUser.get('username'),
          ping : 'responds in ' + duration + 'ms'
        };
        var model = new EventModel({
          type: 'ping',
          data: data
        });
        that.model.trigger('freshEvent', model);
      });
    },
    help: function(paramString, parameters) {
      if (!parameters && paramString)
        return this.errorCommand('help', 'parameters');

      if (parameters && this.commands[parameters[1]]) {
        var commandHelp = this.commands[parameters[1]];
        commandHelp.name = parameters[1];
      }

      var data = {
        title: 'Help',
        help: (commandHelp) ? { cmd: commandHelp } : this.getCommands(this.model.get('type'))
      };
      var model = new EventModel({
        type: 'command:help',
        data: data
      });
      this.model.trigger('freshEvent', model);
    },
    errorCommand: function(StringCommand, errorType) {
      var data = {
        command: StringCommand,
        error: $.t('chat.commands.errors.' + errorType),
        type: errorType
      }
      var model = new EventModel({
        type: 'command:error',
        data: data
      });
      this.model.trigger('freshEvent', model);
    },
    getCommands: function(type) {
      var commands = {};
      _.each(this.commands, function(cmd, key) {
        if (cmd.access === 'everywhere' || cmd.access === type)
          commands[key] = cmd;
      });
      return commands;
    }

  });

  return InputCommandsView;
});

