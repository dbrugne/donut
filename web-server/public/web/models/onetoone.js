var Backbone = require('backbone');
var app = require('../libs/app');
var client = require('../libs/client');
var currentUser = require('./current-user');

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
  getUrl: function () {
    return window.location.protocol +
      '//' +
      window.location.host +
      '/u/' + this.get('username');
  },
  leave: function () {
    client.userLeave(this.get('user_id'));
  },
  onMessage: function (data) {
    app.trigger('newEvent', 'user:message', data, this);

    data.unviewed = (currentUser.get('user_id') !== data.from_user_id);
    this.trigger('freshEvent', 'user:message', data);
  },
  onUserOnline: function (data) {
    this._onStatus('online', data);
  },
  onUserOffline: function (data) {
    this._onStatus('offline', data);
  },
  _onStatus: function (expect, data) {
    if (this.get('status') === expect) {
      return;
    }

    this.set({
      status: expect,
      onlined: new Date().toISOString()
    });

    this.trigger('freshEvent', 'user:' + expect, data);
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
    this.trigger('freshEvent', 'user:ban', data);
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
    this.trigger('freshEvent', 'user:deban', data);
  },
  history: function (start, end, callback) {
    client.userHistory(this.get('user_id'), start, end, 100, function (data) {
      return callback(data);
    });
  },
  viewedElements: function (elements) {
    client.userViewed(this.get('user_id'), elements);
  },
  sendMessage: function (message, files) {
    client.userMessage(this.get('user_id'), message, files);
  },
  onViewed: function (data) {
    if (this.get('unviewed') === true) {
      this.set('unviewed', false);
      app.trigger('redrawNavigationOnes');
    }
    this.trigger('viewed', data);
  },
  isInputActive: function () {
    return !(this.get('i_am_banned') === true || !currentUser.isConfirmed());
  }
});

module.exports = OneToOneModel;
