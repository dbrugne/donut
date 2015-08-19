define([
  'jquery',
  'underscore',
  'backbone',
  'views/modal-confirmation',
  'models/event',
  'models/current-user'
], function ($, _, Backbone, confirmationView, EventModel, currentUser) {
  var InputCommandsView = Backbone.View.extend({

    commands : {
      join: {
        parameters: 'name',
        help: '#donut',
        description: 'chat.commands.join'
      },
      leave: {
        parameters: 'name',
        help: '#donut',
        description: 'chat.commands.leave'
      },
      topic: {
        parameters: 'notMandatory',
        help: '[topic]',
        description: 'chat.commands.topic'
      },
      op: {
        parameters: 'username',
        help: '@username',
        description: 'chat.commands.op'
      },
      deop: {
        parameters: 'username',
        help: '@username',
        description: 'chat.commands.deop'
      },
      kick: {
        parameters: 'username',
        help: '@username',
        description: 'chat.commands.kick'
      },
      ban: {
        parameters: 'username',
        help: '@username',
        description: 'chat.commands.ban' //ban and expulse user from room'
      },
      deban: {
        parameters: 'username',
        help: '@username',
        description: 'chat.commands.deban'
      },
      voice: {
        parameters: 'username',
        help: '@username',
        description: 'chat.commands.voice'
      },
      devoice: {
        parameters: 'username',
        help: '@username',
        description: 'chat.commands.devoice'
      },
      msg: {
        parameters: 'usernameNameMsg',
        help: '@username/#donut message',
        description: 'chat.commands.msg'
      },
      profile: {
        parameters: 'usernameName',
        help: '@username/#donut',
        description: 'chat.commands.profile'
      },
      me: {
        parameters: 'message',
        help: 'message',
        description: 'chat.commands.me'
      },
      ping: {
        parameters: 'nothing',
        help: '',
        description: 'chat.commands.ping'
      },
      help: {
        parameters: 'helpCommand',
        help: '[command]',
        description: 'chat.commands.help'
      }
    },

    parameters: {
      message: /(.+)/,
      helpCommand: /^\/([a-zA-Z]+)/,
      name : /(^[#][\w-.|^]+)/,
      username : /^[@]([\w-.|^]+)/,
      usernameName : /^([@#][\w-.|^]+)/,
      usernameNameMsg: /^([@#][\w-.|^]+)\s+(.+)/
    },

    initialize: function(options) {
      this.render();
    },
    render: function() {
      return this;
    },

    /**********************************************************
     * Commands functions
     **********************************************************/

    join: function(parameters) {

      if (!parameters)
        return;
      client.roomJoin(parameters[1]);
    },

    leave: function(parameters) {

      if (!parameters)
        return;
        client.roomLeave(parameters[1]);
    },

    topic: function(parameters) {
      client.roomTopic(this.model.get('name'), parameters[1]);
    },

    op: function(parameters) {

      if (!parameters || this.model.get('type') !== 'room')
        return;

      var that = this;
      confirmationView.open({}, function() {
        client.roomOp(that.model.get('name'), parameters[1]);
      });
    },

    deop: function(parameters) {

      if (!parameters || this.model.get('type') !== 'room')
        return;

      var that = this;
      confirmationView.open({}, function() {
        client.roomDeop(that.model.get('name'), parameters[1]);
      });
    },

    kick: function(parameters) {

      if (!parameters || this.model.get('type') !== 'room')
        return;

      var that = this;
      confirmationView.open({input: true}, function (reason) {
        client.roomKick(that.model.get('name'), parameters[1], reason);
      });
    },

    ban: function(parameters) {

      if (!parameters || this.model.get('type') !== 'room')
        return;

      var that = this;
      confirmationView.open({input : true}, function (reason) {
        client.roomBan(that.model.get('name'), parameters[1], reason);
      });
    },

    deban: function(parameters) {

      if (!parameters || this.model.get('type') !== 'room')
        return;

      client.roomDeban(this.model.get('name'), parameters[1]);
    },

    voice: function(parameters) {

      if (!parameters || this.model.get('type') !== 'room')
        return;

      client.roomVoice(this.model.get('name'), parameters[1]);
    },

    devoice: function(parameters) {

      if (!parameters || this.model.get('type') !== 'room')
        return;

      var that = this;
      confirmationView.open({input : true}, function (reason) {
        client.roomDevoice(that.model.get('name'), parameters[1], reason);
      });
    },

    msg: function(parameters) {

      if (!parameters)
        return;

      if (/^#/.test(parameters[1]))
        client.roomMessage(parameters[1], parameters[2], null);
      else {
        parameters[1] = parameters[1].replace(/^@/, '');
        client.userMessage(parameters[1], parameters[2], null);
      }
    },

    profile: function(parameters) {

      if (!parameters)
        return;

      if ((/^#/.test(parameters[1])))
        currentUser.trigger('roomProfileCommand', parameters[1]);
      else {
        parameters[1] = parameters[1].replace(/^@/, '');
        currentUser.trigger('userProfileCommand', parameters[1]);
      }
    },

    me: function(parameters) {

      if (!parameters)
        return;

      if (this.model.get('type') === 'room')
        client.roomMe(this.model.get('name'), parameters[1]);
      else
        client.userMe(this.model.get('id'), parameters[1]);
    },

    ping: function(parameters) {

      var that = this;
      client.ping(function (duration){
        var data = {
          avatar : currentUser.get('avatar'),
          username : currentUser.get('username'),
          ping : 'ping : ' + duration + 'ms'
        };
        var model = new EventModel({
          type: 'ping',
          data: data
        });
        that.model.trigger('freshEvent', model);
      });
    },

    help: function(parameters) {

      if (parameters && this.commands[parameters[1]]) {
        var commandHelp = this.commands[parameters[1]];
        commandHelp.name = parameters[1];
      }

      var data = {
        title: 'Help',
        help: (commandHelp) ? { cmd: commandHelp } : this.commands
      };
      var model = new EventModel({
        type: 'help',
        data: data
      });
      this.model.trigger('freshEvent', model);
    },

  });

  return InputCommandsView;
});

