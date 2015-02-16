define([
  'jquery',
  'underscore',
  'backbone',
  'backgrid',
  'text!templates/logs.html',
  'text!templates/log.html'
], function ($, _, Backbone, Backgrid, logsTemplate, logTemplate) {

  var LogsView = Backbone.View.extend({

    id: 'logs',

    template: _.template(logsTemplate),

    logTemplate: _.template(logTemplate),

    events: {
      'click .refresh': 'onRefresh',
      'click .filter label': 'onRefresh'
    },

    initialize: function (options) {
      this.render();
    },
    render: function () {
      // render whole view
      var html = this.template({});
      this.$el.html(html);
      this.$logs = this.$el.find('tbody');

      this.fetch();
      return this;
    },
    fetch: function() {
      $.ajax({
        url: "/rest/logs",
        context: this,
        data: this.getFilters()
      }).done(function(data, textStatus, jqXHR) {
        this.renderData(data);
      });
    },
    renderData: function(data) {
      if (data.length < 1)
        this.$logs.prepend('<tr class="nomore"><td colspan="5" class="renderable">no more (wait and retry)</td></tr>');
      else
        this.$logs.prepend('<tr class="fresh"><td colspan="5" class="renderable">fresh logs above</td></tr>');
      _.each(data, function(log) {
        var html = this.logTemplate({log: log});
        var $td = $(html).prependTo(this.$logs);
        if (_.isObject(log.data)) {
          $td.find('td.data').JSONView(log.data, { collapsed: true });
        } else {
          $td.find('td.data').text(log.data);
        }
      }, this);
    },
    getFilters: function() {
      var filters = {};

      // start
      var first = this.$logs.find('tr[data-id]').first();
      if (first && first.length > 0)
        filters.start = first.attr('data-id');

      // category
      var category = this.$el.find('.filter .category .active input').val();
      if (category !== 'all')
        filters.category = category;

      // level
      var level = this.$el.find('.filter .level .active input').val();
      if (level !== 'all')
        filters.level = level;

      console.log(filters);
      return filters;
    },
    onRefresh: function(event) {
      var that = this;
      _.defer(function() { // defered due to the button group bootstrap animation
        that.fetch();
      });
    }
  });

  return LogsView;
});