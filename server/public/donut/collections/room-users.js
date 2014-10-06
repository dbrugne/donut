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

      // create strings (sortable as string: aabfoobar)
      var string1 = '';
      string1 += (model1.get('status') == 'online') ? 'a' : 'b';
      string1 += (model1.get('is_owner')) ? 'a' : 'b';
      string1 += (model1.get('is_op')) ? 'a' : 'b';
      string1 += model1.get('username').toLowerCase();
      var string2 = '';
      string2 += (model2.get('status') == 'online') ? 'a' : 'b';
      string2 += (model2.get('is_owner')) ? 'a' : 'b';
      string2 += (model2.get('is_op')) ? 'a' : 'b';
      string2 += model2.get('username').toLowerCase();

      return string1.toLowerCase().localeCompare(string2.toLowerCase());
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