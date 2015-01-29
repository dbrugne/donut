define([
  'underscore',
  'backbone',
  'models/room'
], function (_, Backbone, RoomModel) {
  var RoomsCollection = Backbone.PageableCollection.extend({

    model: RoomModel,
    url: '/rest/rooms',
    state: {
      pageSize: 100,
      sortKey: "name",
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

  return new RoomsCollection();
});