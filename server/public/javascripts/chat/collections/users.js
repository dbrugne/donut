define([
  'underscore',
  'backbone',
  'models/user'
], function (_, Backbone, UserModel) {
  var UsersCollection = Backbone.Collection.extend({
    model: UserModel,
    comparator: function(model1, model2) {
      return model1.get('username').toLowerCase()
        .localeCompare(model2.get('username').toLowerCase());
    }
  });

  return UsersCollection;
});