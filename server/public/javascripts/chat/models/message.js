define([
  'underscore',
  'backbone'
], function (_, Backbone) {
  var MessageModel = Backbone.Model.extend({

    defaults: function() {
      return {
        username: '',
        avatar: '',
        date: '',
        message: ''
      };
    }

  });

  return MessageModel;
});