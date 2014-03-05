<?php

namespace Server\Chat;
use Ratchet\ConnectionInterface;

class Room extends \App\Chat\Room
{
    /**
     * Silex application
     *
     * @var Application
     */
    protected $_app;

    /**
     * @var \SplObjectStorage
     */
    protected $_subscribers;

    /** @var string */
    protected $_topic;

    /**
     * @var User
     */
    protected $_bot;

    public function __construct()
    {
        $this->_subscribers = new \SplObjectStorage();

        // Bot
        $this->_bot = new \App\User\User("Room bot");
        $this->_bot->setId(0);
        $this->_bot->setEmail("bot@bot.com");
    }

    public function setApp(\Silex\Application $app)
    {
        $this->_app = $app;
    }

    public function setTopic($topic)
    {
        $this->_topic = $topic;
    }

    public function subscribe(ConnectionInterface $conn)
    {
        if ($this->_subscribers->contains($conn)) {
            $this->error("Connection '{$conn->User->getId()}' already in registered in this room");
            return;
        }

        // Database (if not already exists)
        $this->_app['userRoom.manager']->insertOrUpdate(array(
            'room_id' => $this->getId(),
            'user_id' => $conn->User->getId(),
        ));

        // Memory
        $this->_subscribers->attach($conn);

        // Store on $conn for future onClose
        // 'Indirect modification of overloaded property has no effect' fixing
        $subscribedRooms = $conn->subscribedRooms;
        $subscribedRooms[] = $this->_topic;
        $conn->subscribedRooms = $subscribedRooms;

        // Confirm subscription to user
        $conn->event($this->_topic, array(
            'action' => 'subscribeSuccess',
            'data' => $this->getData()
        ));

        // Push room users
        foreach ($this->_subscribers as $attendee) {
            if ($conn->User->getId() != $attendee->User->getId()) { // to prevent sending current user two times (addRoomAttendee and userEnterInRoom)
                $conn->event($this->_topic, array(
                    'action' => 'addRoomAttendee',
                    'data' => array(
                        'id' => $attendee->User->getId(),
                        'username' => $attendee->User->getUsername(),
                        'avatar' => $attendee->User->getAvatarUrl(20),
                    )
                ));
            }
        }

        // Push welcome message
        $this->botMessage("Hi {$conn->User->getUsername()}, welcome on this chan. Please be polite and fair with others.", $conn);

        // Notify everyone this user has joined the room
        $this->broadcastToSubscribers(array(
            'action' => 'userEnterInRoom',
            'data' => array(
                'id' => $conn->User->getId(),
                'username' => $conn->User->getUsername(),
                'avatar' => $conn->User->getAvatarUrl(20),
            )
        ), $conn);

        // Inform other device that they should join to room!
        $this->_app['users']->broadcastToUser($conn, array(
            'action' => 'pleaseJoinRoom',
            'data' => array('topic' => $this->_topic),
        ));
    }

    public function unsubscribe(ConnectionInterface $conn, $closingConnection = false)
    {
        // Database
        if ($closingConnection !== true) {
            $this->_app['userRoom.manager']->delete(array('user_id' => $conn->User->getId(), 'room_id' => $this->getId()));
        }

        if (!$this->_subscribers->contains($conn)) {
            $this->error("Connection '{$conn->User->getId()}' NOT in the user list");
            return;
        }

        // Memory
        $this->_subscribers->detach($conn);

        // Store on $conn for future onClose
        $subscribedRooms = $conn->subscribedRooms;
        unset($subscribedRooms[$this->_topic]);
        $conn->subscribedRooms = $subscribedRooms;

        // Inform other device that they should leave to room!
        if ($closingConnection !== true) {
            $this->_app['users']->broadcastToUser($conn, array(
                'action' => 'pleaseLeaveRoom',
                'data' => array('topic' => $this->_topic),
            ));
        }

        // Notify everyone this guy has leaved the room
        $this->broadcastToSubscribers(array(
            'action' => 'userOutRoom',
            'data' => array(
                'id' => $conn->User->getId(),
                'username' => $conn->User->getUsername(),
                'avatar' => $conn->User->getAvatarUrl(20),
            )
        ), $conn);
    }

