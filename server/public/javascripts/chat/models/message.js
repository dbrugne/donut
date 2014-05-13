define([
  'underscore',
  'backbone'
], function (_, Backbone) {
  var MessageModel = Backbone.Model.extend({

    defaults: function() {
      return {
        user_id: '',
        username: '',
        date: '',
        message: ''
      };
    }

  });

  return MessageModel;
});