// Parefull utililty methods used in components

module.exports = {

  // dupe from parefullUtils.js - prob have to bundle this method for front end output
  randomNumber: function (min, max) {
    return Math.floor(Math.random()*(max-min+1)+min);
  }

};
