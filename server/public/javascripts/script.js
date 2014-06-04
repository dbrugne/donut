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

  // ACCOUNT OR ROOM EDIT =====================================================
  // ==========================================================================
  if ($('#account-edit').length || $('#room-edit').length) {

    /**
     * Color picker
     */
    var defaultColor = $('#color-field').val();
    $('.color-input .preview').css('background-color','#' + defaultColor);
    $('#color-field').colpick({
      color: defaultColor ? defaultColor : 'ffffff',
      layout:'hex',
      submit:0,
      onChange: function(hsb,hex,rgb,el,bySetColor) {
        $(el).closest('.color-input').find('.preview').css('background-color','#'+hex);
        // Fill the text box just if the color was set using the picker, and not the colpickSetColor function.
        if(!bySetColor) $(el).val(hex);
      }
    }).keyup(function(){
      $(this).colpickSetColor(this.value);
    });
    $('.color-input .preview').click(function() {
      $('#color-field').trigger('click');
    });

    /**
     * Default avatar display
     */
    $.cloudinary.config({
      cloud_name: window.cloudinary_cloud_name,
      api_key: window.cloudinary_api_key
    });
    $('.uploader-form').hide();
    $('.uploader-progress').hide()
    var current = $('.uploader-current').data('current');
    if (current) {
      $('.uploader-current .current').html(
        $.cloudinary.image(current, {
          transformation: 'user-avatar-medium'
        })
      );
    } else {
      $('.uploader-current .current').text('No avatar,');
    }
    $('.uploader-show-form').click(function(event) {
      $('.uploader-current').hide();
      $('.uploader-progress').hide();
      $('.uploader-form').show();
      updateProgress('reset');
    });
    $('.uploader-cancel-form').click(function(event) {
      $('.uploader-current').show();
      $('.uploader-form').hide();
      $('.uploader-progress').hide();
      updateProgress('reset');
    });
    $('.uploader-delete').click(function(event) {
      $('.uploader-current .current').text('No avatar,');
      $("input[type='hidden'][name='user[fields][avatar]']").remove();
      $("input[type='hidden'][name='user[fields][avatarversion]']").val('');
      $("input[type='hidden'][name='user[fields][avatardelete]']").val('true');
    });

    /**
     * Avatar upload
     */
    $('.cloudinary-fileupload').fileupload({
      start: function (e) {
        $('.uploader-form').hide();
        $('.uploader-progress').show();
        updateProgress(0);
      },
      progress: function (e, data) {
        updateProgress(
          Math.round((data.loaded * 100.0) / data.total)
        );
      },
      fail: function (e, data) {
        console.log(data);
        updateProgress('fail');
      }
    })
      .off('cloudinarydone')
      .on('cloudinarydone', function (e, data) {
        $('.uploader-current .current').html(
          $.cloudinary.image(data.result.public_id, {
            format: data.result.format,
            version: data.result.version,
            transformation: 'user-avatar-medium'
          })
        );
        $("input[type='hidden'][name='user[fields][avatarversion]']").val(data.result.version);
        $("input[type='hidden'][name='user[fields][avatardelete]']").val('');
        $('.uploader-progress').hide();
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