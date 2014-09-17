(function ( $ ) {

  $.fn.momentify = function(format) {

    format = format || 'fromnow';

    return this.each(function() {
      if (!window.moment) return this;
      var element = $(this);
      var time = element.data('time');
      if (!time) return this;

      var dateObject = moment(time);

      if (format == 'fromnow') {
        element.text(dateObject.fromNow());
      } else if (format == 'date') {
        element.text(dateObject.format("dddd Do MMMM YYYY"));
      }

      element.attr('title', dateObject.format("dddd Do MMMM YYYY à hh:mm:ss"));
    });

  };

}( jQuery ));