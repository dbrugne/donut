'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'common',
  'libs/donut-debug',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, i18next, common, donutDebug, currentUser, templates) {
  var debug = donutDebug('donut:room-users');

  var RoomUsersView = Backbone.View.extend({
    template: templates['room-users.html'],

    listTemplate: templates['room-users-list.html'],

    initialize: function () {
      this.listenTo(this.collection, 'users-redraw', this.render);

      this.initialRender();
    },
    initialRender: function () {
      var html = this.template({});
      this.$el.html(html);
      this.$count = this.$el.find('.count');
      this.$list = this.$el.find('.list');
    },
    render: function () {
      debug.start('room-users' + this.model.get('name'));
      // update user count
      var countHtml = i18next.t('chat.userscount', {count: this.collection.models.length});
      this.$count.html(countHtml);

      // redraw user list
      var listJSON = [];
      var that = this;
      _.each(this.collection.models, function (o) {
        var u = o.toJSON();

        // avatar
        u.avatar = common.cloudinarySize(u.avatar, 34);

        listJSON.push(u);
      });

      var html = this.listTemplate({
        list: listJSON,
        isOwner: this.model.currentUserIsOwner(),
        isOp: this.model.currentUserIsOp(),
        isAdmin: this.model.currentUserIsAdmin()
      });
      this.$list.html(html);
      debug.end('room-users' + that.model.get('name'));
      return this;
    },
    _remove: function () {
      this.remove();
    }

  });

  return RoomUsersView;
});
