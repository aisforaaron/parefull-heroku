/*
  Parefull Helper Utility Functions
  Include this file in the index.html for other js scripts to access.
  Currently only available from front end react, not in express app.
*/
function randomNumber(min, max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

function sliderText(score){
  var items = [
    "zero aint' a score bub! move it -->",
    "Worst. Thing. Ever!",
    "Nope, no thanks.",
    "Ugh, I mean, i've seen worse.",
    "Two parts meh. One part ¯\\_(ツ)_/¯",
    "I'd be ok with this.",
    "It's pretty rad.",
    "Fo real? Yea!",
    "I'm running after this.",
    "Almost all I need.",
    "Best. Thing. Ever!"
  ];
  return items[score];
}

// Compare Text utility method
function getArrow(A,C) {
  // define text lookups
  // zero key is phrase to use w/token to replace
  var gt = ["is * than",   "better", "greater", "tougher", "nicer"]  
  var et = ["is as * as",  "awesome", "good", "swell", "interesting"] 
  var lt = ["is * than",   "weaker", "worse", "sadder", "dumber", "more despicable"] 
  // figure out which text array to use
  var msg = ''
   if(A > C){
     msg = gt //'>'
   } else if(A == C) {
     msg = et //'='
   } else {
     msg = lt //'<'
   }
   // get random lookup
   var max  = msg.length - 1 // remove zero key from count
   var min  = 1
   var rand = randomNumber(min, max)
   // fill in full string with replacement
   return msg[0].replace("*", msg[rand]); 
}

// when the browser can't load a bit img, just show shrug
function imgError (id) {
  document.getElementById(id).src="assets/images/shrug.jpg";
}