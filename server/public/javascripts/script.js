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

  // ACCOUNT EDIT =============================================================
  // ==========================================================================
  if ($('#account-edit').length) {
    // @todo : form validator implementation

    /**
     * Default avatar display
     */
    $.cloudinary.config({ cloud_name: 'roomly', api_key: '962274636195222'});
    $('.uploader-form').hide();
    var current = $('.uploader-current').data('current');
    if (current) {
      $('.uploader-current .current').html(
        $.cloudinary.image(current, {
          // @todo : move params in configuration
          crop: 'fill', width: 50, height: 50
        })
      );
    } else {
      $('.uploader-current .current').text('No avatar,');
    }
    $('.uploader-show-form').click(function(event) {
      $('.uploader-current').hide();
      $('.uploader-form').show();
      updateProgress('reset');
    });
    $('.uploader-cancel-form').click(function(event) {
      $('.uploader-current').show();
      $('.uploader-form').hide();
      updateProgress('reset');
      $('input[type="hidden"][name="user[fields][avatar]"]').remove();
    });

    /**
     * Avatar upload
     */
      // @todo : delete picture
      // @todo : move params in configuration
    $('.cloudinary-fileupload').fileupload({
      imageMaxWidth: 800,
      imageMaxHeight: 600,
      acceptFileTypes: /(\.|\/)(gif|jpe?g|png|bmp|ico)$/i,
      maxFileSize: 10000000, // 10MB
      start: function (e) {
        console.log('start');
        $('.cloudinary-fileupload').hide();
        updateProgress(0);
      },
      progress: function (e, data) {
        console.log('progress');
        updateProgress(
          Math.round((data.loaded * 100.0) / data.total)
        );
      },
      fail: function (e, data) {
        console.log('fail');
        updateProgress('fail');
      }
    })
      .off('cloudinarydone')
      .on('cloudinarydone', function (e, data) {
        console.log('done');
        $('.uploader-current .current').html(
          $.cloudinary.image(data.result.public_id, {
            format: data.result.format,
            version: data.result.version,
            crop: 'fill', width: 50, height: 50
          })
        );
        $('.uploader-form').hide();
        $('.uploader-current').show();
      });

    /**
     * Progress bar helper
     */
    function updateProgress(progress) {
      var width, text, cssClass, visibility;
      if (progress == 'reset') {
        width = '0';
        text = '0% complete';
        cssClass = 'progress-bar';
        visibility = 'hide';
      } else if (progress == 'fail') {
        width = '100%';
        text = 'Upload failed';
        cssClass = 'progress-bar progress-bar-warning';
        visibility = 'show';
      } else if (progress < 100) {
        width = progress+'%';
        text = progress+'% complete';
        cssClass = 'progress-bar';
        visibility = 'show';
      } else {
        width = '100%';
        text = 'Upload done, wait picture processing';
        cssClass = 'progress-bar progress-bar-success';
        visibility = 'show';
      }
      $('.progress-bar')
        .css('width', progress+'%')
        .removeClass()
        .addClass(cssClass)
        .text(text);
      if (visibility == 'show') {
        $('.progress').show();
      } else {
        $('.progress').hide();
      }
    }
  }

});