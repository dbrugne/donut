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
      this.trigger('batchEvents', data.history);
    }

  });

  return OneToOneModel;
});