define([
  'underscore',
  'backbone',
  'models/client',
  'models/discussion'
], function (_, Backbone, client, DiscussionModel) {
  var OneToOneModel = DiscussionModel.extend({

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
    _initialize: function() {
      this.listenTo(client, 'user:profile', this.onProfile);
      this.listenTo(client, 'user:online', this.onUserOnline);
      this.listenTo(client, 'user:offline', this.onUserOffline);
      this.listenTo(client, 'user:history', this.onHistory);
    },
    leave: function() {
      client.userLeave(this.get('username'));
    },
    onMessage: function(data) {
      this.onEvent('user:message', data);
    },
    onUserOnline: function(data) {
      this._onStatus('online', data);
    },
    onUserOffline: function(data) {
      this._onStatus('offline', data);
    },
    _onStatus: function(expect, data) {
      if (data.username != this.get('username'))
        return;

      if (this.get('status') == expect)
        return;

      this.set({status: expect});

      this.events.addEvent({
        type: 'user:'+expect,
        data: data
      });
    },
    onProfile: function (data) {
      if (!data.user || data.user.username != this.get('username'))
        return;

      this.set(data.user);
    },
    onHistory: function(data) {
      if (this.get('username') != data.username)
        return;

      if (data.history && data.history.length > 0) {
        var that = this;

        // optimize DOM updating by reversing history list order
        data.history.reverse();

        _.each(data.history, function(event) {
          event.data.user_id = event.data.from_user_id;
          event.data.username = event.data.from_username;
          event.data.avatar = event.data.from_avatar;
          event.data.color = event.data.from_color;
          that.events.addEvent(event);
        });
      }

      this.trigger('history:loaded');
    }

  });

  return OneToOneModel;
});