define([
  'jquery',
  'underscore',
  'backbone',
  'models/current-user',
  'text!templates/room-users.html',
  'text!templates/room-users-list.html',
  'text!templates/room-users-confirmation.html'
], function ($, _, Backbone, currentUser, roomUsersTemplate, listTemplate, confirmationTemplate) {
  var RoomUsersView = Backbone.View.extend({

    template: _.template(roomUsersTemplate),

    listTemplate: _.template(listTemplate),

    confirmationTemplate: _.template(confirmationTemplate),

    events: {
      "click [data-toggle='confirmation']": "onConfirmation",
      "click .confirmation .cancel": "onCancel"
    },

    initialize: function() {
      this.listenTo(this.collection, 'users-redraw', this.render);

      this.initialRender();
    },
    initialRender: function() {
      var html = this.template({});
      this.$el.html(html);
      this.$count = this.$el.find('.count');
      this.$list = this.$el.find('.list');
    },
    render: function() {
      window.debug.start('room-users'+this.model.get('name'));
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
        isOp: this.model.currentUserIsOp(),
        isAdmin: this.model.currentUserIsAdmin()
      });
      this.$list.html(html);
      window.debug.end('room-users'+that.model.get('name'));
      return this;
    },
    _remove: function() {
      this.remove();
    },
    onConfirmation: function(event) {
      event.preventDefault();

      var action = $(event.currentTarget).data('action');
      var username = $(event.currentTarget).data('username');
      if (!action || !username)
        return false;

      var html = this.confirmationTemplate({
        action: action,
        username: username
      });

      $(event.currentTarget).closest('.item').append(html);
      // click on confirm will redraw the whole view == no need to remove .confirmation
    },
    onCancel: function(event) {
      event.preventDefault();
      $(event.currentTarget).closest('.confirmation').remove();
    }

  });

  return RoomUsersView;
});