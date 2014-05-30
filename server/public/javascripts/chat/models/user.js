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
    }
  });

  return UserModel;
});