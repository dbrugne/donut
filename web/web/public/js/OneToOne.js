$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.OneToOne = Backbone.Model.extend({

        defaults: function() {
            return {
                user: '',
                unread: 0
            };
        },

        focused: false,

        initialize: function() {
            this.messages = new Chat.MessagesCollection();
        },

        focus: function() {
            this.focused = true;
            this.trigger('focus');

            // Update URL
            Chat.router.navigate('user/'+this.get('username'));
            // @todo : best place to do that?
        },

        unfocus: function() {
            this.focused = false;
            this.trigger('unfocus');
        }

    });

    Chat.OneToOnesCollection = Backbone.Collection.extend({

        model: Chat.OneToOne,

        initialize: function() {
            this.listenTo(Chat.server, 'user:message', this.message);
        },

        _target: function(user_id) {
            return this.get(user_id);
        },

        message: function(message) {
            var currentUser = Chat.main.currentUser;
            var with_user_id;

            // Am i sender or recipient?
            if (currentUser.get('user_id') == message.from_user_id) {
                // Sender
                with_user_id = message.to_user_id;
            } else if (currentUser.get('user_id') == message.to_user_id) {
                // Recipient
                with_user_id = message.from_user_id; // i can also be this one if i spoke to myself...
            }

            // Discussion already opened?
            var onetoone = this._target(with_user_id);
            if (onetoone == undefined) {
                onetoone = new Chat.OneToOne({
                    id: with_user_id,
                    user: new Chat.User({
                        user_id: with_user_id,
                        username: message.username,
                        avatar: message.avatar
                    })
                });
                Chat.onetoones.add(onetoone);
            }

            // Add message to discussion
            onetoone.messages.add(new Chat.Message(message)); // i pass everything, maybe not ideal

            if (!onetoone.focused) {
                var unread = onetoone.get('unread');
                onetoone.set('unread', unread + 1);
            }
        },

        // @todo : repair focus on close
        focus: function(user_id) {
            // No opened room, display default
            if (this.models.length < 1) {
                this.trigger('focusDefault');
            } else {
                this.trigger('unfocusDefault');
            }

            var onetoone;
            if (user_id == '' || user_id == undefined) {
                // No room_id provided, try to find first opened room
                onetoone = this.first();
            } else {
                onetoone = this.get(user_id);
            }

            // room_id provided doesn't exist,
            if (onetoone == undefined) {
                console.error('Unable to find onetoone to focus');
                return;
            }

            // Unfocus every model
            _.each(this.models, function(toUnfocus, key, list) {
                toUnfocus.unfocus();
            });

            // Focus the one we want
            onetoone.focus();
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    Chat.OneToOneTabView = Backbone.View.extend({

        template: _.template($('#onetoone-list-item-template').html()),

        events: {
            "click .close": "closeThisRoom"
        },

        initialize: function() {
            this.listenTo(Chat.onetoones, 'remove', this.removeView);
            this.listenTo(this.model, 'focus', this.focus);
            this.listenTo(this.model, 'unfocus', this.unfocus);
            this.listenTo(this.model, 'change:unread', this.updateUnread);
        },

        removeView: function(model) {
            if (model === this.model) {
                this.remove();
            }
        },

        render: function() {
            var html = this.template({
                user: this.model.get('user').toJSON(),
                unread: this.model.get('unread')
            });
            this.$el.html(html);
            return this;
        },

//        closeThisRoom: function (event) {
//            Chat.rooms.remove(this.model); // remove model from collection
//
//            // After remove, the room still exists but not in the collection,
//            // = .focus() call will choose another room to be focused
//            if (this.model.focused) {
//                Chat.rooms.focus();
//            }
//
//            return false; // stop propagation
//        },

        focus: function() {
            this.$el.find('.onetoone-item').addClass('active');
            this.model.set('unread', 0);
        },

        unfocus: function() {
            this.$el.find('.onetoone-item').removeClass('active');
        },

        updateUnread: function() {
            this.$el.find('.badge').html(this.model.get('unread'));
            if (this.model.get('unread') < 1) {
                this.$el.find('.badge').fadeOut(400);
                this.$el.removeClass('unread');
            } else {
                this.$el.find('.badge').fadeIn(400);
                this.$el.addClass('unread');
            }
        }

    });

    Chat.OneToOneView = Backbone.View.extend({

        tagName: 'div',
        className: 'cwindow', // @todo: deduplicate with inherit

        template: _.template($('#onetoone-template').html()),

        messageTemplate: _.template($('#message-template').html()), // @todo: deduplicate with message subview

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

        initialize: function() {
            this.listenTo(Chat.onetoones, 'remove', this.removeRoom);
            this.listenTo(this.model.messages, 'add', this.addMessage);
            this.listenTo(this.model, 'focus', this.focus);
            this.listenTo(this.model, 'unfocus', this.unfocus);
        },

        render: function() {
            var html = this.template({
                user: this.model.get('user').toJSON(),
                unread: this.model.get('unread')
            });
            this.$el.html(html);
            return this;
        },

        focus: function() {
            this.$el.fadeIn(400);
            this.$el.find('.input-message').focus();
        },

        unfocus: function() {
            this.$el.hide();
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
            Chat.server.message('ws://chat.local/discussion', {to_user_id: this.model.get('user').get('id'), message: message});

            // Empty field
            inputField.val('');

            // avoid line break addition in field when submitting with "Enter"
            return false;
        },

        addMessage: function(message) {

            // Date
            var dateText = $.format.date(new Date(message.get('time')*1000), "HH:mm:ss");

            // Message body
            var messageHtml = message.get('message');
            messageHtml = messageHtml.replace(/\n/g, '<br />');

            // Hyperlinks (URLs starting with http://, https://, or ftp://)
            urlPattern = /(\b(https?|ftp)?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
            messageHtml = messageHtml.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');

            // Smileys
//            $(smileys).each(function (idx, smiley) {
//                messageHtml = messageHtml.replace(smiley.symbol, '<span class="smiley emoticon-16px '+smiley.class+'">'+smiley.symbol+'</span>');
//            });

            var html = this.messageTemplate({
                user_id: message.get('user_id'),
                avatar: message.get('avatar'),
                username: message.get('username'),
                message: messageHtml,
                date: dateText
            });
            this.$el.find('.messages').append(html);

            this.scrollDown();
            return this;
        },

        scrollDown: function() {
            this.$el.find(".messages").scrollTop(100000);
        }

    });

});