var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../models/app');
var client = require('../libs/client');
var rooms = require('../collections/rooms');
var confirmationView = require('./modal-confirmation');
var EventModel = require('../models/event');

var InputCommandsView = Backbone.View.extend({
  commandRegexp: /^\/([-a-z0-9]+)/i,

  initialize: function (options) {},

  render: function () {
    return this;
  },

  checkInput: function (input) {
    if (!this.commandRegexp.test(input)) {
      return false;
    }

    // find alias and command
    var match = this.commandRegexp.exec(input.toLowerCase());
    if (!match[1]) {
      return false;
    }
    var commandName = match[1];

    _.each(this.commands, function (cmd, key) {
      if (cmd.alias && cmd.alias === commandName) {
        commandName = key;
      }
    });

    if (!this.commands[commandName]) {
      return this.errorCommand(commandName, 'invalidcommand');
    }

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

  inputFocus: function () {
    var that = this;
    return function () {
      that.model.trigger('inputFocus');
    };
  },

  /** ********************************************************
   *
   * Commands
   *
   **********************************************************/

  commands: {
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
      help: 'topic',
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
    unban: {
      parameters: 'username',
      access: 'room',
      help: '@username',
      description: 'chat.commands.unban'
    },
    unmute: {
      parameters: 'username',
      access: 'room',
      help: '@username',
      description: 'chat.commands.unmute'
    },
    mute: {
      parameters: 'username',
      access: 'room',
      help: '@username',
      description: 'chat.commands.mute'
    },
    block: {
      parameters: 'username',
      access: 'everywhere',
      help: '@username',
      description: 'chat.commands.block'
    },
    unblock: {
      parameters: 'username',
      access: 'everywhere',
      help: '@username',
      description: 'chat.commands.unblock'
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
    random: {
      alias: 'rand',
      parameters: 'twoNumber',
      access: 'everywhere',
      help: 'max/min max',
      description: 'chat.commands.random'
    },
    help: {
      parameters: 'helpCommand',
      access: 'everywhere',
      help: 'command',
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
    usernameNameMsg: /^([@#][-a-z0-9_^\.]+)\s+(.+)/i,
    twoNumber: /(-?[0-9]+)(\s+(-?[0-9]+))?/
  },

  join: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('join', 'parameters');
    }

    app.trigger('joinRoom', parameters[1]);
  },
  leave: function (paramString, parameters) {
    if (!paramString) {
      client.roomLeave(this.model.get('id'));
      return;
    }

    if (!parameters) {
      return this.errorCommand('leave', 'parameters');
    }

    var model = rooms.getByName(parameters[1]);
    if (!model) {
      return;
    }

    client.roomLeave(model.get('id'));
  },
  topic: function (paramString, parameters) {
    if (this.model.get('type') !== 'room') {
      return this.errorCommand('topic', 'commandaccess');
    }
    if (!parameters && paramString) {
      return this.errorCommand('topic', 'parameters');
    }

    var that = this;
    client.roomTopic(this.model.get('id'), parameters[1], function (data) {
      if (data.err && data.code !== 500) {
        return that.errorCommand('topic', data.err);
      }
      if (data.err) {
        return that.errorCommand('topic', 'parameters');
      }
    });
  },
  op: function (paramString, parameters) {
    if (this.model.get('type') !== 'room') {
      return this.errorCommand('op', 'commandaccess');
    }
    if (!parameters) {
      return this.errorCommand('op', 'parameters');
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomOp(that.model.get('id'), null, parameters[1], function (data) {
        if (data.err && data.code !== 500) {
          return that.errorCommand('op', data.err);
        }
        if (data.err) {
          return that.errorCommand('op', 'parameters');
        }
      });
      that.model.trigger('inputFocus');
    }, this.inputFocus());
  },
  deop: function (paramString, parameters) {
    if (this.model.get('type') !== 'room') {
      return this.errorCommand('deop', 'commandaccess');
    }

    if (!parameters) {
      return this.errorCommand('deop', 'parameters');
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomDeop(that.model.get('id'), null, parameters[1], function (data) {
        if (data.err && data.code !== 500) {
          return that.errorCommand('deop', data.err);
        }
        if (data.err) {
          return that.errorCommand('deop', 'parameters');
        }
      });
      that.model.trigger('inputFocus');
    }, this.inputFocus());
  },
  kick: function (paramString, parameters) {
    if (this.model.get('type') !== 'room') {
      return this.errorCommand('kick', 'commandaccess');
    }

    if (!parameters) {
      return this.errorCommand('kick', 'parameters');
    }

    var that = this;
    confirmationView.open({input: true}, function (reason) {
      client.roomKick(that.model.get('id'), null, parameters[1], reason, function (data) {
        if (data.err && data.code !== 500) {
          return that.errorCommand('kick', data.err);
        }
        if (data.err) {
          return that.errorCommand('kick', 'parameters');
        }
        that.model.trigger('inputFocus');
      });
    }, this.inputFocus());
  },
  ban: function (paramString, parameters) {
    if (this.model.get('type') !== 'room') {
      return this.errorCommand('ban', 'commandaccess');
    }

    if (!parameters) {
      return this.errorCommand('ban', 'parameters');
    }

    var that = this;
    confirmationView.open({input: true}, function (reason) {
      client.roomBan(that.model.get('id'), null, parameters[1], reason, function (data) {
        if (data.err && data.code !== 500) {
          return that.errorCommand('ban', data.err);
        }
        if (data.err) {
          return that.errorCommand('ban', 'parameters');
        }
        that.model.trigger('inputFocus');
      });
    }, this.inputFocus());
  },
  unban: function (paramString, parameters) {
    if (this.model.get('type') !== 'room') {
      return this.errorCommand('unban', 'commandaccess');
    }

    if (!parameters) {
      return this.errorCommand('unban', 'parameters');
    }

    var that = this;
    client.roomDeban(this.model.get('id'), null, parameters[1], function (data) {
      if (data.err && data.code !== 500) {
        return that.errorCommand('unban', data.err);
      }
      if (data.err) {
        return that.errorCommand('unban', 'parameters');
      }
    });
  },
  unmute: function (paramString, parameters) {
    if (this.model.get('type') !== 'room') {
      return this.errorCommand('unmute', 'commandaccess');
    }

    if (!parameters) {
      return this.errorCommand('unmute', 'parameters');
    }

    var that = this;
    client.roomVoice(this.model.get('id'), null, parameters[1], function (data) {
      if (data.err && data.code !== 500) {
        return that.errorCommand('unmute', data.err);
      }
      if (data.err) {
        return that.errorCommand('unmute', 'parameters');
      }
    });
  },
  mute: function (paramString, parameters) {
    if (this.model.get('type') !== 'room') {
      return this.errorCommand('mute', 'commandaccess');
    }

    if (!parameters) {
      return this.errorCommand('mute', 'parameters');
    }

    var that = this;
    confirmationView.open({input: true}, function (reason) {
      client.roomDevoice(that.model.get('id'), null, parameters[1], reason, function (data) {
        if (data.err && data.code !== 500) {
          return that.errorCommand('mute', data.err);
        }
        if (data.err) {
          return that.errorCommand('mute', 'parameters');
        }
        that.model.trigger('inputFocus');
      });
    }, this.inputFocus());
  },
  block: function (paramString, parameters) {
    var username = null;
    var userId = null;
    // from a room
    if (this.model.get('type') !== 'onetoone') {
      if (!paramString) {
        return this.errorCommand('block', 'commandaccess');
      } if (!parameters) {
        return this.errorCommand('block', 'parameters');
      }

      username = parameters[0].replace(/^@/, '');
    } else {
      // from a onetoone
      userId = this.model.get('user_id');
    }

    var that = this;
    confirmationView.open({input: false}, function () {
      client.userBan(userId, username, function (data) {
        if (data.err && data.err === 'banned') {
          return that.errorCommand('block', 'already-blocked');
        }
        if (data.err && data.code !== 500) {
          return that.errorCommand('block', 'invalidusername');
        }
        if (data.err) {
          return that.errorCommand('block', 'parameters');
        }
      });
      that.model.trigger('inputFocus');
    }, this.inputFocus());
  },
  unblock: function (paramString, parameters) {
    var username;
    var userId;
    // from a room
    if (this.model.get('type') !== 'onetoone') {
      if (!paramString) {
        return this.errorCommand('unblock', 'commandaccess');
      } if (!parameters) {
        return this.errorCommand('unblock', 'parameters');
      }

      username = parameters[0].replace(/^@/, '');
    } else {
      // from a onetoone
      userId = this.model.get('user_id');
    }

    var that = this;
    client.userDeban(userId, username, function (data) {
      if (data.err && data.err === 'no-banned') {
        return that.errorCommand('unblock', 'already-unblocked');
      }
      if (data.err && data.code !== 500) {
        return that.errorCommand('unblock', 'invalidusername');
      }
      if (data.err) {
        return that.errorCommand('unblock', 'parameters');
      }
    });
  },
  msg: function (paramString, parameters) {
    var message = (!parameters) ? paramString : parameters[2];

    if (message && /^@/.test(message)) {
      message = message.replace(/\s+/, '');
      app.trigger('joinOnetoone', message.replace(/^@/, ''));
      return;
    }
    if (!message) {
      return this.errorCommand('msg', 'parameters');
    }
    var model;
    if (!parameters) {
      model = this.model;
    } else if (/^#/.test(parameters[1])) {
      model = rooms.getByName(parameters[1]);
    } else if (/^@/.test(parameters[1])) {
      client.userMessage(null, parameters[1].replace(/^@/, ''), message);
      return;
    } else {
      return this.errorCommand('msg', 'parameters');
    }

    if (!model) {
      return;
    }

    if (model.get('type') === 'room') {
      client.roomMessage(model.get('id'), message);
    } else if (model.get('type') === 'onetoone') {
      client.userMessage(model.get('user_id'), null, message);
    }
  },
  profile: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('profile', 'parameters');
    }

    var that = this;
    if ((/^#/.test(parameters[1]))) {
      client.roomRead(null, parameters[1], function (data) {
        if (data.err === 'room-not-found') {
          that.errorCommand('profile', 'invalidroom');
          return;
        }
        if (!data.err) {
          app.trigger('openRoomProfile', data);
        }
      });
    } else {
      parameters[1] = parameters[1].replace(/^@/, '');
      client.userRead(null, parameters[1], function (data) {
        if (data.err === 'user-not-found') {
          that.errorCommand('profile', 'invalidusername');
          return;
        }
        if (!data.err) {
          app.trigger('openUserProfile', data);
        }
      });
    }
  },
  me: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('me', 'parameters');
    }

    var message = parameters[1];
    if (this.model.get('type') === 'room') {
      client.roomMessage(this.model.get('id'), message, null, 'me');
    } else {
      client.userMessage(this.model.get('id'), null, message, null, 'me');
    }
  },
  ping: function (paramString, parameters) {
    var that = this;
    client.ping(function (duration) {
      var model = new EventModel({
        type: 'ping',
        data: { duration: duration }
      });
      that.model.trigger('freshEvent', model);
    });
  },
  random: function (paramString, parameters) {
    // in case of '/random letters'
    if (paramString && !parameters) { // @todo yfuks add when user do '/rand 20 letters'
      return this.errorCommand('random', 'parameters');
    }

    // default value
    var max = 100;
    var min = 1;

    // random X
    if (parameters && parameters[1] && !parameters[2]) {
      max = parseInt(parameters[1], 10);
    }

    // random X Y
    if (parameters && parameters[2]) {
      min = parseInt(parameters[1], 10);
      max = parseInt(parameters[2], 10);
    }

    var result = Math.floor(Math.random() * (max - min + 1) + min);
    var message = i18next.t('chat.notifications.random', {result: result, min: min, max: max});
    if (this.model.get('type') === 'room') {
      client.roomMessage(this.model.get('id'), message, null, 'random');
    } else {
      client.userMessage(this.model.get('id'), null, message, null, 'random');
    }
  },
  help: function (paramString, parameters, error) {
    if (!parameters && paramString) {
      return this.errorCommand('help', 'parameters');
    }

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
  getCommands: function (type) {
    var commands = {};
    _.each(this.commands, function (cmd, key) {
      if (cmd.access === 'everywhere' || cmd.access === type) {
        commands[key] = cmd;
      }
    });
    return commands;
  },
  errorCommand: function (stringCommand, errorType) {
    var error = i18next.t('chat.commands.errors.' + errorType);
    if (errorType === 'invalidcommand') {
      this.help(null, null, error);
    } else {
      var parameters = ['', stringCommand];
      this.help(null, parameters, error);
    }
  }

});
module.exports = InputCommandsView;
