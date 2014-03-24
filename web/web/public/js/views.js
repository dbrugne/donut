$(function(){

    window.StatusView = Backbone.View.extend({

        el: $('#button-status'),

        initialize: function() {
            this.update('connecting');

            this.listenTo(this.model, 'connect', function() {
                this.update('online');
            });

            this.listenTo(this.model, 'close', function() {
                this.update('offline');
            });
        },

        update: function(status) {
            // @todo : move this class as mixin in each status class
            this.$el.removeClass().addClass('btn').addClass('btn btn-xs');
            switch (status) {
                case 'online':
                    this.$el.addClass('btn-success').html('Online');
                    break;
                case 'connecting':
                    this.$el.addClass('btn-warning').html('Connecting');
                    break;
                case 'offline':
                    this.$el.addClass('btn-inverse').html('Offline');
                    break;
                case 'error':
                    this.$el.addClass('btn-danger').html('Offline');
                    break;
            }
        }

    });

    /**
     * This view manages display (tab and window) of all open conversations (room or discussion)
     */
    window.ConversationsView = Backbone.View.extend({

        $conversationTabContainer: $("#rooms-list"),
        $conversationWindowContainer: $("#chat-center"),

        initialize: function() {
            // Binds on RoomCollection
            this.listenTo(Conversations, 'add', this.addConversation);
        },

        addConversation: function(conversation) {
            // Create conversation tab
            var viewItem = new ConversationTabView({model: conversation});
            this.$conversationTabContainer.append(viewItem.render().el);

            // Create conversation window
            var viewRoom = new ConversationView({model: conversation});
            this.$conversationWindowContainer.append(viewRoom.render().el);
        }

    });

    window.ConversationTabView = Backbone.View.extend({

        template: _.template($('#rooms-list-item-template').html()),

        events: {
            "click .close": "closeThisConversation",
            "click": "focusThisConversation"
        },

        initialize: function() {
            this.listenTo(Conversations, 'remove', this.removeConversation);
            this.listenTo(this.model, 'focus', this.focus);
            this.listenTo(Server, 'message', this.addMessage);
        },

        removeConversation: function(model) {
            if (model === this.model) {
                this.remove();
            }
        },

        render: function() {
            var html = this.template(this.model.toJSON());
            this.$el.html(html);
            return this;
        },

        closeThisConversation: function (event) {
            event.stopPropagation();
            Conversations.remove(this.model); // remove model from collection
        },

        focusThisConversation: function(event) {
            this.model.focus();
        },

        focus: function() {
            $("#rooms-list .room-item").removeClass('active');
            this.$el.find('.room-item').addClass('active');
        },

        addMessage: function(params) {
            // @todo
            // If current focused conversation
            // return
            // Else increment badge
        }

    });

    window.ConversationView = Backbone.View.extend({

        tagName: 'div',
        className: 'cwindow',

        template: _.template($('#room-template').html()),

        messageTemplate: _.template($('#message-template').html()),

        events: {
//            "click .close": "close",
//            "click": "focus"
        },

        initialize: function() {
            this.listenTo(Conversations, 'remove', this.removeConversation);
            this.listenTo(this.model, 'focus', this.focus);
            this.listenTo(Server, 'message', this.addMessage);
        },

        removeConversation: function(model) {
            if (model === this.model) {
                this.remove();
            }
        },

        render: function() {
            var html = this.template(this.model.toJSON());
            this.$el.html(html);
            return this;
        },

//        close: function () {
//            Conversations.remove(this.model); // remove model from collection
//        },

        focus: function() {
            $("#chat-center .cwindow").hide();
            this.$el.fadeIn(400);
        },

        addMessage: function(params) {

//            // If message received on discussion and discussion window not already exists
//            if (ChatServer.isDiscussionTopic(topic)) {
//                topic = ChatServer.topicTypes.discussion+"#"+data.with_user_id;
//                if (!isChatWindowExists(topic)) {
//                    newChatWindow(topic, {user_id: data.with_user_id, username: data.username});
//                }
//            }

            // Date
            var dateText = $.format.date(new Date(params.data.time*1000), "HH:mm:ss");

            // Message body
            var messageHtml = params.data.message;
            messageHtml = messageHtml.replace(/\n/g, '<br />');

            // Hyperlinks (URLs starting with http://, https://, or ftp://)
            urlPattern = /(\b(https?|ftp)?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
            messageHtml = messageHtml.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');

            // Smileys
//            $(smileys).each(function (idx, smiley) {
//                messageHtml = messageHtml.replace(smiley.symbol, '<span class="smiley emoticon-16px '+smiley.class+'">'+smiley.symbol+'</span>');
//            });

            var html = this.messageTemplate({
                user_id: params.data.user_id,
                avatar: params.data.avatar,
                username: params.data.username,
                message: messageHtml,
                date: dateText
            });
            console.log(['addMessage', this.$el]);
            this.$el.find('.messages').append(html);

//            scrollDown($(".cwindow[data-topic='"+topic+"'] > .messages"));

            return this;
        }

    });

    /**
     * Whole interface View
     */
    window.ChatView = Backbone.View.extend({

        el: $("#chat"),

        events: {
            // Delegated events for creating new items, and clearing completed ones.
        },

        initialize: function() {
            // Subviews
            this.status = new StatusView({model: Server});
            this.conversations = new ConversationsView({collection: Conversations});

            // Server events (@todo: should be here?)
            var that = this;
            this.listenTo(Server, 'userId', function(data) {
                that.userId = data.user_id;
            });
            this.listenTo(Server, 'pleaseJoinRoom', function(data) {
                Server.subscribe(data.topic);
            });
            this.listenTo(Server, 'subscribeSuccess', function(params) {
                console.log(params);
                Conversations.add(new Room({
                    id: params.data.id,
                    name: params.data.name,
                    baseline: params.data.baseline
                }));
                that.focus(params.data.id);
            });

            // Connection (when all the interface is ready)
            Server.connect();
        },

        focus: function(topic) {
            if (!Conversations.length) {
                return;
            }

            var model;
            if (topic) {
                model = Conversations.get(topic);
            } else {
                model = Conversations.first();
            }

            model.focus();

//            $('.room-item[data-topic="'+topic+'"] > .badge').fadeOut(400, function () {
//                $('.room-item[data-topic="'+topic+'"] > .badge').html(0);
//            });
//
//            // Focus on input field
//            $('.input-message[data-topic="'+topic+'"]').focus();
//
//            // Set URL hash
//            if (ChatServer.isRoomTopic(topic)) {
//                var hash = 'room='+topic.replace(ChatServer.topicTypes.room_prefix, '');
//                window.location.hash = hash;
//            } else {
//                window.location.hash = '';
//            }
//
//            // Store current window
//            focusedWindow = topic;
        }

    });

});