define([
  'underscore',
  'backbone',
  'client',
  'models/event'
], function (_, Backbone, client, EventModel) {
  var OneToOneModel = Backbone.Model.extend({

    defaults: function() {
      return {
        username: '',
        user_id: '',
        avatar: '',
        poster: '',
        color: '',
        location: '',
        website: '',
        status: '',
        onlined: '',
        type: 'onetoone',
        focused: false,
        unread: 0
      };
    },
    initialize: function() {
    },
    getIdentifier: function() {
      return this.get('username');
    },
    leave: function() {
      client.userLeave(this.get('username'));
    },
    onMessage: function(data) {
      var model = new EventModel({
        type: 'user:message',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onUserOnline: function(data) {
      this._onStatus('online', data);
    },
    onUserOffline: function(data) {
      this._onStatus('offline', data);
    },
    _onStatus: function(expect, data) {
      if (this.get('status') == expect)
        return;

      this.set({
        status: expect,
        onlined: new Date().toISOString()
      });

      var model = new EventModel({
        type: 'user:'+expect,
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onUpdated: function (data) {
      this.set(data.data);
    },
    history: function(since) {
      var that = this;
      client.userHistory(this.get('username'), since, function(data) {
        that.trigger('historyEvents', {
          history: data.history,
          more: data.more
        });
      });
    },

    sendMessage: function(message, images) {
      client.userMessage(this.get('username'), message, images);
    }

  });

  return OneToOneModel;
});