    public function publish(ConnectionInterface $conn, $event, array $exclude = array(), array $eligible = array())
    {
        $message = $event['message'];
        $message = $this->escape((string)$message);

        if (empty($message)) {
            $conn->event($this->_topic, array('action' => 'publishError', 'data' => array('error' => "Empty event published by '{$conn->User->getId()}' on '{$this->_topic}'")));
            return;
        }

        // This room is not subscribed by user
        if (!$this->_subscribers->contains($conn)) {
            $conn->event($this->_topic, array('action' => 'publishError', 'data' => array('error' => "User '{$conn->User->getId()}' has not subscribed to the room '{$this->getId()}'")));
            return;
        }

        // Archive message in database
        $this->_app['message.manager']->insert(array(
            'user_id' => $conn->User->getId(),
            'room_id' => $this->getId(),
            'username' => $conn->User->getUsername(),
            'message' => $message,
        ));

        $this->broadcastToSubscribers(array(
            'action' => 'message',
            'data' => array(
                'user_id' => $conn->User->getId(),
                'username' => $conn->User->getUsername(),
                'avatar' => $conn->User->getAvatarUrl(20),
                'message' => $message,
                'time' => time(),
            ),
        ));
    }

    /**
     * Change room baseline, inform room attendees and return true
     * If error return error message as string
     *
     * @param $baseline
     * @return bool|string
     */
    public function changeBaseline($baseline, $username)
    {
        // Save in database
        $this->_app['room.manager']->update(array('baseline' => $baseline), array('id' => $this->getId()));

        // Save in memory
        $this->setBaseline($baseline);

        // Push to users
        $this->broadcastToSubscribers(array(
            'action' => 'roomBaseline',
            'data' => array(
                'baseline' => $baseline,
                'username' => $username,
            ),
        ));

        return true;
    }

    /**
     * Broadcast an event to all users of this room
     *
     * @param mixed $event
     * @param ConnectionInterface $exclude The user connection to exclude from broadcast
     */
    protected function broadcastToSubscribers($event, ConnectionInterface $exclude = null)
    {
        foreach ($this->_subscribers as $conn) {
            if ($conn !== $exclude) {
                $conn->event($this->_topic, $event);
                $this->_app['monolog']->debug("Broadcast to {$conn->User->getId()} on {$this->_topic}");
            }
        }
    }

    /**
     * Ask to the bot to say something to someone in the room
     *
     * @param string $msg
     */
    public function botMessage($msg, ConnectionInterface $conn)
    {
        $conn->event($this->_topic, array(
            'action' => 'message',
            'data' => array(
                'user_id' => $this->_bot->getId(),
                'username' => $this->_bot->getUsername(),
                'avatar' => $this->_bot->getAvatarUrl(20),
                'message' => $msg,
                'time' => time(),
            ),
        ));
        $this->_app['monolog']->debug("Bot message to {$conn->User->getId()} on {$this->_topic}");
    }

    /**
     * @param string
     * @return string
     */
    protected function escape($string)
    {
        return htmlspecialchars($string);
    }

    /**
     * @return boolean
     */
    public function shouldBeRemoved()
    {
        if (count($this->_subscribers) < 1 && $this->getProtected() != 1) {
            return true;
        }

        return false;
    }

    /**
     * Remove room from database.
     */
    public function delete()
    {
        // Remove user_room
        $this->_app['userRoom.manager']->delete(array(
            'room_id' => $this->getId(),
        ));

        // Remove room
        $this->_app['room.manager']->delete(array(
            'id' => $this->getId(),
        ));
    }
} 