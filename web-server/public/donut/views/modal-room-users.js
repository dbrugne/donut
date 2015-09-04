'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'common',
  'libs/donut-debug',
  'client',
  '_templates'
], function ($, _, Backbone, i18next, common, donutDebug, client, templates) {
  var debug = donutDebug('donut:modal-room-users');

  var RoomUsersModalView = Backbone.View.extend({
    el: $('#room-users-modal'),

    template: templates['room-users-list.html'],

    events: {
      'click .open-user-profile': 'hide'
    },

    callback: null,

    initialize: function (options) {
      this.$el.modal({
        show: false
      });

      this.$content = this.$('.modal-body ul.list');
      this.$title = this.$('.modal-header .modal-title');
    },

    render: function (model) {
      var collection = model.users;
      if (!collection || !collection.length)
        return this;

      var users = [];
      _.each(collection.models, function (o) {
        var u = o.toJSON();
        u.avatar = common.cloudinarySize(u.avatar, 34);
        users.push(u);
      });

      var html = this.template({
        list: users,
        isOwner: model.currentUserIsOwner(),
        isOp: model.currentUserIsOp(),
        isAdmin: model.currentUserIsAdmin()
      });
      this.$content.html(html);
      this.$title.html(i18next.t('chat.userscount', {count: users.length}));

      return this;
    },
    show: function (model) {
      if (!model)
        return;

      this.render(model);
      this.$el.modal('show');
    },
    hide: function () {
      this.$el.modal('hide');
    }

  });

  return RoomUsersModalView;
});
