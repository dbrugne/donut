define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'views/modal',
  'text!templates/room-profile.html'
], function ($, _, Backbone, client, currentUser, modalView, profileTemplate) {
  var RoomProfileView = modalView.extend({

    id      : 'room-profile-modal',
    title   : 'Room Profile',

    template: _.template(profileTemplate),

    events  : {
      'click .join': 'hide' // hide modal when user click on onetoone button
    },

    _initialize: function() {
      this.listenTo(client, 'room:profile', this.onProfile)
    },
    onProfile: function(data) {
      this.render(data.room).show();
    },
    render: function(room) {
      room.isOwner = (room.owner.user_id == currentUser.get('user_id'))
        ? true
        : false;

      var html = this.template({room: room});
      var $body = this.$el.find('.modal-body').first();
      $body.html(html);
      $body.find('.website').linkify();
      return this;
    }
  });

  return RoomProfileView;
});