define([
  'jquery',
  'underscore',
  'backbone',
  'views/discussion-tab',
  'text!templates/room-tab.html'
], function ($, _, Backbone, DiscussionTabView, roomTabTemplate) {
  var RoomTabView = DiscussionTabView.extend({

    template: _.template(roomTabTemplate),

    _initialize: function(options) {
      this.listenTo(this.model.users, 'add', this.updateUsers);
      this.listenTo(this.model.users, 'remove', this.updateUsers);
    },

    _renderData: function() {
      return {
        room: this.model.toJSON(),
        users: this.model.users.toJSON() // users are not an "attribute", but an object properties
      };
    },

    updateUsers: function() {
      this.$el.find('.users-count .count').html(this.model.users.length);
    }

  });

  return RoomTabView;
});