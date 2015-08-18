define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  'client',
  '_templates'
], function ($, _, Backbone, donutDebug, client, templates) {

  var debug = donutDebug('donut:modal-welcome');

  var RoomUsersModalView = Backbone.View.extend({

    template: templates['room-users-list.html'],

    events: {
      //"hidden.bs.modal"                     : "onHide"//,
      //"click .nothing, .list .room .join"   : "onClose"
    },

    callback: null,

    initialize: function(options) {
      this.$el.modal({
        show: false
      });
    },

    render: function(data) {
      var users = [];
      _.each(data.users, function(user) {
        user.avatar = $.cd.userAvatar(user.avatar, 30);
        users.push(user);
      });

      var html = this.template({
        list: users,
        isOwner: this.model.currentUserIsOwner(),
        isOp: this.model.currentUserIsOp(),
        isAdmin: this.model.currentUserIsAdmin()
      });
      this.$el.find('.modal-body ul.list').html(html);
      this.$el.find('.modal-header .modal-title').html($.t("chat.userscount", {count: users.length}));

      return this;
    },
    show: function() {
      this.$el.modal('show');
    },
    hide: function() {
      this.$el.modal('hide');
    }

  });

  return RoomUsersModalView;
});
