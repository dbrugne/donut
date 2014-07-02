define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'views/room-topic',
  'text!templates/room-header.html'
], function ($, _, Backbone, client, currentUser, RoomTopicView, roomHeaderTemplate) {
  var RoomHeaderView = Backbone.View.extend({

    template: _.template(roomHeaderTemplate),

    events: {
      'change .permanent-switch': 'switchPermanent'
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.onChange);
      this.listenTo(this.model, 'change:permanent', this.onPermanent);

      this.render();
    },
    render: function() {
      var data = this.model.toJSON();
      var owner = this.model.get('owner').toJSON();
      data.owner = owner;
      data.isOwner = this.model.currentUserIsOwner();

      var html = this.template(data);
      this.$el.html(html);

      // re-render topic subview
      new RoomTopicView({el: this.$el.find('.topic-block'), model: this.model});

      return this;
    },
    switchPermanent: function(event) {
      if (!this.model.currentUserIsOwner())
        return false;

      var newState = this.$el.find('.permanent-switch').prop('checked');
      client.roomPermanent(this.model.get('name'), newState);
    },
    onPermanent: function(room, permanent, options) {
      this.$el.find('.permanent-switch').prop('checked', permanent);
    },
    onChange: function(model, options) {
      this.render();
    }
  });

  return RoomHeaderView;
});