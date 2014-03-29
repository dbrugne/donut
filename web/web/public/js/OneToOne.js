$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.OneToOne = Chat.Discussion.extend({

        defaults: function() {
            return {
                username: '',
                avatar: '',
                user_id: '',
                type: 'onetoone',
                focused: false,
                unread: 0
            };
        },

        _initialize: function() {
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    Chat.OneToOneTabView = Chat.DiscussionTabView.extend({

        template: _.template($('#onetoone-list-item-template').html()),

        _initialize: function(options) {
            //
        },

        _renderData: function() {
            return this.model.toJSON();
        }

    });

    Chat.OneToOneWindowView = Chat.DiscussionWindowView.extend({

        template: _.template($('#onetoone-template').html()),

        events: {
            'click .close': 'close',
            'keypress .input-message': 'postMessage',       // @todo: deduplicate with message form subview
            'click .send-message': 'postMessage',           // @todo: deduplicate with message form subview
            'click .header > .name': function(event) {
                Chat.main.userProfileModal(
                    $(event.currentTarget).data('userId')
                );
            }
        },

        _initialize: function() {
        },

        render: function() {
            var html = this.template(this.model.toJSON());
            this.$el.html(html);
            return this;
        },

        postMessage: function(event) {
            // Enter in field handling
            if (event.type == 'keypress') {
                var key;
                var isShift;
                if (window.event) {
                    key = window.event.keyCode;
                    isShift = window.event.shiftKey ? true : false;
                } else {
                    key = event.which;
                    isShift = event.shiftKey ? true : false;
                }
                if(isShift || event.which != 13) {
                    return;
                }
            }

            // Get the message
            var inputField = this.$el.find('.input-message');
            var message = inputField.val();
            if (message == '') {
                return;
            }

            // Post
            Chat.server.message('ws://chat.local/discussion', {to_user_id: this.model.get('user_id'), message: message});

            // Empty field
            inputField.val('');

            // avoid line break addition in field when submitting with "Enter"
            return false;
        }

    });

});