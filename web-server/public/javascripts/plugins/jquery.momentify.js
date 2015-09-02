(function ($) {
  'use strict';
  $.fn.momentify = function (format) {

    format = format || 'fromnow';

    return this.each(function () {
      if (!window.moment) return this;
      var element = $(this);
      var time = element.attr('data-time');
      if (!time) return this;

      var dateObject = window.moment(time);

      if (format === 'fromnow') {
        element.text(dateObject.fromNow());
      } else if (format === 'date') {
        element.text(dateObject.format('dddd Do MMMM YYYY'));
      }

      element.attr('title', dateObject.format('dddd Do MMMM YYYY à HH:mm:ss'));
    });

  };

}(window.jQuery));
