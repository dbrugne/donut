define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/room-block.html'
], function ($, _, Backbone, blockTemplate) {
  var RoomBlockView = Backbone.View.extend({

    el: $("#block-rooms"),

    template: _.template(blockTemplate),

    events: {
      "click .close": "closeThis"
    },

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onAddRemove);
      this.listenTo(this.collection, 'remove', this.onAddRemove);
      this.listenTo(this.collection, 'refreshTabs', this.render);

      this.render();
    },

    onAddRemove: function(model, collection, options) {
      if (model.get('type') != 'room') return;
      this.render();
    },

    render: function() {
      // @todo : sort collection
      var listObjects = _.filter(this.collection.models, function(m){
        return m.get('type') == 'room';
      });
      var listJSON = [];
      _.each(listObjects, function(o) {
        var userCount = o.users.length;
        var json = o.toJSON();
        json.users = userCount; // users are not an "attribute", but an object properties
        listJSON.push(json);
      });

      var html = this.template({list: listJSON});
      this.$el.html(html);
      return this;
    }

  });

  return RoomBlockView;
});