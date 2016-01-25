var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var i18next = require('i18next-client');
var confirmationView = require('./modal-confirmation');

var InputCommandsView = Backbone.View.extend({
  commandRegexp: /^\/([-a-z0-9]+)/i,

  initialize: function (options) {
  },

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
    if (this[commandName](paramsString, parameters) === 'error') {
      return 'error';
    }

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
      help: '#donut ' + i18next.t('global.or') + ' #community/donut',
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
    name: /^(#[-a-z0-9_]{3,20})(\/)?([-a-z0-9_]{3,20})?/i,
    username: /^@([-a-z0-9_\.]+)/i,
    usernameName: /^([@#][-a-z0-9_\.]+)/i,
    usernameNameMsg: /^([@#][-a-z0-9_\.]{3,20})?(\/[-a-z0-9_]{3,20})?\s+(.+)/i,
    twoNumber: /(-?[0-9]+)(\s+(-?[0-9]+))?/
  },

  join: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('join', 'parameters');
    }

    var identifier;
    if (parameters[1] && parameters[2] && parameters[3]) {
      // room in group (#donut/help)
      identifier = parameters[1] + parameters[2] + parameters[3];
    } else if (parameters[1] && parameters[2]) {
      // group (#donut/)
      return app.trigger('joinGroup', parameters[1]);
    } else {
      // room not in group (#donut)
      identifier = parameters[1];
    }
    app.trigger('joinRoom', identifier);
  },
  leave: function (paramString, parameters) {
    if (!paramString) {
      app.client.roomLeave(this.model.get('id'));
      return;
    }

    if (!parameters) {
      return this.errorCommand('leave', 'parameters');
    }

    var identifier;
    var model;
    if (parameters[1] && parameters[2] && parameters[3]) {
      // room in group (#donut/help)
      identifier = parameters[3];
      model = app.rooms.getByNameAndGroup(identifier, parameters[1].replace('#', ''));
    } else if (parameters[1] && parameters[2]) {
      // group (#donut/)
      return this.errorCommand('join', 'invalidroom');
    } else {
      // room not in group (#donut)
      identifier = parameters[1];
      model = app.rooms.getByNameAndGroup(identifier.replace('#', ''), null);
    }

    if (!model) {
      return;
    }

    app.client.roomLeave(model.get('id'));
  },
  topic: function (paramString, parameters) {
    if (this.model.get('type') !== 'room') {
      return this.errorCommand('topic', 'commandaccess');
    }
    if (!parameters && paramString) {
      return this.errorCommand('topic', 'parameters');
    }

    var that = this;
    app.client.roomTopic(this.model.get('id'), parameters[1], function (data) {
      if (data.err && data.code !== 500) {
        return that.errorCommand('topic', data.err);
      }
      if (data.err) {
        return that.errorCommand('topic', 'parameters');
      }
    });
  },
  op: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('op', 'parameters');
    }

    this._promote('op', parameters[1]);
  },
  deop: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('deop', 'parameters');
    }

    this._promote('deop', parameters[1]);
  },
  kick: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('kick', 'parameters');
    }

    this._promote('kick', parameters[1]);
  },
  ban: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('kick', 'parameters');
    }

    this._promote('ban', parameters[1]);
  },
  unban: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('unban', 'parameters');
    }

    this._promote('unban', parameters[1]);
  },
  unmute: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('unmute', 'parameters');
    }

    this._promote('unmute', parameters[1]);
  },
  mute: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('mute', 'parameters');
    }

    this._promote('mute', parameters[1]);
  },
  _promote: function (what, username) {
    if (this.model.get('type') !== 'room') {
      return;
    }
    if (!username) {
      return this.errorCommand(what, 'parameters');
    }

    var input = (['kick', 'ban', 'mute'].indexOf(what) !== -1);
    var method = ({
      'op': 'roomOp',
      'deop': 'roomDeop',
      'kick': 'roomKick',
      'ban': 'roomBan',
      'unban': 'roomDeban',
      'unmute': 'roomVoice',
      'mute': 'roomDevoice'
    })[what];

    var that = this;
    app.client.userId(username, function (response) {
      if (response.err || !response.user_id) {
        return;
      }
      confirmationView.open({input: input}, function (reason) {
        app.client[method](that.model.get('id'), response.user_id, reason, function (data) {
          if (data.err && data.code !== 500) {
            return that.errorCommand(what, data.err);
          } else if (data.err) {
            return that.errorCommand(what, 'parameters');
          }
          that.model.trigger('inputFocus');
        });
      }, that.inputFocus());
    });
  },
  block: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('block', 'parameters');
    }

    this._userPromote('block', parameters[0].replace(/^@/, ''));
  },
  unblock: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('unblock', 'parameters');
    }

    this._userPromote('unblock', parameters[0].replace(/^@/, ''));
  },
  _userPromote: function (what, username) {
    if (!username) {
      return this.errorCommand(what, 'parameters');
    }

    var that = this;
    app.client.userId(username, function (response) {
      if (response.err || !response.user_id) {
        return;
      }

      var method = (what === 'block')
        ? 'userBan'
        : 'userDeban';

      confirmationView.open({input: false}, function () {
        app.client[method](response.user_id, function (data) {
          if (data.err && data.err === 'banned') {
            return that.errorCommand(what, 'already-blocked');
          }
          if (data.err && data.err === 'not-banned') {
            return that.errorCommand(what, 'already-unblocked');
          }
          if (data.err && data.code !== 500) {
            return that.errorCommand(what, 'invalidusername');
          }
          if (data.err) {
            return that.errorCommand(what, 'parameters');
          }
        });
        that.model.trigger('inputFocus');
      }, that.inputFocus());
    });
  },
  msg: function (paramString, parameters) {
    var message = (!parameters)
      ? paramString
      : parameters[3];

    if (message && /^@/.test(message) && !parameters) {
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
      if (parameters[2]) {
        model = app.rooms.getByNameAndGroup(parameters[2].replace('/', ''), parameters[1].replace('#', ''));
      } else {
        model = app.rooms.getByNameAndGroup(parameters[1].replace('#', ''), null);
      }
    } else if (/^@/.test(parameters[1])) {
      app.client.userId(parameters[1].replace('@', ''), function (response) {
        if (!response.user_id) {
          return;
        }
        app.trigger('joinOnetoone', parameters[1].replace('@', ''));
        app.client.userMessage(response.user_id, message);
      });
      return;
    } else {
      return this.errorCommand('msg', 'parameters');
    }

    if (!model) {
      return;
    }

    if (model.get('type') === 'room') {
      app.client.roomMessage(model.get('id'), message);
    } else if (model.get('type') === 'onetoone') {
      app.client.userMessage(model.get('user_id'), message);
    }
  },
  profile: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('profile', 'parameters');
    }

    var that = this;
    if ((/^#/.test(parameters[1]))) {
      app.client.roomId(parameters[1], function (response) {
        if (response.code === 404) {
          that.errorCommand('profile', 'invalidroom');
          return;
        }
        app.trigger('openRoomProfile', response.room_id);
      });
    } else {
      parameters[1] = parameters[1].replace(/^@/, '');
      app.client.userId(parameters[1], function (response) {
        if (response.code === 404) {
          that.errorCommand('profile', 'invalidusername');
          return;
        }
        app.trigger('openUserProfile', response.user_id);
      });
    }
  },
  me: function (paramString, parameters) {
    if (!parameters) {
      return this.errorCommand('me', 'parameters');
    }

    var message = parameters[1];
    if (this.model.get('type') === 'room') {
      app.client.roomMessage(this.model.get('id'), message, null, 'me');
    } else {
      app.client.userMessage(this.model.get('id'), message, null, 'me');
    }
  },
  ping: function (paramString, parameters) {
    app.client.ping(_.bind(function (duration) {
      this.model.trigger('freshEvent', 'ping', {duration: duration});
    }, this));
  },
  random: function (paramString, parameters) {
    // in case of '/random letters'
    if (paramString && !parameters) {
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
    var message = i18next.t('chat.notifications.random', {
      result: result,
      min: min,
      max: max
    });
    if (this.model.get('type') === 'room') {
      app.client.roomMessage(this.model.get('id'), message, null, 'random');
    } else {
      app.client.userMessage(this.model.get('id'), message, null, 'random');
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
      help: (commandHelp)
        ? {cmd: commandHelp}
        : this.getCommands(this.model.get('type'))
    };
    if (error) {
      data.error = error;
    }
    this.model.trigger('freshEvent', 'command:help', data);
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
    return 'error';
  }

});
module.exports = InputCommandsView;
