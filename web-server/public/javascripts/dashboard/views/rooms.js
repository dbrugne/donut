define([
  'jquery',
  'underscore',
  'backbone',
  'backgrid',
  'collections/rooms',
  'text!templates/rooms.html'
], function ($, _, Backbone, Backgrid, roomsCollection, htmlTemplate) {

  var RoomsView = Backbone.View.extend({

    id: 'rooms',

    template: _.template(htmlTemplate),

    grid: null,
    paginator: null,
    filter: null,

    initialize: function() {
      this.collection = roomsCollection;
      this.listenTo(this.collection, 'reset', this.onReset);
      this.initGrid();
      this.render();
    },
    render: function() {
      // render whole view
      var html = this.template({});
      this.$el.html(html);

      // render grid
      this.$el.find('.grid').append(this.filter.render().el);
      this.$el.find('.grid').append(this.grid.render().el);
      this.$el.find('.grid').append(this.paginator.render().el);
      this.collection.fetch({reset: true});

      return this;
    },

    initGrid: function() {
      // @doc: http://backgridjs.com/
      var columns = [{
        name: "_id",
        label: "#",
        editable: false,
        cell: 'string'
      }, {
        name: "permanent",
        label: "Permanent",
        editable: false,
        cell: "boolean"
      }, {
        name: "name",
        label: "Name",
        editable: false,
        cell: "string"
      }, {
        name: "owner",
        label: "Owner",
        editable: false,
        cell: "string",
        formatter: _.extend({}, Backgrid.CellFormatter.prototype, {
          fromRaw: function (rawValue, model) {
            if (rawValue && rawValue.username)
              return rawValue.username;
            else
              return "";
          }
        })
      }, {
        name: "created_at",
        label: "Created",
        editable: false,
        cell: Backgrid.Extension.MomentCell.extend({
          modelInUTC: true,
          displayFormat: "DD/MM/YYYY à H:m:s",
          displayInUTC: false
        })
      }, {
        name: "lastjoin_at",
        label: "Last joined",
        editable: false,
        cell: Backgrid.Extension.MomentCell.extend({
          modelInUTC: true,
          displayFormat: "DD/MM/YYYY à H:m:s",
          displayInUTC: false
        })
      }, {
        name: "topic",
        label: "Topic",
        editable: false,
        cell: "string"
    }];

      // grid
      this.grid = new Backgrid.Grid({
        columns: columns,
        collection: this.collection
      });

      // pagination
      this.paginator = new Backgrid.Extension.Paginator({
        windowSize: 20, // Default is 10
        slideScale: 0.25, // Default is 0.5
        goBackFirstOnSort: true, // Default is true
        collection: this.collection
      });

      // filter
      this.filter = new Backgrid.Extension.ServerSideFilter({
        name: "q",
        placeholder: "ex: room name",
        collection: this.collection
      });
    },
    onReset: function(collection, options) {
      this.$el.find('h1 .count .num').text(this.collection.state.totalRecords);
    }
  });

  return RoomsView;
});