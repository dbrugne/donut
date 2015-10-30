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

    this.trigger('members-redraw');  // required to redraw members list only, user has changed list
  },
  onDeop: function (data) {
    // user.get('is_op')
    _.find(this.get('members'), function (item) {
      if (item.user_id === data.user_id) {
        item.is_op = false;
        return true;
      }
    });

    this.trigger('members-redraw');  // required to redraw members list only, user has changed list
  },
  onAllow: function (data) {
    data.is_op = false;
    var members = this.get('members');
    members.push(data);
    this.set('members', members);

    if (data.user_id === currentUser.get('user_id')) {
      this.refreshRooms();
    }

    this.trigger('redraw'); // required to redraw all, as we now display private rooms
  },
  onDisallow: function (data) {
    var members = _.reject(this.get('members'), function (m) {
      return (m.user_id === data.user_id);
    });
    this.set('members', members);

    if (data.user_id === currentUser.get('user_id')) {
      this.refreshRooms();
    }

    this.trigger('redraw'); // required to redraw all, as we now hide private rooms
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

    this.trigger('members-redraw');  // required to redraw members list only, user has been, removed from list
  },
  onDeleteRoom: function (roomId) {
    var rooms = _.reject(this.get('rooms'), function (r) {
      return (r.id === roomId);
    });
    this.set('rooms', rooms);

    this.trigger('redraw'); // required to redraw all, as we now remove the room
  },
  refreshUsers: function () {
    var what = {
      users: true,
      admin: false,
      rooms: false
    };
    client.groupRead(this.get('group_id'), what, _.bind(function (response) {
      if (!response.err) {
        this.set(response);
      }
    }, this));
  },
  refreshRooms: function () {
    var what = {
      users: false,
      admin: false,
      rooms: true
    };
    client.groupRead(this.get('group_id'), what, _.bind(function (response) {
      if (!response.err) {
        this.set('rooms', response.rooms);
      }
    }, this));
  }
});

module.exports = GroupModel;
