define([
  'underscore',
  'backbone',
  'models/user'
], function (_, Backbone, UserModel) {
  var RoomUsersCollection = Backbone.Collection.extend({

    model: UserModel,

    comparator: function(model1, model2) {
      var stringCompare = function(str1, str2) {
        return str1.toLowerCase().localeCompare(str2.toLowerCase())
      };

      // both are owner
      if (model1.get('is_owner') && model2.get('is_owner')) {
        return stringCompare(model1.get('username'), model2.get('username'));
      }
      // model1 is owner and model2 not
      if (model1.get('is_owner') && !model2.get('is_owner')) {
        return -1;
      }
      // model2 is owner and model1 not
      if (!model1.get('is_owner') && model2.get('is_owner')) {
        return 1;
      }

      // both are op
      if (model1.get('is_op') && model2.get('is_op')) {
        return stringCompare(model1.get('username'), model2.get('username'));
      }
      // model1 is op and model2 not
      if (model1.get('is_op') && !model2.get('is_op')) {
        return -1;
      }
      // model2 is op and model1 not
      if (!model1.get('is_op') && model2.get('is_op')) {
        return 1;
      }

      // both are standard users
      return stringCompare(model1.get('username'), model2.get('username'));
    },

    initialize: function(options) {
      this.on("change:avatar", this.onChange);
      this.on("change:poster", this.onChange);
      this.on("change:color", this.onChange);
    },

    /**
     * With the following method the UserCollection trigger a 'redraw' event
     * any time a model has changed an attribute.
     * Usefull for 'redraw-pattern' views.
     *
     * @source: http://www.garethelms.org/2012/02/backbone-js-collections-can-listen-to-its-models-changes/
     * @param model
     * @param value
     * @param options
     */
    onChange: function(model, value, options) {
      this.trigger('redraw');
    }

  });

  return RoomUsersCollection;
});