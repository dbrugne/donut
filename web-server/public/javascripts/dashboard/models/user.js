define([
  'underscore',
  'backbone'
], function (_, Backbone) {
  var UserModel = Backbone.Model.extend({

    idAttribute : "_id",
    urlRoot: "/rest/users",
    defaults : {
      _id: null
    },
    initialize: function(options) {
    }

  });

  return UserModel;
});