define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'client',
  'models/current-user',
  'views/modal-confirmation',
  '_templates'
], function ($, _, Backbone, common, client, currentUser, confirmationView, templates) {
  var DrawerRoomUsersView = Backbone.View.extend({

    template: templates['drawer-room-users.html'],

    id: 'room-users',

    events  : {
      'click .op'    : 'opUser',
      'click .deop'  : 'deopUser',
      'click .kick'  : 'kickUser',
      'click .ban'   : 'banUser',
      'click .deban' : 'debanUser',
      'click .voice' : 'voiceUser',
    },

    initialize: function(options) {
      this.mainView = options.mainView;
      this.model = options.model;

      this.render();
    },
    render: function() {
      // render spinner only
      this.$el.html(templates['spinner.html']);

      // ask for data
      var that = this;
      client.roomRead(this.model.get('id'), null, function(err, data) {
        if (!err)
          that.onResponse(data);
      });

      return this;
    },
    onResponse: function(room) {
      if (room.color)
        this.trigger('color', room.color);

      room.isOwner = (room.owner)
          ? (room.owner.user_id == currentUser.get('user_id'))
          ? true
          : false
          : false;

      room.owner.avatarUrl = common.cloudinarySize(room.owner.avatar, 20);

      // owner and ops aren't displayed in users list
      var notDisplayed = _.map(room.op, function(op) {
        return op.user_id;
      });
      if (room.owner)
        notDisplayed.push(room.owner.user_id);
      var users = _.filter(room.users, function(u) {
        return (notDisplayed.indexOf(u.user_id) === -1);
      });
      room.users = users;

      _.each(room.users, function(element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });
      _.each(room.op, function(element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });
      _.each(room.devoices, function(element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });
      _.each(room.bans, function(element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });

      var html = this.template({room: room});
      this.$el.html(html);
    },

    /**
     * User actions methods
     */

    opUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({}, function() {
        client.roomOp(that.model.get('id'), userId, null);
        that.render();
      });
    },
    deopUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({}, function() {
        client.roomDeop(that.model.get('id'), userId, null);
        that.render();
      });
    },
    kickUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({ input: true }, function(reason) {
        client.roomKick(that.model.get('id'), userId, reason);
        that.render();
      });
    },
    banUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({ input: true }, function(reason) {
        client.roomBan(that.model.get('id'), userId, reason);
        that.render();
      });
    },
    debanUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({}, function() {
        client.roomDeban(that.model.get('id'), userId);
        that.render();
      });
    },
    voiceUser: function(event) {
      event.preventDefault();
      if (!this.model.currentUserIsOp() && ! this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var that = this;
      confirmationView.open({}, function() {
        client.roomVoice(that.model.get('id'), userId);
        that.render();
      });
    }

  });

  return DrawerRoomUsersView;
});