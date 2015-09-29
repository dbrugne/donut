(function ($) {
  'use strict';

  var Modal;
  Modal = {
    initialized: false,

    isShown: false,

    init: function ($element, $contactform, options) {
      var that = this;
      this.options = options;
      this.$element = $element;

      // modal
      this.$contactform = $contactform;
      this.$contactform.modal(options);
      this.$contactform.on('show.bs.modal', function (event) {
        that.isShown = true;
      });
      this.$contactform.on('shown.bs.modal', function (event) {
        window.grecaptcha.render('contact-form-recaptcha', {
          sitekey: window.recaptcha_site_key
        });
      });
      this.$contactform.on('hide.bs.modal', function (event) {
        that.isShown = false;
      });
      this.$contactform.on('hidden.bs.modal', function (event) {
        that.reset();
      });

      // form
      this.$name = this.$contactform.find('[name="name"]');
      this.$email = this.$contactform.find('[name="email"]');
      this.$message = this.$contactform.find('[name="message"]');
      this.$sent = this.$contactform.find('.sent');
      this.$error = this.$contactform.find('.error');
      this.$fail = this.$contactform.find('.fail');
      this.$contactform.find('.send').on('click', function (event) {
        event.preventDefault();
        if (that.validate()) {
          that.send();
        }
      });

      this.initialized = true;
    },

    show: function () {
      if (this.isShown === true) {
        return;
      }

      this.$contactform.modal('show');
    },

    hide: function () {
      if (this.isShown !== true) {
        return;
      }

      this.$contactform.modal('hide');
    },

    validate: function () {
      var error = false;

      if (this.$name.val() === '') {
        error = true;
      }

      if (this.$email.val() === '' || !this.validateEmail(this.$email.val())) {
        error = true;
      }

      if (this.$message.val() === '') {
        error = true;
      }

      if (!window.grecaptcha.getResponse()) {
        error = true;
      }

      if (error) {
        this.toggleError();
        return false;
      }

      return true;
    },

    send: function () {
      var data = {
        name: this.$name.val(),
        email: this.$email.val(),
        message: this.$message.val(),
        recaptcha: window.grecaptcha.getResponse()
      };
      $.ajax({
        url: '/contact-form',
        type: 'POST',
        context: this,
        data: data
      })
        .fail(function (jqXHR, textStatus, errorThrown) {
          this.toggleFail();
        })
        .done(function (data, textStatus, jqXHR) {
          if (!data || !data.sent) {
            return this.toggleFail();
          }

          this.reset();
          this.toggleSent();
        });
    },

    toggleError: function () {
      this.$sent.hide();
      this.$fail.hide();
      this.$error.show();
    },
    toggleFail: function () {
      this.$error.hide();
      this.$sent.hide();
      this.$fail.show();
    },
    toggleSent: function () {
      this.$error.hide();
      this.$fail.hide();
      this.$sent.show();
    },
    reset: function () {
      this.$error.hide();
      this.$sent.hide();
      this.$fail.hide();
      this.$name.val('');
      this.$email.val('');
      this.$message.val('');
      window.grecaptcha.reset();
    },

    validateEmail: function (email) {
      var at = email.lastIndexOf('@');

      // Make sure the at (@) sybmol exists and
      // it is not the first or last character
      if (at < 1 || (at + 1) === email.length) {
        return false;
      }

      // Make sure there aren't multiple periods together
      if (/(\.{2,})/.test(email)) {
        return false;
      }

      // Break up the local and domain portions
      var local = email.substring(0, at);
      var domain = email.substring(at + 1);

      // Check lengths
      if (local.length < 1 || local.length > 64 || domain.length < 4 || domain.length > 255) {
        return false;
      }

      // Make sure local and domain don't start with or end with a period
      if (/(^\.|\.$)/.test(local) || /(^\.|\.$)/.test(domain)) {
        return false;
      }

      // Check for quoted-string addresses
      // Since almost anything is allowed in a quoted-string address,
      // we're just going to let them go through
      if (!/^"(.+)"$/.test(local)) {
        // It's a dot-string address...check for valid characters
        if (!/^[-a-zA-Z0-9!#$%*\/?|^{}`~&'+=_\.]*$/.test(local)) {
          return false;
        }
      }

      // Make sure domain contains only valid characters and at least one period
      return !(!/^[-a-zA-Z0-9\.]*$/.test(domain) || domain.indexOf('.') === -1);
    }

  };

  $.fn.contactform = function (opts) {
    var options = $.extend({
      backdrop: true,
      keyboard: true,
      show: false
    }, opts);

    // modal is shared by all contactform links
    var modal = Modal;

    window.cf = modal;

    return this.each(function () {
      var $this = $(this);
      $this.on('click', function (event) {
        event.preventDefault();

        if (!modal.initialized) { // first click
          var $contactform = $('#contactform');
          if (!$contactform && !$contactform.length) {
            return; // unable to find modal content
          }

          modal.init($this, $contactform, options);
        }

        modal.show();
      });
    });
  };
})(window.jQuery);
