define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'views/discussion-panel',
  'views/room-topic',
  'views/room-users',
  'text!templates/room-panel.html'
], function ($, _, Backbone, client, currentUser, DiscussionPanelView, RoomTopicView, RoomUsersView, roomPanelTemplate) {
  var RoomPanelView = DiscussionPanelView.extend({

    template: _.template(roomPanelTemplate),

    events: {
      'change .permanent-switch': 'switchPermanent'
    },
    _initialize: function() {
      this.listenTo(this.model, 'change:permanent', this.onPermanent);

      this.TopicView = new RoomTopicView({el: this.$el.find('.header > .topic-block'), model: this.model});
      this.usersView = new RoomUsersView({el: this.$el.find('.col-users'), collection: this.model.users});

      this.$permanentSwitch = this.$el.find('.permanent-switch');
      this.$permanentLabel = this.$el.find('.permanent-label');
    },
    _remove: function(model) {
      this.TopicView.remove();
      this.usersView.remove();
    },
    _renderData: function() {
      var owner = this.model.get('owner').toJSON()
      var data = this.model.toJSON();
      data.owner = owner;
      data.isGranted = this.isGranted();
      return data;
    },
    _render: function() {
    },
    switchPermanent: function(event) {
      if (!this.isGranted()) return false;
      var newState = this.$permanentSwitch.prop('checked');
      client.roomPermanent(this.model.get('name'), newState);
    },
    onPermanent: function(room, permanent, options) {
      this.$permanentSwitch.prop('checked', permanent);
      var label = (permanent)
        ? 'oui'
        : 'non';
      this.$permanentLabel.find('strong').text(label);
    },
    isGranted: function() {
      if (this.model.get('owner').get('user_id') == currentUser.get('user_id')) {
        return true;
      }
      return false;
    }

  });

  return RoomPanelView;
});