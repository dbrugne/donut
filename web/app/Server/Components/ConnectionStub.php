<?php
namespace Server\Components;
use Ratchet\ConnectionInterface;
use App\User\User;

class ConnectionStub implements ConnectionInterface {
    protected $onSend;
    protected $onClose;
    public $User;

    public function __construct(\Closure $onSend = null, \Closure $onClose = null) {
        $this->User = new User('Room bot');
        $this->User->setId(0);
        $this->User->setEmail('bot@chat');
        $this->setSendCallback($onSend);
        $this->setCloseCallback($onClose);
    }

    public function setSendCallback(\Closure $onSend = null) {
        $this->onSend = $onSend;
    }

    public function setCloseCallback(\Closure $onClose = null) {
        $this->onClose = $onClose;
    }

    public function send($msg) {
        if (null !== $this->onSend) {
            $cb = $this->onSend;
            $cb($msg);
        }
    }

    public function close() {
        if (null !== $this->onClose) {
            $cb = $this->onClose;
            $cb();
        }
    }
}
