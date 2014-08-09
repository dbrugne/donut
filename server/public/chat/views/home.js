define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/home-rooms',
  'views/home-users',
  'text!templates/home.html'
], function ($, _, Backbone, client, RoomsView, UsersView, homeTemplate) {
  var HomeView = Backbone.View.extend({

    el: $('#home'),

    template: _.template(homeTemplate),

    initialize: function(options) {
      this.listenTo(client, 'home', this.onHome);

      this.render();

      this.roomsView = new RoomsView({el: this.$el.find('.rooms')});
      this.usersView = new UsersView({el: this.$el.find('.users')});
//      this.searchView = new SearchView({el: this.$el.find('.searc')});
    },
    render: function() {
      var html = this.template({});
      this.$el.html(html);
      return this;
    },
    onHome: function(data) {

      if (data.rooms && data.rooms.length)
        this.roomsView.render(data.rooms);

      if (data.users && data.users.length)
        this.usersView.render(data.users);

    }

  });

  return HomeView;
});
