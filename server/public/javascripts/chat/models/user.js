define([
  'underscore',
  'backbone',
  'jquery'
], function (_, Backbone, $) {
  var UserModel = Backbone.Model.extend({
    defaults: function() {
      return {
        user_id: '',
        username: ''
      };
    },
    avatarUrl: function() {
      return $.cloudinary.url(this.get('user_id'), {crop: 'fill', width: 20, height: 20, default_image:''})
    }
  });

  return UserModel;
});