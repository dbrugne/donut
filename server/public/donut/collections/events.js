define([
  'underscore',
  'backbone',
  'models/event'
], function (_, Backbone, EventModel) {
  var EventsCollection = Backbone.Collection.extend({

    comparator: 'time',

    initialize: function(options) {

    },

    /**
     * Add an EventModel to the collection at the right index
     *
     * @param event object with at least valid 'type' key
     */
    addEvent: function(event) {

      // create a new model
      var data = (event.data)
        ? event.data
        : {};

      var id = (data.id)
        ? data.id
        : _.uniqueId('auto_');

      var time = (data.time)
        ? data.time
        : Date.now();

      data.id = id; // hello/disconnected/... special cases
      data.time = time; // hello/disconnected/... special cases
      var model = new EventModel({
        id: id,
        type: event.type,
        time: time,
        data: data
      });

      // (auto-sorted by comparator)
      this.add(model);
    },

    sameBlockAsPrevious: function(model) {
      var previous = this.at(this.indexOf(model) - 1);
      if (!previous)
        return false;

      if (model.getGenericType() != previous.getGenericType())
       return false;

      if (model.getGenericType() == 'message') {
        if (model.get('data').username != previous.get('data').username) {
          return false;
        }
      }

      return true;
    },

    sameBlockAsNext: function(model) {
      var next = this.at(this.indexOf(model) + 1);
      if (!next)
        return false;

      if (model.getGenericType() != next.getGenericType())
        return false;

      if (model.getGenericType() == 'message') {
        if (model.get('data').username != next.get('data').username) {
          return false;
        }
      }

      return true;
    }

  });

  return EventsCollection;
});