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
        // Attache user to control topic
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
    }

    public function unsubscribe(ConnectionInterface $conn)
    {
        $this->_subscribers->detach($conn);
    }

    public function publish(ConnectionInterface $conn, $message, array $exclude = array(), array $eligible = array())
    {
        // Not allowed to publish on control topic
    }

} 