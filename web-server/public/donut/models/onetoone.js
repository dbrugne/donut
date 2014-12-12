define([
  'underscore',
  'backbone',
  'models/client',
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
    leave: function() {
      client.userLeave(this.get('username'));
    },
    onDisconnect: function() {
      var model = new EventModel({
        type: 'disconnected'
      });
      this.trigger('freshEvent', model);
    },
    onReconnect: function() {
      // manage reconnectHistory
      this.trigger('reconnectEvents');

      var model = new EventModel({
        type: 'reconnected'
      });
      this.trigger('freshEvent', model);
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

      this.set({status: expect});

      var model = new EventModel({
        type: 'user:'+expect,
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onUpdated: function (data) {
      this.set(data.data);
    },
    onHistory: function(data) {
      this.trigger('historyEvents', {
        history: data.history,
        more: data.more
      });
    },
    history: function(since) {
      var that = this;
      client.userHistory(this.get('username'), since, function(data) {
        that.trigger('historyEvents', {
          history: data.history,
          more: data.more
        });
      });
    }

  });

  return OneToOneModel;
});