define([
  'jquery',
  'underscore',
  'backbone',
  'moment',
  'text!templates/room.html'
], function ($, _, Backbone, moment, roomTemplate) {
  var RoomView = Backbone.View.extend({

    template: _.template(roomTemplate),

    id: 'room-detail',

    events: {
    },

    initialize: function (options) {
      this.render();
    },
    render: function () {
      var data = this.model.toJSON();
      if (data.avatar)
        data.imgAvatar = $.cd.natural(data.avatar, 50, 50);
      if (data.poster)
        data.imgPoster = $.cd.natural(data.poster, 50, 50);
      if (data.created_at) {
        var dateObject = moment(data.created_at);
        data.created_at = dateObject.format("dddd Do MMMM YYYY à HH:mm:ss");
      }
      if (data.lastjoin_at) {
        var dateObject = moment(data.lastjoin_at);
        data.lastjoin_at = dateObject.format("dddd Do MMMM YYYY à HH:mm:ss");
      }
      console.log(data);
      this.$el.html(this.template({
        room: data
      }));
      this.$el.find('.website').linkify();
      return this;
    }
  });

  return RoomView;
});