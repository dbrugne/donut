define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/discussion-panel',
  'views/room-topic',
  'views/room-users',
  'text!templates/room-panel.html'
], function ($, _, Backbone, client, DiscussionPanelView, RoomTopicView, RoomUsersView, roomPanelTemplate) {
  var RoomPanelView = DiscussionPanelView.extend({

    template: _.template(roomPanelTemplate),

    events: {
      'change .header .actions .permanent .switch': 'onPermanent'
    },

    _initialize: function() {
      this.TopicView = new RoomTopicView({el: this.$el.find('.header > .topic-block'), model: this.model});
      this.usersView = new RoomUsersView({el: this.$el.find('.col-users'), collection: this.model.users});
      this.listenTo(client, 'room:permanent', this.onPerm);  // @todo : move in model
    },

    _remove: function(model) {
      this.TopicView.remove();
      this.usersView.remove();
    },

    _renderData: function() {
      var owner = this.model.get('owner').toJSON()
      var data = this.model.toJSON();
      console.log(data);
      data.owner = owner;
      return data;
    },

    _render: function() {
    },

    onPermanent: function(event) {
      console.log(event.currentTarget.checked);
      client.roomPermanent(this.model.get('name'), event.currentTarget.checked);
    },

    onPerm: function(data) {
      // @todo only if corresponding room ...
      this.$el.find('.header .actions .permanent .switch').prop('checked', data.permanent);
      window.$cible = this.$el;
      console.log(this.$el);
    }

  });

  return RoomPanelView;
});