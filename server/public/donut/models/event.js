define([
  'underscore',
  'backbone'
], function (_, Backbone) {
  var EventModel = Backbone.Model.extend({

    default: function() {
      return {
        // id
        type: '',
        time: '',
        data: ''
      };
    },

    initialize: function(options) {

    },

    getGenericType: function() {
      if ([
        'room:message',
        'user:message'
      ].indexOf(this.get('type')) !== -1)
        return 'message';
      else if ([
        'room:in',
        'room:out',
        'user:online',
        'user:offline'
      ].indexOf(this.get('type')) !== -1)
        return 'inout';
      else
        return 'standard';
    }

  });

  return EventModel;
});