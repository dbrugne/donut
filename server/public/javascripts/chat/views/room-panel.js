define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'views/discussion-panel',
  'views/room-header',
  'views/room-users',
  'text!templates/room-panel.html'
], function ($, _, Backbone, client, currentUser, DiscussionPanelView, RoomHeaderView, RoomUsersView, roomPanelTemplate) {
  var RoomPanelView = DiscussionPanelView.extend({

    template: _.template(roomPanelTemplate),

    events: {
      'click .op-user': 'opUser',
      'click .deop-user': 'deopUser'
    },
    _initialize: function() {
      this.headerView = new RoomHeaderView({el: this.$el.find('.header'), model: this.model});
      this.usersView = new RoomUsersView({el: this.$el.find('.col-users'), model: this.model, collection: this.model.users});
    },
    _remove: function(model) {
      this.headerView.topicView.remove();
      this.headerView.remove();
      this.usersView.remove();
    },
    _renderData: function() {
    },
    _render: function() {
    },
    opUser: function(event) {
      var username = $(event.currentTarget).data('username');
      if (username)
        client.roomOp(this.model.get('name'), username);
    },
    deopUser: function(event) {
      var username = $(event.currentTarget).data('username');
      if (username)
        client.roomDeop(this.model.get('name'), username);
    }

  });

  return RoomPanelView;
});