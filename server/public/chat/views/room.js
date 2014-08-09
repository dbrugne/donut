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
      'click .deop-user': 'deopUser'
    },
    _initialize: function() {
      this.listenTo(this.model, 'change:color', this.onColor);
      this.listenTo(this.model, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'change:poster', this.onPoster);
      this.listenTo(this.model, 'change:permanent', this.onPermanent);

      this.topicView = new TopicView({el: this.$el.find('.topic'), model: this.model});
      this.usersView = new UsersView({el: this.$el.find('.users'), model: this.model, collection: this.model.users});

      this._colorify();
    },
    _remove: function(model) {
      this.topicView.remove();
      this.usersView.remove();
    },
    _renderData: function() {
      var data = this.model.toJSON();

      // owner
      var owner = this.model.get('owner').toJSON();
      data.owner = owner;
      data.isOwner = this.model.currentUserIsOwner();

      // poster
      data.posterblured = data.poster.replace('t_room-poster', 't_room-poster-blured');

      return data;
    },
    _render: function() {
    },
    _focus: function() {
    },
    _unfocus: function() {
    },
    _colorify: function() {
      this.$el.attr('data-colorify', this.model.get('color'));
      this.$el.colorify();
      this.mainView.color(this.model.get('color'));
    },

    /**
     * User actions methods
     */

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
      this._colorify();
    },
    onAvatar: function(model, value, options) {
      // @todo : handle default image
      var url = $.cloudinary.url(value, {
        transformation: 'room-large'
      });
      this.$el.find('.header img.avatar').attr('src', url);
    },
    onPoster: function(model, value, options) {
      // @todo : handle default image
      var url = $.cloudinary.url(value, {
        transformation: 'room-poster'
      });
      this.$el.find('div.side').css('background-image', 'url('+url+')');

      var urlb = $.cloudinary.url(value, {
        transformation: 'room-poster-blured'
      });
      this.$el.find('div.blur').css('background-image', 'url('+urlb+')');
    },
    onPermanent: function(model, value, options) {
      if (value)
        this.$el.find('.permanent').show();
      else
        this.$el.find('.permanent').hide();
    }

  });

  return RoomView;
});