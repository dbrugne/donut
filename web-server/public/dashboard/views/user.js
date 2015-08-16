define([
  'jquery',
  'underscore',
  'backbone',
  'moment',
  'text!templates/user.html'
], function ($, _, Backbone, moment, userTemplate) {
  var UserView = Backbone.View.extend({

    template: _.template(userTemplate),

    id: 'user-detail',

    events: {
    },

    initialize: function (options) {
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
      if (data.lastlogin_at) {
        var dateObject = moment(data.lastlogin_at);
        data.lastlogin_at = dateObject.format("dddd Do MMMM YYYY à HH:mm:ss");
      }
      if (data.lastonline_at) {
        var dateObject = moment(data.lastonline_at);
        data.lastonline_at = dateObject.format("dddd Do MMMM YYYY à HH:mm:ss");
      }
      if (data.lastoffline_at) {
        var dateObject = moment(data.lastoffline_at);
        data.lastoffline_at = dateObject.format("dddd Do MMMM YYYY à HH:mm:ss");
      }
      this.$el.html(this.template({
        user: data
      }));
      return this;
    }
  });

  return UserView;
});