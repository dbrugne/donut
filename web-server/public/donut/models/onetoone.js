define([
  'underscore',
  'backbone',
  'models/app',
  'client',
  'models/current-user',
  'models/event'
], function (_, Backbone, app, client, currentUser, EventModel) {
  var OneToOneModel = Backbone.Model.extend({

    defaults: function () {
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
        banned: false,
        i_am_banned: false,
        unviewed: false
      };
    },
    initialize: function () {
    },
    getIdentifier: function () {
      return this.get('username');
    },
    leave: function () {
      client.userLeave(this.get('user_id'));
    },
    onMessage: function (data) {
      var model = new EventModel({
        type: 'user:message',
        data: data
      });

      if (currentUser.get('user_id') != model.get('data').from_user_id)
        model.set('unviewed', true);

      this.trigger('freshEvent', model);
    },
    onMe: function (data) {
      var model = new EventModel({
        type: 'user:me',
        data: data
      });

      if (currentUser.get('user_id') != model.get('data').from_user_id)
        model.set('unviewed', true);

      this.trigger('freshEvent', model);
    },
    onUserOnline: function (data) {
      this._onStatus('online', data);
    },
    onUserOffline: function (data) {
      this._onStatus('offline', data);
    },
    _onStatus: function (expect, data) {
      if (this.get('status') == expect)
        return;

      this.set({
        status: expect,
        onlined: new Date().toISOString()
      });

      var model = new EventModel({
        type: 'user:' + expect,
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onUpdated: function (data) {
      this.set(data.data);
    },
    onBan: function (data) {
      if (data.user_id === currentUser.get('user_id')) {
        // i'm the banned user
        this.set('i_am_banned', true);
        this.trigger('inputActive');
      } else {
        // i banned the other user
        this.set('banned', true);
      }

      // add event to discussion
      var model = new EventModel({
        type: 'user:ban',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onDeban: function (data) {
      if (data.user_id === currentUser.get('user_id')) {
        // i'm the debanned user
        this.set('i_am_banned', false);
        this.trigger('inputActive');
      } else {
        // i banned the other user
        this.set('banned', false);
      }

      // add event to discussion
      var model = new EventModel({
        type: 'user:deban',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    history: function (since, callback) {
      client.userHistory(this.get('username'), since, 100, function (data) {
        return callback(data);
      });
    },
    viewedElements: function (elements) {
      client.userViewed(this.get('username'), elements);
    },
    onViewed: function (data) {
      this.resetNew();
      this.trigger('viewed', data);
    },
    sendMessage: function (message, images) {
      client.userMessage(this.get('username'), message, images);
    },
    resetNew: function () {
      if (this.isThereNew()) { // avoid redraw if nothing to change
        this.set('unviewed', false);
        app.trigger('redraw-block');
      }
    },
    isThereNew: function () {
      return !!(this.get('unviewed'));
    },
    isInputActive: function() {
      return !(this.get('i_am_banned') === true);
    }
  });

  return OneToOneModel;
});