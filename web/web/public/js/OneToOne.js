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

        _events: {
            'click .header > .name': function(event) { // @todo : move in MainView (behavior is added in DOM only with CSS class
                Chat.main.userProfileModal(
                    this.model.get('user_id')
                );
            }
        },

        _initialize: function() {
        },

        _remove: function(model) {
        },

        _renderData: function() {
            return this.model.toJSON();
        },

        _render: function() {
        }

    });

});