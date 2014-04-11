$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.ServerModel = Backbone.Model.extend({

        initialize: function() {
        },

        debug: function(message) {
            console.log(message);
        },

        // connect should be done at the end of App initialization to allow interface binding to work
        connect: function() {
            this.socket = io.connect(window.location.hostname);
            var that = this;

             // connection
            this.socket.on('connecting', function () { that.trigger('connecting'); });
            this.socket.on('connect', function () { that.trigger('connect'); });
            this.socket.on('disconnect', function () { that.trigger('disconnect'); });
            this.socket.on('connect_failed', function () { that.trigger('connect_failed'); });
            this.socket.on('reconnecting', function () { that.trigger('reconnecting'); });
            this.socket.on('reconnect', function () { that.trigger('reconnect'); });
            this.socket.on('reconnect_failed', function () { that.trigger('reconnect_failed'); });

            // error
            this.socket.on('error', function () { console.error('socket error');
                that.debug(arguments);
            });

            // welcome
            this.socket.on('welcome', function (data) {
                that.debug(['io:in:welcome', data]);
                that.trigger('welcome', data);
            });

            // @todo : useless ? we never use row "message" event
//            // "message" is emitted when a message sent with socket.send is received. message is the sent message, and callback is an optional acknowledgement function.
//            this.socket.on('message', function (message, callback) {});

            // room

            // @todo : should move the dispatch room logic from collection.Discussion to here
            this.socket.on('room:join', function(data) {
                that.debug(['io:in:room:join', data]);
                that.trigger('room:join', data);
            });
            this.socket.on('room:leave', function(data) {
                that.debug(['io:in:room:leave', data]);
                that.trigger('room:leave', data);
            });
            this.socket.on('room:welcome', function(data) {
                that.debug(['io:in:room:welcome', data]);
                that.trigger('room:welcome', data);
            });
            this.socket.on('room:topic', function(data) {
                that.debug(['io:in:room:topic', data]);
                that.trigger('room:topic', data);
            });
            this.socket.on('room:in', function(data) {
                that.debug(['io:in:room:in', data]);
                that.trigger('room:in', data);
            });
            this.socket.on('room:out', function(data) {
                that.debug(['io:in:room:out', data]);
                that.trigger('room:out', data);
            });
            this.socket.on('room:message', function(data) {
                that.debug(['io:in:room:message', data]);
                that.trigger('room:message', data);
            });
            this.socket.on('room:searchsuccess', function(data) {
                that.debug(['io:in:room:searchsuccess', data]);
                that.trigger('room:searchsuccess', data);
            });
            this.socket.on('room:searcherror', function(data) {
                that.debug(['io:in:room:searcherror', data]);
                that.trigger('room:searcherror', data);
            });
        },

        join: function(room) {
            var data = {room: room};
            this.socket.emit('room:join', data);
            this.debug(['io:out:room:join', data]);
        },

        leave: function(room) {
            var data = {room: room};
            this.socket.emit('room:leave', data);
            this.debug(['io:out:room:leave', data]);
        },

        topic: function(room, topic) {
            var data = {room: room, topic: topic};
            this.socket.emit('room:topic', data);
            this.debug(['io:out:room:topic', data]);
        },

        roomMessage: function(room, message) {
            var data = {room: room, message: message};
            this.socket.emit('room:message', data);
            this.debug(['io:out:room:message', data]);
        },

        create: function(room) {
            var data = {room: room};
            this.socket.emit('room:create', data);
            this.debug(['io:out:room:create', data]);
        },

        roomSearch: function(search) {
            var data = {search: search};
            this.socket.emit('room:search', data);
            this.debug(['io:out:room:search', data]);
        }

//        unsubscribe: function(topic) { // @todo : replace by room_id
//            this.get('session').unsubscribe(topic);
//        },
//
//        message: function(topic, msg) {
//            this.get('session').publish(topic, msg);
//        },
//
//        createRoom: function(name) {
//            var that = this;
//            this.get('session').call('createRoom', name).then(
//                function(data) { that.trigger('room:createSuccess', data); }
//                , function(data) { that.trigger('room:createError', data); }
//            );
//        },
//
//        baseline: function(topic, baseline) {
//            this.get('session').call('changeBaseline', topic, baseline).then(
//                function() { }
//                , function() { console.error('Error changeBaseline of '+topic+' with '+ baseline); }
//            );
//        },
//
//        searchForUsers: function(search) {
//            var that = this;
//            this.get('session').call('searchForUsers', search).then(
//                function(users) {
//                    that.trigger('user:searchSuccess', { users: users });
//                },
//                function() {
//                    that.trigger('user:searchError');
//                }
//            );
//        }

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

            this.listenTo(this.model, 'connect_failed', function() {
                that.update('error');
            });

            this.listenTo(this.model, 'reconnect_failed', function() {
                that.update('error');
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
                    this.$el.removeClass().addClass('error').html('Error');
                    break;
            }
        }

    });

});