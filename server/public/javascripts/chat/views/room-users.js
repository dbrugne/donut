define([
  'jquery',
  'underscore',
  'backbone',
  'models/current-user',
  'text!templates/room-users.html',
  'text!templates/room-users-list.html'
], function ($, _, Backbone, currentUser, roomUsersTemplate, listTemplate) {
  var RoomUsersView = Backbone.View.extend({

    template: _.template(roomUsersTemplate),

    listTemplate: _.template(listTemplate),

    initialize: function() {
      this.listenTo(this.collection, 'add', this.onAddRemove);
      this.listenTo(this.collection, 'remove', this.onAddRemove);
      this.listenTo(this.collection, 'redraw', this.render);

      this.initialRender();
    },
    initialRender: function() {
      var html = this.template({});
      this.$el.html(html);
      this.$count = this.$el.find('.count');
      this.$list = this.$el.find('.list');
      this.$list.scroller();
      this.$scrollContent = this.$list.find('.scroller-content');
      return this.render();
    },
    render: function() {
      // update user count
      var countHtml = '<strong>'+this.collection.models.length+'</strong> user';
      countHtml += (this.collection.models.length > 1)
        ? 's'
        : '';
      this.$count.html(countHtml);

      // redraw user list
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

      var html = this.listTemplate({
        list: listJSON,
        isOwner: this.model.currentUserIsOwner(),
        isOp: this.model.currentUserIsOp()
      });
      this.$scrollContent.html(html);
      this.$list.scroller('reset');
      return this;
    },
    onAddRemove: function(model, collection, options) {
      this.render();
    }
  });

  return RoomUsersView;
});