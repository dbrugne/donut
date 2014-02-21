<?php
namespace Server\Components;
use Ratchet\ConnectionInterface;
use Ratchet\Wamp\WampServerInterface;
use Ratchet\Wamp\WampConnection;
use Guzzle\Http\Message\Request;

class Bot implements WampServerInterface {
    protected $app;

    protected $wampBot;
    protected $stubBot;

    public $roomId;

    protected $genCount  = 0;

    public function __construct(WampServerInterface $app) {
        $this->app = $app;

        $this->stubBot = new ConnectionStub;
        $this->wampBot = new WampConnection($this->stubBot);

        $this->wampBot->resourceId = -1;

        $this->wampBot->WebSocket = new \StdClass;
        $this->wampBot->WebSocket->request = new Request('get', '/');
        $this->wampBot->WebSocket->request->addCookie('name', 'Lonely Bot');

        $this->wampBot->WAMP = new \StdClass;
        $this->wampBot->WAMP->sessionId =  1;

        $that = $this;
        $this->stubBot->setSendCallback(function($msg) use ($that) {
            $response     = json_decode($msg, true);
            $that->roomId = $response[2]['id'];
        });

        $this->app->onOpen($this->wampBot);
//        $this->app->onCall($this->wampBot, '1', 'createRoom', array('General'));
        $this->stubBot->setSendCallback(null);
//        $this->app->onSubscribe($this->wampBot, $this->roomId);
    }

    public function onOpen(ConnectionInterface $conn) {
        $conn->botWelcomed = array();
        $conn->alone       = false;
        $this->app->onOpen($conn);
    }

    public function onSubscribe(ConnectionInterface $conn, $topic) {

        // Bot subscribe to this channel, before user (except if it's a control topic subscription)
        if ($topic != ChatRoom::CONTROL_TOPIC) {
            // Only if bot is not already subscribed
            $already = false;
            foreach ($this->wampBot->Chat->rooms as $_topic) {
                if ($topic == $_topic) {
                    $already = true;
                    break;
                }
            }
            if (!$already) {
                $this->app->onSubscribe($this->wampBot, $topic);
            }
        }

        // Subscribe the user $conn
        $this->app->onSubscribe($conn, $topic);

        // Then send to him a welcome message
        if ($topic != ChatRoom::CONTROL_TOPIC) {
            $conn->event($topic, array(
                'action' => 'message',
                'data' => array(
                    'user_id' => -1,
                    'username' => $this->stubBot->User->getUsername(),
                    'avatar' => $this->stubBot->User->getAvatarUrl(20),
                    'message' => "Hi {$conn->User->getUsername()}, welcome on this chan. Please be polite and fair with others.",
                    'time' => time(),
                ),
            ));
        }
    }

    public function onUnSubscribe(ConnectionInterface $conn, $topic) {
        $this->app->onUnSubscribe($conn, $topic);
    }

    public function onPublish(ConnectionInterface $conn, $topic, $event, array $exclude = array(), array $eligible = array()) {
        if ($event == '!help') {
            return $conn->event($topic, array(
                'action' => 'message',
                'data' => array(
                    'user_id' => -1,
                    'username' => $this->stubBot->User->getUsername(),
                    'avatar' => $this->stubBot->User->getAvatarUrl(20),
                    'message' => "Reboot!",
                    'time' => time(),
                ),
            ));
        } else {
            // Only if not bot command
            $this->app->onPublish($conn, $topic, $event, $exclude, $eligible);
        }
//        if ((string)$topic == $this->roomId) {
//            if ($event == 'test') {
//                 return $conn->event($topic, array('message', $this->wampBot->WAMP->sessionId, 'pass', date('c')));
//            }
//
//            if ($event == 'help' || $event == '!help') {
//                return $conn->event($topic, array('message', $this->wampBot->WAMP->sessionId, 'No one can hear you scream in /dev/null', date('c')));
//            }
//
//            if ($conn->alone && 1 == $this->genCount) {
//                return $conn->event($topic, array('message', $this->wampBot->WAMP->sessionId, $event, date('c')));
//            }
//        }
    }

    public function onCall(ConnectionInterface $conn, $id, $topic, array $params) {
        $this->app->onCall($conn, $id, $topic, $params);
    }

    public function onClose(ConnectionInterface $conn) {
        $this->app->onClose($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        $this->app->onError($conn, $e);
    }
}