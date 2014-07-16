define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'views/discussion-panel',
  'views/room-topic',
  'views/room-users',
  'text!templates/room.html'
], function ($, _, Backbone, client, currentUser, DiscussionPanelView, TopicView, UsersView, roomTemplate) {
  var RoomView = DiscussionPanelView.extend({

    template: _.template(roomTemplate),

    events: {
      'click .op-user': 'opUser',
      'click .deop-user': 'deopUser'/*,
      'change .permanent-switch': 'switchPermanent'*/
    },
    _initialize: function() {
      this.listenTo(this.model, 'change:color', this.onColor);
      this.listenTo(this.model, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'change:poster', this.onPoster);
      this.listenTo(this.model, 'change:owner', this.onOwner);
      this.listenTo(this.model, 'change:permanent', this.onPermanent);

      this.topicView = new TopicView({el: this.$el.find('.topic'), model: this.model});
      this.usersView = new UsersView({el: this.$el.find('.users'), model: this.model, collection: this.model.users});
      this.$el.colorify();
    },
    _remove: function(model) {
      this.topicView.remove();
      this.usersView.remove();
    },
    _renderData: function() {
      var data = this.model.toJSON();
      var owner = this.model.get('owner').toJSON();
      data.owner = owner;
      data.isOwner = this.model.currentUserIsOwner();
      return data;
    },
    _render: function() {
      this.$el.attr('data-colorify', this.model.get('color'));
    },
    _focus: function() {
      this.mainView.colorize(this.model.get('color'));
    },
    _unfocus: function() {
//      this.mainView.colorize();
    },

    /**
     * User actions methods
     */

//    switchPermanent: function(event) {
//      if (!this.model.currentUserIsOwner())
//        return false;
//
//      var newState = this.$el.find('.permanent-switch').prop('checked');
//      client.roomPermanent(this.model.get('name'), newState);
//    },
    opUser: function(event) {
      var username = $(event.currentTarget).data('username');
      if (username)
        client.roomOp(this.model.get('name'), username);
    },
    deopUser: function(event) {
      var username = $(event.currentTarget).data('username');
      if (username)
        client.roomDeop(this.model.get('name'), username);
    },

    /**
     * Update room details methods
     */

    onColor: function(model, value, options) {
      // colorize this.$el
    },
    onAvatar: function(model, value, options) {
      // change avatar
    },
    onPoster: function(model, value, options) {
      // change poster
    },
    onOwner: function(model, value, options) {
      // change owner link
    },
    onPermanent: function(model, value, options) {
      this.$el.find('.permanent-switch').prop('checked', value);
    }

  });

  return RoomView;
});