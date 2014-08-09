define([
  'underscore',
  'backbone',
  'models/user'
], function (_, Backbone, UserModel) {
  var UsersCollection = Backbone.Collection.extend({

    model: UserModel,

    comparator: function(model1, model2) {
      return model1.get('username').toLowerCase()
        .localeCompare(model2.get('username').toLowerCase());
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

  return UsersCollection;
});