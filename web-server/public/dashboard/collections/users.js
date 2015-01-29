define([
  'underscore',
  'backbone',
  'models/user'
], function (_, Backbone, UserModel) {
  var UsersCollection = Backbone.PageableCollection.extend({

    model: UserModel,
    url: '/rest/users',
    state: {
      pageSize: 100,
      sortKey: "username",
      order: -1
    },
    parseState: function (response, queryParams, state, options) {
      return {totalRecords: response.totalRecords};
    },
    parseRecords: function (response, options) {
      return response.items;
    },
    initialize: function(options) {
    }

  });

  return new UsersCollection();
});