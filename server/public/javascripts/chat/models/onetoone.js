define([
  'underscore',
  'backbone',
  'models/client',
  'models/discussion'
], function (_, Backbone, client, DiscussionModel) {
  var OneToOneModel = DiscussionModel.extend({

    defaults: function() {
      return {
        username: '',
        avatar: '',
        user_id: '',
        type: 'onetoone',
        focused: false,
        unread: 0
      };
    },

    _initialize: function() {
      this.on('remove', this.close);
    },

    close: function(model, collection, options) {
      client.close(model.get('id'));
    }

  });

  return OneToOneModel;
});