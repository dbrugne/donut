define([
  'jquery',
  'underscore',
  'backbone',
  'moment',
  'keen-js',
  'text!templates/home.html'
], function ($, _, Backbone, moment, Keen, htmlTemplate) {

  var HomeView = Backbone.View.extend({

    id: 'home',

    template: _.template(htmlTemplate),

    events: {
      "click .refresh": 'onRefresh'
    },

    initialize: function() {
      window.test = Keen;
      this.keen = new Keen({
        projectId: window.keenio_projectId,
        readKey: window.keenio_readKey
      });
    },
    render: function() {
      var html = this.template({data: {}});
      this.$el.html(html);
      this.renderChart();
      this.renderMetrics();
      return this;
    },
    renderMetrics: function() {
      $.ajax('/rest/home', {
        context: this,
        success: function(data) {
          if (data.time) {
            var dateObject = moment(data.time);
            data.refreshed = dateObject.format("Do/MM/YYYY à HH:mm:ss");
          }

          new Keen.Dataviz()
              .el(document.getElementById('keen-users'))
              .parseRawData({ result: data.users.total })
              .chartType("metric")
              .colors(["#6ab975"])
              .chartOptions({prettyNumber: false})
              .title("Total Users")
              .render();
          new Keen.Dataviz()
              .el(document.getElementById('keen-rooms'))
              .parseRawData({ result: data.rooms.total })
              .chartType("metric")
              .colors(["#56c5d1"])
              .title("Total Rooms")
              .chartOptions({prettyNumber: false})
              .render();
          new Keen.Dataviz()
              .el(document.getElementById('keen-messages'))
              .parseRawData({ result: (data.messages.total) })
              .chartType("metric")
              .colors(["#b365d4"])
              .title("Total Messages")
              .render();
        }
      });
    },
    renderChart: function() {
      /**
       * MESSAGES
       */
      var messagesChart = new Keen.Dataviz()
          .el($('#keen-messages-trend').get(0))
          .chartType("linechart")
          .title("Messages (weekly)")
          .attributes({ height: 280 })
          .prepare();

      var countRoom = new Keen.Query("count", {
        eventCollection: "room_message",
        interval: "weekly",
        timeframe: "previous_6_months"
      });
      var countOne = new Keen.Query("count", {
        eventCollection: "onetoone_message",
        interval: "weekly",
        timeframe: "previous_6_months"
      });

      var req = this.keen.run([countRoom, countOne], function(err, res){
        if (err)
          messagesChart.error(err.message);

        var result1 = res[0].result  // data from first query
        var result2 = res[1].result  // data from second query
        var data = []  // place for combined results
        var i= 0;
        while (i < result1.length) {

          data[i] = { // format the data so it can be charted
            timeframe: result1[i]["timeframe"],
            value: [
              { category: "Room", result: result1[i]["value"] },
              { category: "OneToOne", result: result2[i]["value"] }
            ]
          }
          if (i == result1.length-1) { // chart the data
            messagesChart
                .parseRawData({ result: data })
                .render();
          }
          i++;
        }
      });

      /**
       * SESSION
       */
      var count = new Keen.Query("count", {
        eventCollection: "session_start",
        interval: "weekly",
        timeframe: "previous_6_months"
      });
      this.keen.draw(count, $('#keen-sessions-trend').get(0), {
        chartType: "linechart",
        title: "Sessions (weekly)",
        height: 280
      });

      /**
       * ROOMS
       */
      var count = new Keen.Query("count", {
        eventCollection: "room_creation",
        interval: "weekly",
        timeframe: "previous_6_months"
      });
      this.keen.draw(count, $('#keen-rooms-trend').get(0), {
        chartType: "linechart",
        title: "Rooms creation (weekly)",
        height: 280
      });

      /**
       * SIGNUPS
       */
      var signupsChart = new Keen.Dataviz()
          .el($('#keen-users-trend').get(0))
          .chartType("linechart")
          .title("Users signup (weekly)")
          .attributes({ height: 280 })
          .prepare();
      var countTotal = new Keen.Query("count", {
        eventCollection: "user_signup",
        interval: "weekly",
        timeframe: "previous_6_months"
      });
      var countEmail = new Keen.Query("count", {
        eventCollection: "user_signup",
        interval: "weekly",
        timeframe: "previous_6_months",
        filters: [{
          "property_name" : "method",
          "operator" : "eq",
          "property_value" : "email"
        }]
      });
      var countFacebook = new Keen.Query("count", {
        eventCollection: "user_signup",
        interval: "weekly",
        timeframe: "previous_6_months",
        filters: [{
          "property_name" : "method",
          "operator" : "eq",
          "property_value" : "facebook"
        }]
      });

      var req = this.keen.run([countTotal,countEmail,countFacebook], function(err, res){
        if (err)
          signupsChart.error(err.message);

        var result1 = res[0].result  // data from first query
        var result2 = res[1].result  // data from second query
        var result3 = res[2].result  // data from second query
        var data = []  // place for combined results
        var i= 0;
        while (i < result1.length) {

          data[i] = { // format the data so it can be charted
            timeframe: result1[i]["timeframe"],
            value: [
              { category: "(all)", result: result1[i]["value"] },
              { category: "Email", result: result2[i]["value"] },
              { category: "Facebook", result: result3[i]["value"] },
            ]
          }
          if (i == result1.length-1) { // chart the data
            signupsChart
                .parseRawData({ result: data })
                .render();
          }
          i++;
        }
      });
    },
    onRefresh: function(e) {
      this.render();
    }
  });

  return HomeView;
});