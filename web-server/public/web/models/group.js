var Backbone = require('backbone');
var _ = require('underscore');
var client = require('../libs/client');
var currentUser = require('./current-user');

var GroupModel = Backbone.Model.extend({
  defaults: function () {
    return {
      type: 'group',
      focused: false
    };
  },
  initialize: function () {
    this.listenTo(client, 'group:updated', this.onUpdated);
  },
  onUpdated: function (data) {
    var that = this;
    _.each(data.data, function (value, key, list) {
      that.set(key, value);
    });
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
  currentUserIsBanned: function () {
    return (this.get('bans') && _.find(this.get('bans'), function (bannedUser) {
      return bannedUser.user === currentUser.get('user_id');
    }));
  },
  currentUserIsMember: function () {
    return !!_.find(this.get('members'), function (member) {
      if (currentUser.get('user_id') === member.user_id) {
        return true; // found
      }
    });
  },
  onOp: function (data) {
    var user = _.find(this.members, function (item) {
      return item.user_id === data.user_id;
    });
    if (user) {
      user.set({is_op: true});
    }
  },
  onDeop: function (data) {
    // user.get('is_op')
    var user = _.find(this.members, function (item) {
      return item.user_id === data.user_id;
    });
    if (user) {
      user.set({is_op: false});
    }
  }
});

module.exports = GroupModel;
