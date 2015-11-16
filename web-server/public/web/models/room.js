var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var client = require('../libs/client');
var currentUser = require('./current-user');
var RoomUsersCollection = require('../collections/room-users');

var RoomModel = Backbone.Model.extend({
  defaults: function () {
    return {
      name: '',
      op: [],
      devoices: [],
      topic: '',
      avatar: '',
      poster: '',
      posterblured: '',
      color: '',
      type: 'room',
      focused: false,
      unviewed: false,
      blocked: false
    };
  },
  initialize: function () {
    this.users = new RoomUsersCollection({
      parent: this
    });
  },
  unbindUsers: function () {
    this.users.stopListening();
  },
  getIdentifier: function () {
    return this.get('name');
  },
  getUrl: function () {
    return window.location.protocol +
      '//' +
      window.location.host +
      '/r/' + (
        this.get('group_id')
        ? this.get('group_name') + '/' + this.get('name')
        : this.get('name')
      );
  },
  leave: function () {
    client.roomLeave(this.get('id'));
  },
  currentUserIsOwner: function () {
    if (!this.get('owner_id')) {
      return false;
    }
    return (this.get('owner_id') === currentUser.get('user_id'));
  },
  currentUserIsOp: function () {
    return (this.get('op') && this.get('op').indexOf(currentUser.get('user_id')) !== -1);
  },
  currentUserIsAdmin: function () {
    return currentUser.isAdmin();
  },
  onTopic: function (data) {
    this.set('topic', data.topic);
    app.trigger('newEvent', 'room:topic', data, this);

    data.unviewed = (currentUser.get('user_id') !== data.user_id);
    this.trigger('freshEvent', 'room:topic', data);
  },
  onMessage: function (data) {
    app.trigger('newEvent', 'room:message', data, this);

    data.unviewed = (currentUser.get('user_id') !== data.user_id);
    this.trigger('freshEvent', 'room:message', data);
  },
  onUpdated: function (data) {
    _.each(data.data, _.bind(function (value, key, list) {
      this.set(key, value);
    }, this));
  },
  history: function (start, end, limit, callback) {
    client.roomHistory(this.get('room_id'), start, end, limit, function (data) {
      return callback(data);
    });
  },
  sendMessage: function (message, files) {
    client.roomMessage(this.get('id'), message, files);
  },
  viewedElements: function (elements) {
    client.roomViewed(this.get('room_id'), elements);
  },
  onViewed: function (data) {
    if (this.get('unviewed')) {
      this.set('unviewed', false);
      // @todo yls: why triggering a full redraw? We should just ask for a CSS class removing
      app.trigger('redrawNavigationRooms');
    }
    this.trigger('viewed', data);
  },
  isInputActive: function () {
    return !(this.users.isUserDevoiced(currentUser.get('user_id')) || !currentUser.isConfirmed());
  }

});

module.exports = RoomModel;
