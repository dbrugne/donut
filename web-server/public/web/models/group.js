var _ = require('underscore');
var Backbone = require('backbone');
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
  currentUserIsMember: function () {
    return !!_.find(this.get('members'), function(member) {
      if (currentUser.get('user_id') === member.user_id) {
        return true; // found
      }
    });
  }
});

module.exports = GroupModel;
