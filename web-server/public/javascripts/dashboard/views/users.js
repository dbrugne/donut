define([
  'jquery',
  'underscore',
  'backbone',
  'backgrid',
  'collections/users',
  'text!templates/users.html'
], function ($, _, Backbone, Backgrid, usersCollection, htmlTemplate) {

  var UsersView = Backbone.View.extend({

    id: 'users',

    template: _.template(htmlTemplate),

    grid: null,
    paginator: null,
    filter: null,

    initialize: function() {
      this.collection = usersCollection;
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
        name: "admin",
        label: "Administrator",
        editable: false,
        cell: "boolean"
      }, {
        name: "username",
        label: "Username",
        editable: false,
        cell: "string"
      }, {
        name: "name",
        label: "Name",
        editable: false,
        cell: "string",
        formatter: _.extend({}, Backgrid.CellFormatter.prototype, {
          fromRaw: function (rawValue, model) {
            if (rawValue)
              return rawValue;

            if (model.get('facebook') && model.get('facebook').name)
              return model.get('facebook').name+' (facebook)';

            return "";
          }
        })
      }, {
        name: "facebook",
        label: "Facebook",
        editable: false,
        cell: "boolean"
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
        name: "lastlogin_at",
        label: "Last login",
        editable: false,
        cell: Backgrid.Extension.MomentCell.extend({
          modelInUTC: true,
          displayFormat: "DD/MM/YYYY à H:m:s",
          displayInUTC: false
        })
      }, {
        name: "lastonline_at",
        label: "Last time online",
        editable: false,
        cell: Backgrid.Extension.MomentCell.extend({
          modelInUTC: true,
          displayFormat: "DD/MM/YYYY à H:m:s",
          displayInUTC: false
        })
      }, {
        name: "lastoffline_at",
        label: "Last time offline",
        editable: false,
        cell: Backgrid.Extension.MomentCell.extend({
          modelInUTC: true,
          displayFormat: "DD/MM/YYYY à H:m:s",
          displayInUTC: false
        })
      }, {
        name: "online",
        label: "Is online?",
        editable: false,
        cell: "boolean"
      }, {
        name: "actions",
        label: "Actions",
        editable: false,
        sortable: false,
        cell: Backgrid.Cell.extend({
          template: _.template("<a href='#user/<%= id %>' class='view-action'>voir</a>"),
          className: "action-cell",
          events: {
          },
          render: function () {
            this.$el.html(this.template({
              id: this.model.get('_id')
            }));
            this.delegateEvents();
            return this;
          }
        })
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
        placeholder: "ex: username",
        collection: this.collection
      });
    },
    onReset: function(collection, options) {
      this.$el.find('h1 .count .num').text(this.collection.state.totalRecords);
    }
  });

  return UsersView;
});