define([
  'jquery',
  'underscore',
  'backbone',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, currentUser, templates) {
  var CommandsView = Backbone.View.extend({

    commands : {
      '/join': {
        parameters: 'name',
        help: '#roomname',
        description: ''
      },
      '/leave': {
        parameters: 'name',
        help: '#roomname',
        description: ''
      },
      'topic': {
        parameters: '',
        help: '[topic]',
        description: ''
      },
      'op': {
        parameters: 'username',
        help: '@username',
        description: ''
      },
      'deop': {
        parameters: 'username',
        help: '@username',
        description: ''
      },
      'kick': {
        parameters: 'username',
        help: '@username [kick reason]',
        description: '',
      },
      'ban': {
        parameters: 'usernameReason',
        help: '@username [ban reason]',
        description: 'ban and expulse user from room'
      },
      'deban': {
        parameters: 'username',
        help: '@username',
        description: ''
      },
      'voice': {
        parameters: 'username',
        help: '@username',
        description: ''
      },
      'devoice': {
        parameters: 'usernameReason',
        help: '@username [devoice reason]',
        description: ''
      },
      'me': {
        parameters: '',
        help: 'message',
        description: ''
      },
      'ping': {
        parameters: '',
        help: '',
        description: ''
      },
      'help': {
        parameters: '',
        help: '',
        description: ''
      }
    },

    parameters: {
      name : /(^[#][\w-.|^]+)/,
      username : /^[@]([\w-.|^]+)/,
      usernameReason : /^[@]([-\.|^\w]+)\s+(.+)/
    },

    initialize: function(options) {

    },
    render: function() {

      return this;
    }

  });

  return CommandsView;
});

