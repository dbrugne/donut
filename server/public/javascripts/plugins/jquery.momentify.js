(function ( $ ) {

  $.fn.momentify = function() {

    return this.each(function() {
      if (!window.moment) return this;
      var element = $(this);
      var time = element.data('time');
      if (!time) return this;

      var dateObject = moment(time);

      element.text(dateObject.fromNow());
      element.attr('title', dateObject.format("dddd Do MMMM YYYY à hh:mm:ss"));
    });

  };

}( jQuery ));