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
    return !!_.find(this.get('members'), function (item) {
      return (item.user_id === currentUser.get('user_id') && item.is_op === true);
    });
  },
  currentUserIsAdmin: function () {
    return currentUser.isAdmin();
  },
  currentUserIsBanned: function () {
    return (this.get('bans') && _.find(this.get('bans'), function (bannedUser) {
      return bannedUser.user_id === currentUser.get('user_id');
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
    _.find(this.get('members'), function (item) {
      if (item.user_id === data.user_id) {
        item.is_op = true;
        return true;
      }
    });

    this.onRefresh();
  },
  onDeop: function (data) {
    // user.get('is_op')
    _.find(this.get('members'), function (item) {
      if (item.user_id === data.user_id) {
        item.is_op = false;
        return true;
      }
    });

    this.onRefresh();
  },
  onBan: function (data) {
    var ban = {
      user: data.user_id,
      banned_at: Date.now()
    };
    if (data.reason) {
      ban.reason = data.reason;
    }
    var bans = this.get('bans');
    bans.push(ban);
    this.set('bans', bans);

    this.onRefresh();
  },
  onDeleteRoom: function (roomId) {
    var rooms = _.reject(this.get('rooms'), function (r) {
      return (r.id === roomId);
    });
    this.set('rooms', rooms);

    this.onRefresh();
  },
  onRefresh: function () {
    client.groupRead(this.get('group_id'), { users: true, rooms: true }, _.bind(function (response) {
      if (!response.err) {
        this.set(response);
        this.set('rooms', response.rooms);
        this.trigger('redraw');
      }
    }, this));
  }
});

module.exports = GroupModel;
