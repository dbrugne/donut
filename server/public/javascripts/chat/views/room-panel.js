define([
  'jquery',
  'underscore',
  'backbone',
  'views/discussion-panel',
  'views/room-topic',
  'views/room-users',
  'text!templates/room-panel.html'
], function ($, _, Backbone, DiscussionPanelView, RoomTopicView, RoomUsersView, roomPanelTemplate) {
  var RoomPanelView = DiscussionPanelView.extend({

    template: _.template(roomPanelTemplate),

    _initialize: function() {
      this.TopicView = new RoomTopicView({el: this.$el.find('.header > .topic-block'), model: this.model});
      this.usersView = new RoomUsersView({el: this.$el.find('.col-users'), collection: this.model.users});
    },

    _remove: function(model) {
      this.TopicView.remove();
      this.usersView.remove();
    },

    _renderData: function() {
      var owner = this.model.get('owner').toJSON()
      var data = this.model.toJSON();
      data.owner = owner;
      return data;
    },

    _render: function() {
    }

  });

  return RoomPanelView;
});