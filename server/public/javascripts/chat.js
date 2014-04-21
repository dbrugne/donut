$(document).ready(function() {

    /**
     * Alert on account deletion
     */
    $('#delete-button').click(function(event){
        event.preventDefault();
        var alertBox = $('#delete-alert-template').html();
        $(alertBox).find('.delete-alert').alert();
        $('#delete-alert-placeholder').html(alertBox);
    });
    $('#delete-alert-placeholder').on('click', '.confirm', function(event) {
        window.location.href = '/account/delete';
    });

//    $('#account-edit-submit').click(function(event) {
//        var errors;
//
//        var username = $('#username-field').val();
//        if (!validator.matches(/^[-a-z0-9_\\|[\]{}^`]{2,30}$/i)) {
//            error = true;
//        }
//
//        var bio = $('#bio-field').val();
//        if (!validator.isLength(bio, 0, 200)) {
//            error = true;
//        }
//
//        var location = $('#location-field').val();
//        if (!validator.isLength(location, 0, 70)) {
//            error = true;
//        }
//
//        var location = $('#location-field').val();
//        if (!validator.isURL(location)) {
//            error = true;
//        }
//
//        if (errors) {
//            return false;
//        }
//    });

    /*$('#email-modal-link').click(function(event) {
      $('#email-modal').modal();
    });

    $('#password-modal-link').click(function(event) {
        $('#password-modal').modal();
    });*/

});