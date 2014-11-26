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
      this.listenTo(this.model, 'change:focused', this.onFocus);

      this.initialRender();
    },
    initialRender: function() {
      var html = this.template({});
      this.$el.html(html);
      this.$count = this.$el.find('.count');
      this.$list = this.$el.find('.list');

      // scrollbar initialization (setTimeout for browser DOM bug)
      var that = this;
      setTimeout(function() {
        that.$list.mCustomScrollbar({
          scrollInertia         : 0,
          alwaysShowScrollbar   : 1,
          theme                 : 'dark',
          live                  : false,
          advanced:{
            updateOnSelectorChange: false,
            updateOnContentResize: false,
            updateOnImageLoad: false
          }
        });
        that.$listContent = that.$list.find('.mCSB_container');
        that.render();
      }, 100);
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
      this.$listContent.html(html);
      this.$list.mCustomScrollbar('update');
      return this;
    },
    onAddRemove: function(model, collection, options) {
      this.render();
    },
    onFocus: function(model, value, options) {
      if (value) {
        this.$list.mCustomScrollbar('update');
      } else {
        // remove scrollbar listener on blur
        this.$list.mCustomScrollbar('disable');
      }
    },
    _remove: function() {
      this.$list.mCustomScrollbar('destroy');
      this.remove();
    }
  });

  return RoomUsersView;
});