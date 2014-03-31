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
        }

    });

    Chat.DiscussionsCollection = Backbone.Collection.extend({

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
            if (model != undefined) {
                this.focus(model);
            }
        },

        focusOneToOneByUsername: function(username) {
            var model = this.findWhere({ type: 'onetoone', username: username });
            if (model != undefined) {
                this.focus(model);
            }
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
                uri = 'room/'+model.get('name');
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

            this.focus(room);
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

            model = this.openOneToOne(new Chat.User({
                id: with_user_id,
                username: message.username,
                avatar: message.avatar
            }));

            // To have the same data between room and user messages (= same view code)
            message.user_id = message.from_user_id;

            model.message(message);
        },

        /* OneToOne specific */
        openOneToOne: function(user) {
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

            // Smileys view
            new Chat.SmileysView({collection: Chat.smileys});
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
            this.messagesView = new Chat.DiscussionMessagesView({el: this.$el.find('.messages'), model: this.model.messages});
            this.messageBoxView = new Chat.DiscussionMessageBoxView({el: this.$el.find('.message-box'), model: this.model});
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
            this.listenTo(this.model, 'add', this.addMessage);
            this.render();
        },

        render: function() {
            // nothing to add in this particular subview
        },

        addMessage: function(message) {
            // Date
            var dateText = $.format.date(new Date(message.get('time')*1000), "HH:mm:ss");

            // Message body
            var messageHtml = message.get('message');
            messageHtml = messageHtml.replace(/\n/g, '<br />');

            // Hyperlinks (URLs starting with http://, https://, or ftp://)
            var urlPattern = /(\b(https?|ftp)?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
            messageHtml = messageHtml.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');

            // Smileys
//            $(smileys).each(function (idx, smiley) {
//                messageHtml = messageHtml.replace(smiley.symbol, '<span class="smiley emoticon-16px '+smiley.class+'">'+smiley.symbol+'</span>');
//            });

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

        scrollDown: function() {
            this.$el.scrollTop(100000);
        }

    });

    Chat.DiscussionMessageBoxView = Backbone.View.extend({

        template: _.template($('#message-box-template').html()),

        events: {
            'keypress .input-message': 'message',
            'click .send-message': 'message'
        },

        initialize: function(options) {
            this.render();
        },

        render: function() {
            this.$el.html(this.template());
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