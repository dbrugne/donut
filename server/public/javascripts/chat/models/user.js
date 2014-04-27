define([
  'underscore',
  'backbone'
], function (_, Backbone) {
  var UserModel = Backbone.Model.extend({
    defaults: function() {
      return {
        user_id: '',
        username: '',
        avatar: ''
      };
    }
  });

  return UserModel;
});