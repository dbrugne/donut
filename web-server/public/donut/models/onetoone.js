define([
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'models/event'
], function (_, Backbone, client, currentUser, EventModel) {
  var OneToOneModel = Backbone.Model.extend({

    defaults: function() {
      return {
        username    : '',
        user_id     : '',
        avatar      : '',
        poster      : '',
        color       : '',
        location    : '',
        website     : '',
        status      : '',
        onlined     : '',
        type        : 'onetoone',
        focused     : false,
        unread      : 0, // probably not needed in future
        newmessage  : false,
        newmention  : false,
        newuser     : false // not used by onetone, for compatibility
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

      if (currentUser.get('user_id') != model.get('data').from_user_id)
        model.set('unviewed', true);

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
    history: function(since, callback) {
      client.userHistory(this.get('username'), since, function(data) {
        return callback(data);
      });
    },
    viewedElements: function(elements) {
      client.userViewed(this.get('username'), elements);
    },
    onViewed: function (data) {
      this.trigger('viewed', data);
    },
    sendMessage: function(message, images) {
      client.userMessage(this.get('username'), message, images);
    },

    resetNew: function() {
      this.set('unread', 0);
      this.set('newmessage', false);
      this.set('newmention', false);
    },
    isThereNew: function() {
      return !!(this.get('newmessage') || this.get('newmention'));
    }

  });

  return OneToOneModel;
});