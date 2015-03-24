/* ===========================================================
 * bootstrap-modal.js v2.2.5
 * ===========================================================
 * Copyright 2012 Jordan Schroter
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

  "use strict"; // jshint ;_;

  var Modal = {

    initialized: false,

    isShown: false,

    init: function($element, $contactform, options) {
      this.options = options;

      this.$element = $element;
      this.$contactform = $contactform;
      this.$contactform.modal(options);

      var that = this;
      this.$contactform.on('show.bs.modal', function (e) {
        that.isShown = true;
      });
      this.$contactform.on('shown.bs.modal', function (e) {
      });
      this.$contactform.on('hide.bs.modal', function (e) {
        that.isShown = false;
      });
      this.$contactform.on('hidden.bs.modal', function (e) {
      });

      this.initialized = true;
    },

    show: function() {
      if (this.isShown === true)
        return;

      this.$contactform.modal('show');
    },

    hide: function() {
      if (this.isShown !== true)
        return;

      this.$contactform.modal('hide');
    }

  };

  $.fn.contactform = function(opts) {

    var options = $.extend({
      backdrop: true,
      keyboard: true,
      show: false
    }, opts);

    // modal is shared by all contactform links
    var modal = Modal;

    window.cf = modal;

    return this.each(function() {
      var $this = $(this);
      $this.on('click', function(event) {
        event.preventDefault();

        if (!modal.initialized) { // first click
          var $contactform = $('#contactform');
          if (!$contactform && !$contactform.length)
            return; // unable to find modal content

          modal.init($this, $contactform, options);
          console.log('initialized');
        }

        modal.show();
      });
    });

  };

}(window.jQuery);