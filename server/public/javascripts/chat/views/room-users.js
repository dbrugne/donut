define([
  'jquery',
  'underscore',
  'backbone',
  'models/current-user',
  'text!templates/room-users.html'
], function ($, _, Backbone, currentUser, roomUsersTemplate) {
  var RoomUsersView = Backbone.View.extend({

    template: _.template(roomUsersTemplate),

    initialize: function() {
      this.listenTo(this.collection, 'add', this.onAddRemove);
      this.listenTo(this.collection, 'remove', this.onAddRemove);
      this.listenTo(this.collection, 'redraw', this.render);

      this.render();
    },
    render: function() {
      var listJSON = [];
      var that = this;
      _.each(this.collection.models, function(o) {
        var u = o.toJSON();

        // Is owner?
        var owner = that.model.get('owner');
        if (owner && owner.get('user_id').indexOf(o.get('user_id')) !== -1)
          u.owner = true;

        // Is OP?
        if (that.model.get('op').indexOf(o.get('user_id')) !== -1)
          u.op = true;

        listJSON.push(u);
      });

      // hack
      for (var i=0; i <= 3 ; i ++) {
        $.each(listJSON, function() {
          listJSON.push(this);
        });
      }
      // hack

      var html = this.template({
        list: listJSON,
        isOwner: this.model.currentUserIsOwner(),
        isOp: this.model.currentUserIsOp()
      });
      this.$el.html(html);
      return this;
    },
    onAddRemove: function(model, collection, options) {
      this.render();
    }
  });

  return RoomUsersView;
});