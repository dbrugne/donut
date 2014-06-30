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
      'change .permanent-switch': 'switchPermanent',
      'click .op-user': 'opUser',
      'click .deop-user': 'deopUser'
    },
    _initialize: function() {
      this.listenTo(this.model, 'change:permanent', this.onPermanent);

      this.TopicView = new RoomTopicView({el: this.$el.find('.header > .topic-block'), model: this.model});
      this.usersView = new RoomUsersView({el: this.$el.find('.col-users'), model: this.model, collection: this.model.users});

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
      data.isOwner = this.model.currentUserIsOwner();
      return data;
    },
    _render: function() {
    },
    switchPermanent: function(event) {
      if (!this.model.currentUserIsOwner()) return false;
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