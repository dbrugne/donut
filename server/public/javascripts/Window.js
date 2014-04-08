$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    Chat.WindowView = Backbone.View.extend({

        el: $(window),

        focused: true,

        unread: 0,

        title: '',

        initialize: function(options) {
            this.title = $(document).attr('title');

            // Bind events
            that = this;
            $(window).focus(function(event) {
                that.onFocus();
            });
            $(window).blur(function(event) {
                that.onBlur();
            });
            $(window).on('beforeunload', function() {
                return that.onClose();
            });
        },

        onBlur: function() {
            this.focused = false;
        },

        onFocus: function() {
            if (this.unread == 0) {
                return;
            }

            $(document).attr('title', this.title);
            this.unread = 0;
            this.focused = true;
        },

        increment: function() {
            if (this.focused) {
                return;
            }

            this.unread += 1;
            $(document).attr('title', '('+this.unread+') '+this.title);
        },

        onClose: function() {
            // only if at least one room is open
            if (Chat.discussions.length > 0) {
                return "If you leave this page all the room history will be lost.";
            } else {
                return;
            }
        }

    });

});