var _ = require('underscore');

var lyrics = [
  "Ravi de vous revoir, %u",
  "Sympa de vous revoir, %u",
  "Quel plaisir de vous revoir %u",
  "Sympa d'être passé %u",
  "Je vous sers un petit café %u ?",
  "Un petit donut %u ?",
  "Ca va être une belle journée non %u ?",
  "Bien le bonjour %u",
  "Joyeux non-anniversaire %u !",
  "Ouaish ouaish %u",
  "Salutations %u",
  "Ca fait un bail %u",
  "Yo %u",
  "Peace and love, %u",
  "Ahoy-Hoy %u !",
  "Quoi de neuf %u ?",
  "Super coupe de cheveux %u",
  "Buenos dias %u",
  "Enfin réveillé %u ?",
  "Vous avez l'air en forme %u",
  "Vous avez bonne mine %u",
  "Salut %u, ça va ?",
  "La forme %u ?"
];

module.exports = function() {

  return _.sample(lyrics);

};