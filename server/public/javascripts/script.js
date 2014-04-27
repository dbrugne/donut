$( document ).ready(function() {

  // Account edit
  //=======================================

  // Alert on account deletion
  $('#delete-button').click(function(event){
    event.preventDefault();
    var alertBox = $('#delete-alert-template').html();
    $(alertBox).find('.delete-alert').alert();
    $('#delete-alert-placeholder').html(alertBox);
  });
  $('#delete-alert-placeholder').on('click', '.confirm', function(event) {
    window.location.href = '/account/delete';
  });

});