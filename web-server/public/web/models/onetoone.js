var Backbone = require('backbone');
var app = require('./app');
var client = require('../libs/client');
var currentUser = require('./current-user');
var EventModel = require('./event');

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
      unviewed: (currentUser.get('user_id') !== data.from_user_id),
      data: data
    });

    app.trigger('newEvent', model, this);
    this.trigger('freshEvent', model);
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
    return !(this.get('i_am_banned') === true);
  }
});

module.exports = OneToOneModel;
