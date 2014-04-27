define([
  'underscore',
  'backbone',
  'models/user'
], function (_, Backbone, UserModel) {
  var UsersCollection = Backbone.Collection.extend({
    model: UserModel
  });

  return UsersCollection;
});