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
      this.listenTo(this.collection, 'users-redraw', this.render);

      this.initialRender();
    },
    initialRender: function() {
      window.debug.start('room-users'+this.model.get('name'));
      var html = this.template({});
      this.$el.html(html);
      this.$count = this.$el.find('.count');
      this.$list = this.$el.find('.list');

      // scrollbar initialization (defered for browser DOM bug)
      var that = this;

      that.render();
      window.debug.end('room-users'+that.model.get('name'));
    },
    render: function() {
      console.log('render me (user block)'); // @todo TEMP TEMP TEMP
      // update user count
      var countHtml = $.t("chat.userscount", {count: this.collection.models.length});
      this.$count.html(countHtml);

      // redraw user list
      var listJSON = [];
      var that = this;
      _.each(this.collection.models, function(o) {
        var u = o.toJSON();

        // avatar
        u.avatar = $.cd.userAvatar(u.avatar, 34);

        listJSON.push(u);
      });

      var html = this.listTemplate({
        list: listJSON,
        isOwner: this.model.currentUserIsOwner(),
        isOp: this.model.currentUserIsOp()
      });
      this.$list.html(html);
      return this;
    },
    _remove: function() {
      this.remove();
    }
  });

  return RoomUsersView;
});