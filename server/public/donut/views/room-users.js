define([
  'jquery',
  'underscore',
  'backbone',
  'models/current-user',
  'text!templates/room-users.html',
  'text!templates/room-users-list.html'
], function ($, _, Backbone, currentUser, roomUsersTemplate, listTemplate) {
  var RoomUsersView = Backbone.View.extend({

    template: _.template(roomUsersTemplate),

    listTemplate: _.template(listTemplate),

    initialize: function() {
      this.listenTo(this.collection, 'add', this.onAddRemove);
      this.listenTo(this.collection, 'remove', this.onAddRemove);
      this.listenTo(this.collection, 'redraw', this.render);

      this.initialRender();
    },
    initialRender: function() {
      var html = this.template({});
      this.$el.html(html);
      this.$count = this.$el.find('.count');
      this.$list = this.$el.find('.list');
      this.$list.scroller();
      this.$scrollContent = this.$list.find('.scroller-content');
      return this.render();
    },
    render: function() {
      // update user count
      var countHtml = $.t("chat.userscount", {count: this.collection.models.length});
      this.$count.html(countHtml);

      // redraw user list
      var listJSON = [];
      var that = this;
      _.each(this.collection.models, function(o) {
        var u = o.toJSON();

        // avatar
        u.avatar = $.cd.userAvatar(u.avatar, 34, u.color);

        listJSON.push(u);
      });

      var html = this.listTemplate({
        list: listJSON,
        isOwner: this.model.currentUserIsOwner(),
        isOp: this.model.currentUserIsOp()
      });
      this.$scrollContent.html(html);
      this.$list.scroller('reset');
      return this;
    },
    onAddRemove: function(model, collection, options) {
      this.render();
    }
  });

  return RoomUsersView;
});