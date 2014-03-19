$(function(){

    /****************************************
     *
     * Models
     *
     ****************************************/

    var ChatServer = Backbone.Model.extend({

        defaults: function() {
            return {
                server: '',
                sessionId: '',
                debugOn: false
            };
        },

        initialize: function() {
            // web_socket.js configuration
            WEB_SOCKET_SWF_LOCATION = "/js/WebSocketMain.swf";

            // Debug is on or not
            ab._debugrpc     = this.get('debugOn');
            ab._debugpubsub  = this.get('debugOn');
            ab._debugws      = this.get('debugOn');
            WEB_SOCKET_DEBUG = this.get('debugOn');
        },

        connect: function() {
            var that = this;
            // Autobahn connection
            ab.connect(
                'ws://' + window.location.hostname + ':8080/chat'
                , function(session) {
                    that.set('session', session); // session._session_id
                    that.trigger('connect');

                    // Subscribe to control topic
                    that.get('session').subscribe('ws://chat.local/control', function(topic, event) {
                        that.trigger(event.action, event.data);
                    });
                }
                , function(code, reason, detail) {
                    that.set('session', null);
                    that.debug(['Connection closed', code, reason, detail]);
                    that.trigger('close');
                }
                , {
                    'skipSubprotocolCheck': true,
                    'maxRetries': 60,
                    'retryDelay': 3500
                }
            );
        },

        error: function(error) {
            this.debug('Error: ' + error);
        },

        debug: function(message) {
            if (this.get('debugOn')) {
                console.log(message);
            }
        },

        subscribe: function(topic) {
            var that = this;
            this.get('session').subscribe(topic, function(topic, event) {
                that.trigger(event.action, {topic: topic, data: event.data});
            });
        }

    });

    var Room = Backbone.Model.extend({

        defaults: function() {
            return {
                // room
                room_id: '',
                name: '',
                baseline: '',
                users: [],
                unread: 0
            };
        },

        focus: function() {
            this.trigger('focus');
        }

    });

    var OneToOne = Backbone.Model.extend({

        defaults: function() {
            return {
                user_id: '',
                unread: 0
            };
        }

    });

    var User = Backbone.Model.extend({

        defaults: function() {
            return {
                user_id: '',
                username: '',
                avatar: '',
                unread: 0
            };
        }

    });

    /**
     * Could be Room or OneToOne
     */
    var ConversationsCollection = Backbone.Collection.extend({

        model: function(attrs, options) {
            if (undefined != attrs.room_id) { // check this condition if room_id not exists
                return new Room(attrs, options);
            } else {
                return new OneToOne(attrs, options);
            }
        }

    });

    var Conversations = new ConversationsCollection;

    /****************************************
     *
     * Views
     *
     ****************************************/

    var StatusView = Backbone.View.extend({

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
    var ConversationsView = Backbone.View.extend({

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

    var ConversationTabView = Backbone.View.extend({

        template: _.template($('#rooms-list-item-template').html()),

        events: {
            "click .close": "closeThisConversation",
            "click": "focusThisConversation"
        },

        initialize: function() {
            this.listenTo(Conversations, 'remove', this.removeConversation);
            this.listenTo(this.model, 'focus', this.focus);
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
        }

    });

    var ConversationView = Backbone.View.extend({

        tagName: 'div',
        className: 'cwindow',

        template: _.template($('#room-template').html()),

        events: {
//            "click .close": "close",
//            "click": "focus"
        },

        initialize: function() {
            this.listenTo(Conversations, 'remove', this.removeConversation);
            this.listenTo(this.model, 'focus', this.focus);
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
        }

    });

    /**
     * Whole interface View
     */
    var ChatView = Backbone.View.extend({

        el: $("#chat"),

        events: {
            // Delegated events for creating new items, and clearing completed ones.
        },

        initialize: function() {
            // Server initialization
            this.server = new ChatServer( {debugOn: true} );

            // Subviews
            this.status = new StatusView({model: this.server});
            this.conversations = new ConversationsView({collection: Conversations});

            // Server events (@todo: should be here?)
            var that = this;
            this.listenTo(this.server, 'userId', function(data) {
                that.userId = data.user_id;
            });
            this.listenTo(this.server, 'pleaseJoinRoom', function(data) {
                this.server.subscribe(data.topic);
            });
            this.listenTo(this.server, 'subscribeSuccess', function(params) {
                console.log(params);
                Conversations.add(new Room({
                    id: params.data.id,
                    name: params.data.name,
                    baseline: params.data.baseline
                }));
                that.focus(params.data.id);
            });

            // Connection (when all the interface is ready)
            this.server.connect();
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

//            // Remove un-read message badge
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

    var Chat = new ChatView;

    $("#test1").click(function (e) {
        console.log(Conversations);

//        Conversations.add(new OneToOne({ id: '4234234243278dsq7', user_id: 'fsdff'}));
//        Conversations.add(new OneToOne({ id: '132465987qsdssqsq', user_id: 'xxxx'}));
//        Conversations.add(new Room({ id: 'azeezezaezaezae', name: 'tdsest'}));
//        Conversations.add(new Room({ id: 'g4fd456gdg45df54g', name: 'test'}));
//        Conversations.add(new Room({ id: 'aze4a51dq1sqs2d3q', name: 'test2'}));
//        Conversations.add(new OneToOne({ id: 'azzeazzeezzezeze', user_id: 'trerererest'}));
    });

});