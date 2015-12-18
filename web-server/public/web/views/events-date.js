var $ = require('jquery');
var Backbone = require('backbone');

module.exports = Backbone.View.extend({

  initialize: function () {
    this.render();
  },
  render: function () {
    this.$dateContainer = this.$el.closest('.discussion').find('.date-ctn');
    return this;
  },
  scroll: function (options) {
    // si contenu > viewport (something to scroll)
    // ou au moins un block date > hauteur viewport (not visible)
    // return;

    var currentScrollPosition = options.currentScrollPosition;

    var last = null;
    this.$('.scrollable .block.date').each(function (index) {
      if ($(this).position().top > currentScrollPosition) {
        return false; // break on first visible
      }
      last = $(this); // last not visible
    });

    if (!last) {
      return this.reset();
    }

    this.$dateContainer.find('.ctn').html(last.clone());
  },
  reset: function () {
    this.$dateContainer.find('.ctn').html('');
  },
  markAsViewed: function() {
    var elt = this.$dateContainer.find('.ctn-unviewed');
    elt.find('.unviewed-top').fadeOut(1000, function(){
      elt.html('');
    });
  }
});
