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

    // @todo: bug when confirm in confirmation modal, input is not refocused

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
        return this.errorCommand(commandName, 'invalidcommand');

      // find parameters
      var parametersPattern = this.parameters[this.commands[commandName].parameters];
      var paramsString;
      var parameters;
      if (parametersPattern) {
        paramsString = input.replace(this.commandRegexp, '').replace(/^\s+/, '');
        parameters = paramsString.match(parametersPattern);
      }

      // run
      this[commandName](paramsString, parameters);

      return true;
    },

    inputFocus: function() {
      var that = this;
      return function() {
        that.model.trigger('inputFocus');
      };
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
        access: 'room',
        help: '@username',
        description: 'chat.commands.ban'
      },
      deban: {
        parameters: 'username',
        access: 'room',
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
      block: {
        parameters: 'username',
        access: 'everywhere',
        help: '@username',
        description: 'chat.commands.block'
      },
      deblock: {
        parameters: 'username',
        access: 'everywhere',
        help: '@username',
        description: 'chat.commands.deblock'
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
      helpCommand: /(^[a-z]+)/i,
      name: /^(#[-a-z0-9_^]{3,24})/i,
      username: /^@([-a-z0-9_^\.]+)/i,
      usernameName: /^([@#][-a-z0-9_^\.]+)/i,
      usernameNameMsg: /^([@#][-a-z0-9_^\.]+)\s+(.+)/i
    },

    join: function(paramString, parameters) {
      if (!parameters)
        return this.errorCommand('join', 'parameters');

      currentUser.trigger('roomJoinCommand', parameters[1]);
    },
    leave: function(paramString, parameters) {
      if (!paramString) {
        client.roomLeave(this.model.get('id'));
        return;
      }

      if (!parameters)
        return this.errorCommand('leave', 'parameters');

      //@todo
      // change parameters to his id
      client.roomLeave(parameters[1]);
    },
    topic: function(paramString, parameters) {
      if (this.model.get('type') !== 'room')
        return this.errorCommand('topic', 'commandaccess');

      if (!parameters && paramString)
        return this.errorCommand('topic', 'parameters')

      client.roomTopic(this.model.get('id'), parameters[1]);
    },
    op: function(paramString, parameters) {
      if (this.model.get('type') !== 'room')
        return this.errorCommand('op', 'commandaccess');

      if (!parameters)
        return this.errorCommand('op', 'parameters');

      var that = this;
      confirmationView.open({}, function() {
        client.roomOp(that.model.get('id'), parameters[1]);
        that.model.trigger('inputFocus');
      }, this.inputFocus());
    },
    deop: function(paramString, parameters) {
      if (this.model.get('type') !== 'room')
        return this.errorCommand('deop', 'commandaccess');

      if (!parameters)
        return this.errorCommand('deop', 'parameters');

      var that = this;
      confirmationView.open({}, function() {
        client.roomDeop(that.model.get('name'), parameters[1]);
        that.model.trigger('inputFocus');
      }, this.inputFocus());
    },
    kick: function(paramString, parameters) {
      if (this.model.get('type') !== 'room')
        return this.errorCommand('kick', 'commandaccess');

      if (!parameters)
        return this.errorCommand('kick', 'parameters');

      var that = this;
      confirmationView.open({input: true}, function (reason) {
        client.roomKick(that.model.get('name'), parameters[1], reason);
        that.model.trigger('inputFocus');
      }, this.inputFocus());
    },
    ban: function(paramString, parameters) {
      if (this.model.get('type') !== 'room')
        return this.errorCommand('ban', 'commandaccess');

      if (!parameters)
        return this.errorCommand('ban', 'parameters');

      var that = this;
      confirmationView.open({input : true}, function (reason) {
        client.roomBan(that.model.get('name'), parameters[1], reason);
        that.model.trigger('inputFocus');
      }, this.inputFocus());
    },
    deban: function(paramString, parameters) {
      if (this.model.get('type') !== 'room')
        return this.errorCommand('deban', 'commandaccess');

      if (!parameters)
        return this.errorCommand('deban', 'parameters');

      client.roomDeban(this.model.get('name'), parameters[1]);
    },
    block: function(paramString, parameters) {
      var username;
      // from a room
      if (this.model.get('type') !== 'onetoone') {
        if (!paramString)
          return this.errorCommand('block', 'commandaccess');
        if (!parameters)
          return this.errorCommand('block', 'parameters');

        username = parameters[0].replace(/^@/, '');
      } else {
        // from a onetoone
        username = this.model.get('username');
      }

      var that = this;
      confirmationView.open({input : false}, function () {
        client.userBan(username);
        that.model.trigger('inputFocus');
      }, this.inputFocus());
    },
    deblock: function(paramString, parameters) {
      var username;
      // from a room
      if (this.model.get('type') !== 'onetoone') {
        if (!paramString)
          return this.errorCommand('deblock', 'commandaccess');
        if (!parameters)
          return this.errorCommand('deblock', 'parameters');

        username = parameters[0].replace(/^@/, '');
      } else {
        // from a onetoone
        username = this.model.get('username');
      }

      client.userDeban(username);
    },
    voice: function(paramString, parameters) {
      if (this.model.get('type') !== 'room')
        return this.errorCommand('voice', 'commandaccess');

      if (!parameters)
        return this.errorCommand('voice', 'parameters');

      client.roomVoice(this.model.get('name'), parameters[1]);
    },
    devoice: function(paramString, parameters) {
      if (this.model.get('type') !== 'room')
        return this.errorCommand('devoice', 'commandaccess');

      if (!parameters)
        return this.errorCommand('devoice', 'parameters');

      var that = this;
      confirmationView.open({input : true}, function (reason) {
        client.roomDevoice(that.model.get('name'), parameters[1], reason);
        that.model.trigger('inputFocus');
      }, this.inputFocus());
    },
    msg: function(paramString, parameters) {

      var oneParam = (!parameters) ? ((this.model.get('type') === 'room')
        ? this.model.get('id') : this.model.get('username')) : parameters[1];
      var message = (!parameters) ? paramString : parameters[2];

      //@todo
      // change parameters to his id
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
        //@todo
        //convert parameters[1] to id
        client.roomRead(parameters[1], function (err, data) {
          if (err === 'unknown') {
            that.errorCommand('profile', 'invalidroom');
            return;
          }
          if (!err)
            currentUser.trigger('roomProfileCommand', data);
        });
      } else {
        parameters[1] = parameters[1].replace(/^@/, '');
        client.userRead(parameters[1], function (err, data) {
          if (err === 'unknown') {
            that.errorCommand('profile', 'invalidusername');
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
        client.roomMe(this.model.get('id'), parameters[1]);
      else
        client.userMe(this.model.get('id'), parameters[1]);
    },
    ping: function(paramString, parameters) {
      if (paramString)
        return this.errorCommand('ping', 'parameters');

      var that = this;
      client.ping(function (duration) {
        var model = new EventModel({
          type: 'ping',
          data: { duration: duration }
        });
        that.model.trigger('freshEvent', model);
      });
    },
    help: function(paramString, parameters, error) {
      if (!parameters && paramString)
        return this.errorCommand('help', 'parameters');

      if (parameters && this.commands[parameters[1]]) {
        var commandHelp = this.commands[parameters[1]];
        commandHelp.name = parameters[1];
      }

      var data = {
        help: (commandHelp) ? { cmd: commandHelp } : this.getCommands(this.model.get('type'))
      };
      var model = new EventModel({
        type: 'command:help',
        data: data,
        error: error
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
    },


    /**********************************************************
     *
     * errors commands
     *
     * possible type:
     *
     *  - parameters
     *  - commandaccess
     *  - invalidcommand
     *  - invalidusername
     *  - invalidroom
     *
     **********************************************************/

    errorCommand: function(stringCommand, errorType) {
      var error = $.t('chat.commands.errors.' + errorType);
      if (errorType === 'invalidcommand') {
        this.help(null, null, error);
      } else {
        var parameters = ['', stringCommand];
        this.help(null, parameters, error);
      }
    }

  });

  return InputCommandsView;
});

