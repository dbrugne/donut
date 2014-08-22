$(document).ready(function() {

  // ACCOUNT ==================================================================
  // ==========================================================================
  if ($('#account').length) {

    // Alert on account deletion
    $('#delete-button').click(function (event) {
      event.preventDefault();
      var alertBox = $('#delete-alert-template').html();
      $(alertBox).find('.delete-alert').alert();
      $('#delete-alert-placeholder').html(alertBox);
    });
    $('#delete-alert-placeholder').on('click', '.confirm', function (event) {
      window.location.href = '/account/delete';
    });

  }

  // USER AND ROOM PROFILE ====================================================
  // ==========================================================================
  if ($('#profile').length) {
    $('.website').linkify();
    $('.users .website .linkified').each(function() {
      var text = this.innerText;
      if (text.indexOf('://') === -1)
        return;

      text = text.replace(/.*?:\/\//g, "");

      if (text.length > 30)
        text = text.substr(0, 27) + '...';

      this.innerText = text;
    });
  }

});