var $ = require('jquery');
var Backbone = require('backbone');

module.exports = Backbone.View.extend({

  initialize: function () {
    this.render();
  },
  render: function () {
    this.$ctn = this.$('.date-ctn .ctn');
    this.$scrollable = this.$('.scrollable');
    return this;
  },
  scroll: function (options) {
    // si contenu > viewport (something to scroll)
    // ou au moins un block date > hauteur viewport (not visible)
    // return;

    var currentScrollPosition = options.currentScrollPosition;

    var last = null;
    this.$scrollable.find('.block.date').each(function (index) {
      if ($(this).position().top > currentScrollPosition) {
        return false; // break on first visible
      }
      last = $(this); // last not visible
    });

    if (!last) {
      return this.reset();
    }

    this.$ctn.html(last.clone());
  },
  reset: function () {
    this.$ctn.html('');
  }
});
