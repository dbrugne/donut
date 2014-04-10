$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.ServerModel = Backbone.Model.extend({

        initialize: function() {
        },

        // connect should be done at the end of App initialization to allow interface binding to work
        connect: function() {
            this.socket = io.connect(window.location.hostname);
            var that = this;

            this.socket.on('welcome', function (data) {
                console.log(data);
            });

            this.socket.on('news', function (data) {
                console.log(data);
                socket.emit('my other event', { my: 'data' });
            });

            // "connecting" is emitted when the socket is attempting to connect with the server
            this.socket.on('connecting', function () {
                that.trigger('connecting');
            });

            // "connect" is emitted when the socket connected successfully
            this.socket.on('connect', function () {
                that.trigger('connect');
            });

            // "disconnect" is emitted when the socket disconnected
            this.socket.on('disconnect', function () {
                that.trigger('disconnect');
            });

            // "connect_failed" is emitted when socket.io fails to establish a connection to the server and has no more transports to fallback to.
            this.socket.on('connect_failed', function () {
                that.trigger('connect_failed');
            });

            // "reconnecting" is emitted when the socket is attempting to reconnect with the server.
            this.socket.on('reconnecting', function () {
                that.trigger('reconnecting');
            });

            // "reconnect" is emitted when socket.io successfully reconnected to the server.
            this.socket.on('reconnect', function () {
                that.trigger('reconnect');
            });

            // "reconnect_failed" is emitted when socket.io fails to re-establish a working connection after the connection was dropped.
            this.socket.on('reconnect_failed', function () {
                that.trigger('reconnect_failed');
            });

            // "error" is emitted when an error occurs and it cannot be handled by the other event types.
            this.socket.on('error', function () {
                console.error('socket error');
                console.debug(arguments);
            });

            // "message" is emitted when a message sent with socket.send is received. message is the sent message, and callback is an optional acknowledgement function.
            this.socket.on('message', function (message, callback) {});

            // "anything" can be any event except for the reserved ones. data is data, and callback can be used to send a reply.
            this.socket.on('anything', function(data, callback) {});
        },

        error: function(error) {

        },
//
//        debug: function(message) {
//            if (this.get('debugOn')) {
//                console.log(message);
//            }
//        },

        subscribe: function(topic) {
            var that = this;
            this.get('session').subscribe(topic, function(topic, event) {
                that.trigger(event.action, {topic: topic, data: event.data});
            });
        },

        unsubscribe: function(topic) { // @todo : replace by room_id
            this.get('session').unsubscribe(topic);
        },

        message: function(topic, msg) {
            this.get('session').publish(topic, msg);
        },

        createRoom: function(name) {
            var that = this;
            this.get('session').call('createRoom', name).then(
                function(data) { that.trigger('room:createSuccess', data); }
                , function(data) { that.trigger('room:createError', data); }
            );
        },

        baseline: function(topic, baseline) {
            this.get('session').call('changeBaseline', topic, baseline).then(
                function() { }
                , function() { console.error('Error changeBaseline of '+topic+' with '+ baseline); }
            );
        },

        searchForRooms: function(search) {
            var that = this;
            this.get('session').call('searchForRooms', search).then(
                function(rooms) {
                    that.trigger('room:searchSuccess', { rooms: rooms });
                },
                function() {
                    that.trigger('room:searchError');
                }
            );
        },

        searchForUsers: function(search) {
            var that = this;
            this.get('session').call('searchForUsers', search).then(
                function(users) {
                    that.trigger('user:searchSuccess', { users: users });
                },
                function() {
                    that.trigger('user:searchError');
                }
            );
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    /**
     * Connection status block
     */
    Chat.StatusView = Backbone.View.extend({

        el: $('#button-status'),

        initialize: function() {
            this.update('connecting');

            var that = this;

            this.listenTo(this.model, 'connecting', function() {
                that.update('connecting');
            });

            this.listenTo(this.model, 'connect', function() {
                that.update('online');
            });

            this.listenTo(this.model, 'reconnecting', function() {
                that.update('connecting');
            });

            this.listenTo(this.model, 'reconnect', function() {
                that.update('online');
            });

            this.listenTo(this.model, 'disconnect', function() {
                that.update('offline');
            });
        },

        update: function(status) {
            switch (status) {
                case 'online':
                    this.$el.removeClass().addClass('online').html('Online');
                    break;
                case 'connecting':
                    this.$el.removeClass().addClass('connecting').html('Connecting');
                    break;
                case 'offline':
                    this.$el.removeClass().addClass('offline').html('Offline');
                    break;
                case 'error':
                    this.$el.removeClass().addClass('error').html('Offline');
                    break;
            }
        }

    });

});