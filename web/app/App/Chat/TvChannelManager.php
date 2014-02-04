<?php

namespace App\Chat;

use App\Orm\EntityManager;

class TvChannelManager extends EntityManager
{
    /** @var string */
    protected $table = 'tv_channels';

    /** @var string */
    protected $entityClass = "\\App\\Chat\\TvChannel";

} 