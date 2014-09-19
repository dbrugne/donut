var _ = require('underscore');

var quotes = [
  "Ravi de vous revoir, %u",
  "Sympa de vous revoir, %u",
  "Quel plaisir de vous revoir %u",
  "Sympa d'être passé %u",
  "Un petit café %u ?",
  "Un p'tit donut %u ?",
  "Belle journée %u, non ?",
  "Bien le bonjour %u",
//  "Joyeux non-anniversaire %u !",
  "Ouaish ouaish %u",
  "Salutations %u",
  "Ca fait un bail %u",
  "Yo %u",
  "Peace and love, %u",
  "Ahoy-Hoy %u !",
  "Quoi de neuf %u ?",
//  "Super coupe de cheveux %u",
  "Buenos dias %u",
  "Enfin réveillé %u ?",
//  "Vous avez l'air en forme %u",
//  "Vous avez bonne mine %u",
  "Salut %u, ça va ?",
  "La forme %u ?"
];

module.exports = function() {

  return _.sample(quotes);

};