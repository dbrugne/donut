<?php

namespace Server\Chat;
use Ratchet\ConnectionInterface;

class Control
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

    public function __construct(\Silex\Application $app)
    {
        $this->_app = $app;
        $this->_subscribers = new \SplObjectStorage();
    }

    public function subscribe(ConnectionInterface $conn)
    {
        // Attach user to control topic
        $this->_subscribers->attach($conn);

        // Push to user rooms where he is in
        $roomsListDatabase = $this->_app['userRoom.manager']->findBy(array('user_id' => $conn->User->getId()));
        if (count($roomsListDatabase) > 0) {
            foreach($roomsListDatabase as $roomUser) {
                $conn->event($this->_app['channels']->getControlTopic(), array(
                    'action' => 'pleaseJoinRoom',
                    'data' => array('topic' => $this->_app['channels']->getRoomTopic($roomUser->getRoomId()))
                ));
                $this->_app['monolog']->info("Push topic '{$this->_app['channels']->getRoomTopic($roomUser->getRoomId())}' to '{$conn->User->getId()}'");
            }
        }

        // Push online users
        $this->_app['users']->pushOnlineUsers($conn);

        // Inform others that this guy is online
        $this->broadcastToSubscribers(array(
            'action' => 'newOnlineUser',
            'data' => array(
                'user_id' => $conn->User->getId(),
                'username' => $conn->User->getUsername(),
                'avatar' => $conn->User->getAvatarUrl(20),
            ),
        ), $conn);
    }

    public function unsubscribe(ConnectionInterface $conn)
    {
        $this->_subscribers->detach($conn);

        // Inform others that this guy is online
        $this->broadcastToSubscribers(array(
            'action' => 'removeOnlineUser',
            'data' => array(
                'user_id' => $conn->User->getId(),
            ),
        ), $conn);
    }

    public function publish(ConnectionInterface $conn, $message, array $exclude = array(), array $eligible = array())
    {
        // Not allowed to publish on control topic
    }

    /**
     * Broadcast an event to all subscribers of control topic
     *
     * @param mixed $event
     * @param ConnectionInterface $exclude The user connection to exclude from broadcast
     */
    protected function broadcastToSubscribers($event, ConnectionInterface $exclude = null)
    {
        foreach ($this->_subscribers as $conn) {
            if ($conn !== $exclude) {
                $conn->event($this->_app['channels']->getControlTopic(), $event);
                $this->_app['monolog']->debug("Broadcast to {$conn->User->getId()} on control topic");
            }
        }
    }

} 