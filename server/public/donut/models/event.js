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
        return 'message'+this.get('data').username;
      else if ([
        'room:in',
        'room:out',
        'user:online',
        'user:offline'
      ].indexOf(this.get('type')) !== -1)
        return 'inout';
      else
        return 'standard';
    },

    sameBlockAsModel: function(model) {
      var type = this.getGenericType();
      var modelType = model.getGenericType();

      if (type == 'standard' || modelType == 'standard')
        return false;

      if (type != modelType)
        return false;

      if (type == 'message' && modelType == 'message'
        && (this.get('data').username != model.get('data').username))
        return false;

      return true;
    }

  });

  return EventModel;
});