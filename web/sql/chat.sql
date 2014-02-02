--
-- Structure de la table `chat_messages`
-- - id > L'ID du message
-- - user_id > L'ID de l'utilisateur
-- - time > La date d'envoi
-- - message > Le contenu du message
--
DROP TABLE IF EXISTS `messages`;
CREATE TABLE IF NOT EXISTS `messages` (
  `id` int(11) NOT NULL auto_increment,
  `user_id` int(11) NOT NULL,
  `time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `message` varchar(255) collate latin1_general_ci NOT NULL,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM ;


--
-- Structure de la table `onlines`
-- - id > L'ID du membre connecte
-- - ip > Son adresse IP
-- - user > L'ID de l'utilisateur
-- - status > Pour informer les membres (ex : en ligne, absent, occupe)
-- - time > Pour indiquer la date de derniere actualisation
--
DROP TABLE IF EXISTS `onlines`;
CREATE TABLE IF NOT EXISTS `onlines` (
  `id` int(11) NOT NULL auto_increment,
  `ip` varchar(100) collate latin1_general_ci NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('0','1','2') collate latin1_general_ci NOT NULL,
  `time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM ;


--
-- Structure de la table `channels`
-- - id > channel ID
-- - name > channel current name
-- - topic > channel topic
--
DROP TABLE IF EXISTS `channels`;
CREATE TABLE IF NOT EXISTS `channels` (
  `id` int(11) NOT NULL auto_increment,
  `name` varchar(100) collate latin1_general_ci NOT NULL,
  `topic` varchar(300) collate latin1_general_ci NOT NULL,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM ;
