$(function() {

    Chat = window.Chat || { };

    /**
     * 'Discussion' is a common object used to extends Room and OneToOne and centralize common code
     */

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.Discussion = Backbone.Model.extend({

        defaults: function() {
            return {
                focused: false,
                unread: 0
            };
        },

        initialize: function(options) {
            this.messages = new Chat.MessagesCollection();
            this._initialize(options);
        },

        // To override
        _initialize: function(options) {
        },

        message: function(message) {
            this.messages.add(new Chat.Message(message)); // i pass everything, maybe not ideal

            if (!this.get('focused')) {
                var unread = this.get('unread');
                this.set('unread', unread + 1);
            }

            // Unread indication in window title
            Chat.main.windowView.increment();
        }

    });

    Chat.DiscussionsCollection = Backbone.Collection.extend({

        thisDiscussionShouldBeFocusedOnSuccess: '',

        initialize: function() {
            /* Room specific */
            this.listenTo(Chat.server, 'room:pleaseJoin', this.joinRoom);
            this.listenTo(Chat.server, 'room:pleaseLeave', this.leaveRoom);
            this.listenTo(Chat.server, 'room:joinSuccess', this.joinSuccess);
            this.listenTo(Chat.server, 'room:message', this.roomMessage);

            /* OneToOne specific */
            this.listenTo(Chat.server, 'user:message', this.userMessage);
        },

        focusRoomByName: function(name) {
            var model = this.findWhere({ type: 'room', name: name });
            if (model == undefined) {
                // Create room
                // @todo : need to replace 'room.id' for identifying room by 'room.name' everywhere
            }

            this.focus(model);
        },

        focusOneToOneByUsername: function(username) {
            var model = this.findWhere({ type: 'onetoone', username: username });

            // Open discussion window if not already exist
            if (model == undefined) {
                // Create onetoone
                // @todo : need to replace 'user.id' for identifying room by 'user.username' everywhere
                //         the gravatar URL should be estimated by the username hash
                //   until that direct access to user one to one doesn't work
//                this.addOneToOne(new Chat.User({
//                    id: '',
//                    username: username
//                }));
            }

            this.focus(model);
        },

        focus: function(model) {
            // No opened discussion, display default
            if (this.models.length < 1) {
                this.trigger('focusDefault');
                return;
            } else {
                this.trigger('unfocusDefault');
            }

            // No discussion provided, take first
            if (model == undefined) {
                model = this.first();
            }

            // Unfocus every model
            this.each(function(discussion, key, list) {
                discussion.set('focused', false); // @todo replace by emitting and event that unfocus every element?
            });

            // Focus the one we want
            model.set('focused', true);

            // Update URL
            var uri;
            if (model.get('type') == 'room') {
                uri = 'room/'+model.get('name').replace('#', '');
            } else {
                uri = 'user/'+model.get('username');
            }
            Chat.router.navigate(uri);
        },

        /* Room specific */
        joinRoom: function(params) {
            Chat.server.subscribe(params.topic);
        },

        /* Room specific */
        leaveRoom: function(params) {
            var room = this.get('room'+params.data.room_id);
            this.remove(room);
        },

        /* Room specific */
        joinSuccess: function(params) {
            var newRoomId = 'room'+params.data.room_id;

            // Create room in browser
            var room = new Chat.Room({
                id: newRoomId,
                room_id: params.data.room_id,
                name: params.data.name,
                baseline: params.data.baseline
            });

            this.add(room);

            // Add user in the room
            _.each(params.data.users, function(element, key, list) {
                room.users.add(new Chat.User({
                    id: element.user_id,
                    username: element.username,
                    avatar: element.avatar
                }));
            });

            // If caller indicate that this room should be focused on success
            //  OR if this is the first opened discussion
            if (this.thisDiscussionShouldBeFocusedOnSuccess == newRoomId
                || Chat.discussions.length == 1) {
                this.focus(room);
            }

            room.trigger('notification', {type: 'hello', name: room.get('name')});
        },

        /* Room specific */
        roomMessage: function(params) {
            var model = this.get('room'+params.data.room_id);
            model.message(params.data);
        },

        /* OneToOne specific */
        userMessage: function(message) {
            // Current user is emitter or recipient?
            var currentUser = Chat.main.currentUser;
            var with_user_id;
            if (currentUser.get('user_id') == message.from_user_id) {
                // Emitter
                with_user_id = message.to_user_id;
            } else if (currentUser.get('user_id') == message.to_user_id) {
                // Recipient
                with_user_id = message.from_user_id; // i can also be this one if i spoke to myself...
            }

            model = this.addOneToOne(new Chat.User({
                id: with_user_id,
                username: message.username,
                avatar: message.avatar
            }));

            // To have the same data between room and user messages (= same view code)
            message.user_id = message.from_user_id;

            model.message(message);
        },

        /* OneToOne specific */
        addOneToOne: function(user) {
            // Discussion already opened?
            var oneToOneId = 'onetoone'+user.get('id');
            var model = this.get(oneToOneId);
            if (model == undefined) {
                model = new Chat.OneToOne({
                    id: oneToOneId,
                    user_id: user.get('id'),
                    username: user.get('username'),
                    avatar: user.get('avatar')
                });
                this.add(model);
            }

            return model;
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    // View responsible of displaying room/onetoone tabs block and windows
    Chat.DiscussionsView = Backbone.View.extend({

        $discussionsTabContainer: $("#discussions-list"),
        $discussionsWindowContainer: $("#chat-center"),

        initialize: function(options) {
            this.listenTo(this.collection, 'add', this.addDiscussion);
            this.listenTo(this.collection, 'focusDefault', this.focusDefault);
            this.listenTo(this.collection, 'unfocusDefault', this.unfocusDefault);
        },

        addDiscussion: function(model, collection, options) {
            if (model.get('type') == 'room') {
                var tabView = new Chat.RoomTabView({collection: collection, model: model });
                var windowView = new Chat.RoomWindowView({ collection: collection, model: model });
            } else if (model.get('type') == 'onetoone') {
                var tabView = new Chat.OneToOneTabView({ collection: collection, model: model });
                var windowView = new Chat.OneToOneWindowView({ collection: collection, model: model });
            } else {
                return;
            }

            this.$discussionsTabContainer.append(tabView.$el);
            this.$discussionsWindowContainer.append(windowView.$el);
        },

        focusDefault: function() {
            this.$discussionsWindowContainer.find('.discussion[data-default=true]').show();
        },

        unfocusDefault: function() {
            this.$discussionsWindowContainer.find('.discussion[data-default=true]').hide();
        }

    });

    Chat.DiscussionTabView = Backbone.View.extend({

        model: '', // the current element

        collection: '', // the current element collection

        events: {
            "click .close": "closeThis"
        },

        initialize: function(options) {
            this.listenTo(this.model, 'change:focused', this.updateFocus);
            this.listenTo(this.model, 'change:unread', this.updateUnread);
            this.listenTo(this.collection, 'remove', this.removeView);

            this._initialize(options);

            this.render();
        },

        // To override
        _initialize: function(options) {
        },

        // To override
        _renderData: function() {
            return { };
        },

        removeView: function(model) {
            if (model === this.model) {
                this.remove();
            }
        },

        render: function() {
            var html = this.template(this._renderData());
            this.$el.html(html);
            return this;
        },

        updateFocus: function() {
            if (this.model.get('focused')) {
                this.$el.find('.list-item').addClass('active');
                this.model.set('unread', 0);
            } else {
                this.$el.find('.list-item').removeClass('active');
            }
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
        },

        closeThis: function(event) { // @todo : duplicate code tab/window
            this.collection.remove(this.model); // remove model from collection

            // After remove, the room still exists but is not in the collection,
            // = .focus() call will choose another room to be focused
            if (this.model.get('focused')) {
                this.collection.focus();
            }

            return false; // stop propagation
        }

    });

    Chat.DiscussionWindowView = Backbone.View.extend({

        tagName: 'div',

        className: 'discussion',

        events: {
            "click .close": "closeThis"
        },

        initialize: function(options) {
            // Events
            this.listenTo(this.collection, 'remove', this.removeView);
            this.listenTo(this.model, 'change:focused', this.updateFocus);

            // Parent view rendering
            this.render(); // (now exists in DOM)

            // Subviews initialization and rendering
            this.messagesView = new Chat.DiscussionMessagesView({
                el: this.$el.find('.messages'),
                model: this.model,
                collection: this.model.messages
            });
            this.messageBoxView = new Chat.DiscussionMessageBoxView({
                el: this.$el.find('.message-box'),
                model: this.model
            });
            // (later we will be able to re-render each subview individually without touching this view)

            // Other subviews
            this._initialize(options);
        },

        // To override
        _initialize: function(options) {
        },

        // To override
        _remove: function(model) {
        },

        // To override
        _renderData: function() {
        },

        // To override
        _render: function() {
        },

        render: function() {
            var html = this.template(this._renderData());
            this.$el.html(html);
            this.$el.hide();
            return this;
        },

        updateFocus: function() {
            if (this.model.get('focused')) {
                this.$el.fadeIn(400);
                this.$el.find('.input-message').focus();
            } else {
                this.$el.hide();
            }
        },

        removeView: function(model) {
            if (model === this.model) {
                this._remove();
                this.messagesView.remove();
                this.messageBoxView.remove();
                this.remove();
            }
        },

        closeThis: function(event) { // @todo : duplicate code tab/window
            this.collection.remove(this.model); // remove model from collection

            // After remove, the room still exists but is not in the collection,
            // = .focus() call will choose another room to be focused
            if (this.model.get('focused')) {
                this.collection.focus();
            }

            return false; // stop propagation
        }

    });

    Chat.DiscussionMessagesView = Backbone.View.extend({

        template: _.template($('#message-template').html()),

        events: {
            'click p > .username': function(event) {
                Chat.main.userProfileModal(
                    $(event.currentTarget).data('userId')
                );
            }
        },

        initialize: function(options) {
            this.listenTo(this.collection, 'add', this.message);
            this.listenTo(this.model, 'notification', this.notification);
            this.render();
        },

        render: function() {
            // nothing to add in this particular subview
        },

        message: function(message) {
            // Date
            var dateText = $.format.date(new Date(message.get('time')*1000), "HH:mm:ss");

            // Message body
            var messageHtml = message.get('message');
            messageHtml = messageHtml.replace(/\n/g, '<br />');

            // Hyperlinks (URLs starting with http://, https://, or ftp://)
            var urlPattern = /(\b(https?|ftp)?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
            messageHtml = messageHtml.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');

            // Smileys
            Chat.smileys.each(function (smiley) {
                messageHtml = messageHtml.replace(smiley.get('symbol'), '<span class="smiley emoticon-16px '+smiley.get('class')+'">'+smiley.get('symbol')+'</span>');
            });

            var html = this.template({
                user_id: message.get('user_id'),
                avatar: message.get('avatar'),
                username: message.get('username'),
                message: messageHtml,
                date: dateText
            });
            this.$el.append(html);

            this.scrollDown();
            return this;
        },

        /**
         * Notifications:
         *
         * All notifications should have: { type, date }
         *
         * And by 'type' should also received:
         * - hello: You enter in #room : {}
         * - userIn: @user has joined : {user_id, username}
         * - userOut: @user has left : {user_id, username}
         * - disconnect @user quit (reason) : {user_id, username, reason}
         * - baseline: @user changed topic for 'topic' : {user_id, username, baseline}
         * - kick: : @user was kicked by @user 'reason' : {user_id, username, by_user_id, by_username, reason}
         * - ban: @user was banned by @user (time) 'reason' : {user_id, username, by_user_id, by_username, reason}
         * - op: @user was oped by @user : {user_id, username, by_user_id, by_username}
         * - deop: @user was deoped by @user : {user_id, username, by_user_id, by_username}
         */
        notificationTemplate: _.template($('#notification-template').html()),
        notification: function(data) {
            if (data.type == undefined || data.type == '') {
                return;
            }

            data.date = $.format.date(Number(new Date()), "HH:mm:ss");

            var html = this.notificationTemplate(data);
            this.$el.append(html);
            this.scrollDown();
        },

        scrollDown: function() {
            this.$el.scrollTop(100000);
        }

    });

    Chat.DiscussionMessageBoxView = Backbone.View.extend({

        template: _.template($('#message-box-template').html()),

        events: {
            'keypress .input-message':  'message',
            'click .send-message':      'message',
            'click .smileys-message':   'toggleSmileys'
        },

        initialize: function(options) {
            this.render();

            // Smileys view
            this.smileysView = new Chat.SmileysView({collection: Chat.smileys, onPick: this.pickSmiley});
            this.$el.find('.smileys-message').append(this.smileysView.$el);
            this.listenTo(this.smileysView, 'pick', this.pickSmiley);
        },

        render: function() {
            this.$el.html(this.template());
        },

        toggleSmileys: function(event) {
            var $clicked = $(event.currentTarget);

            // Recalculate position
            var position = $clicked.position();
            var newTop = position.top - this.smileysView.$el.outerHeight();
            var newLeft = (position.left + ($clicked.outerWidth()/2)) - (this.smileysView.$el.outerWidth()/2);
            this.smileysView.$el.css('top', newTop);
            this.smileysView.$el.css('left', newLeft);
            this.smileysView.$el.toggle();
        },

        pickSmiley: function(smiley) {
            this.$el.find('.input-message').insertAtCaret(smiley.symbol);
        },

        message: function(event) {
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
            if (this.model.get('type') == 'room') {
                Chat.server.message(
                    'ws://chat.local/room#'+this.model.get('room_id'),
                    {message: message}
                );
            } else if (this.model.get('type') == 'onetoone') {
                Chat.server.message(
                    'ws://chat.local/discussion',
                    {
                        to_user_id: this.model.get('user_id'),
                        message: message
                    }
                );
            }

            // Empty field
            inputField.val('');

            // avoid line break addition in field when submitting with "Enter"
            return false;
        }
    });

});