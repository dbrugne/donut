define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'libs/donut-debug',
  'client',
  '_templates'
], function ($, _, Backbone, common, donutDebug, client, templates) {

  var debug = donutDebug('donut:modal-welcome');

  var RoomUsersModalView = Backbone.View.extend({

    template: templates['room-users-list.html'],

    events: {
      "click .open-user-profile"   : "hide"
    },

    callback: null,

    initialize: function(options) {
      this.$el.modal({
        show: false
      });
    },

    render: function() {
      if (!this.collection || !this.collection.models || this.collection.models.length == 0)
        return this;

      var users = [];
      _.each(this.collection.models, function(o) {
        var u = o.toJSON();
        u.avatar = common.cloudinarySize(u.avatar, 34);
        users.push(u);
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
