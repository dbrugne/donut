$(function(){

    window.Room = Backbone.Model.extend({

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

    window.OneToOne = Backbone.Model.extend({

        defaults: function() {
            return {
                user_id: '',
                unread: 0
            };
        }

    });

    window.User = Backbone.Model.extend({

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
    window.ConversationsCollection = Backbone.Collection.extend({

        model: function(attrs, options) {
            if (undefined != attrs.room_id) { // check this condition if room_id not exists
                return new Room(attrs, options);
            } else {
                return new OneToOne(attrs, options);
            }
        }

    });

});