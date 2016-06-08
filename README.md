# gotta-chug-em-all
<p>Pokemon drinking game for the web, utilising Leaflet for the gameboard.</p>

<p>Building the game for original board first, as this is the one I am familiar with. Will create a config for board 2 once board one is complete.
Config between boards should be pretty minimal, only changing square attributes and changing special effects.</p>

<h2>Implemented</h2>
<ul>
  <li>Pokemon intro song</li>
  <li>For each player create L.marker.divIcon against player object</li>
  <li>Dice roll animation and function added</li>
  <li>Turns based off internal counter, current player identified by turn counter</li>
  <li>Animated markers for current turn</li>
  <li>Markers move +1 square until no moves remaining, or gold gym</li>
  <li>Display square info in popup on move</li>
</ul>

Player objects are built as 

<pre>
        player = {
            name: playerNamesString,  //  Name entered from title screen
            pokemon: '',              //  Pokemon selected from title screen
            status: '',               //  Current status effects (stunned, immune etc)
            coords: [-230, 45],       //  Location on the gameboard
            square: 0,                //  Which square are you on
            drinks: 0,                //  How many drinks have been allocated to this player (display in console/scoreboard)
            marker: null,             //  Leaflet marker object
        });
</pre>

<h2>TODO</h2>

<ul>
  <li>Number all squares and assign coordinates to each square - Under action </li>
  <li>Map out each square and it's text/effect, adding sound effects if applicable</li>
  <li>Add spidifier to markers on same square - under action</li>
  <li>Trainer battles</li>
    <ul>
      <li>Modal window appears with both Pokemon</li>
      <li>Switch to .gif icon for each Pokemon during battle</li>
    </ul>
  <li>Turns</li>
    <ul>
      <li>loop playerArray() until final square reached</li>
      <li>Check for status effects before roll</li>
      <li>Check square attributes after roll</li>
      <li><strike>Animate marker .gif of current players turn</strike></li>
    </ul>
  <li>Marker movement</li>
    <ul>
      <li><strike>Marker to animate to square based on roll</strike></li>
      <li>If multiple markers on same square, commence trainer battle</li>
      <li>When passing other markers, or landing on same square, markers should cluster/spiderfy nicely and spread out</li>
      <li><strike>View port to follow marker while moving</strike></li>
    </ul>
    
  <li>Implement music</li>
    <ul>
      <li>Trainer battle music</li>
      <li>BGM based on location of leading player (e.g. SilphCo = Team Rocket theme song, Veridian Gym etc) - Thanks Cheese</li>
      <li>Music controls onscreen or in Sidebar</li>
    </ul>
  <li>Config Status effects:</li>
    <ul>
      <li>Miss a turn</li>
      <li>Confused</li>
      <li>Silver gym</li>
      <li>Drink finished??</li>
    </ul>
  <li>Config Special squares: (see Game Squares Template)</li>
    <ul>
      <li>Miss a turn</li>
      <li>Clefairy</li>
      <li>Take another turn (jigglypuff + rare candy)</li>
      <li>Gold gyms - under action</li>
      <li>Silver gyms (Safari Zone... ugh)</li>
      <li>Missingno</li>
      <li>Haunter (move back 10)</li>
      <li>Magikarp SPASH + Gyrados</li>
      <li>Porygon drink reflections</li>
      <li>Pikachu</li>
      <li>Pokemon evolving (skip next gym)</li>
      <li>Jigglypuff</li>
    </ul>
</ul>

<h3>Game squares template</h3>
Need to configure how each square causes an effect in the game.

<pre>
var gameSquaresTemplate = {
    square0: {
        text: 'Rattata used Tackle! ... wait, you seriously rolled a 1?',   // Description of square
        action: 'You fainted, finish your drink',                           // The action the player must take
        drink: 1,           // How many drinks the player must take ( 0-9 , full , finish )
        groupDrink: 1,      // Specific group of people must drink (selected in menu/auto select)
        everyoneDrink: 1,   // Everyone must drink
        give: 2,            // Player gives that many drinks (nominate x drinks to y players)
        reroll: true,       // Roll the dice again
        extraTurn: true,    // Player takes another turn
        gymGold: true,      // Gold square, players must stop here
        gymSilver: true,    // Silver square, special effects apply - must be checked beginning and end of turn
        gesture: true,      // First one here makes a gesture, set to false once landed on
        rule: true,         // Make a rule
        specialEffect: 'zubats', // see special effects below
        
        //silver squares
        silphCo: true,      // Begin each turn +2 drinks
        safariZone: true,   // Roll dice at start of each turn, then take turn
        
    }
};
</pre>
<pre>
var specialEffectsTemplate = {
    zubats: {},         // Confuse user, they must roll 3+ to leave
    clefairy: {},       // Pick a random square, check drink value. If none, drink 2
    abra: {},           // Swap places with the other Abra
    gary: 1,            // Gary appears 3 times (excluding final Gary) drink value to change based on 1-3
    ssAnne: {},         // Roll a die, skip that many turns, roll again, drink that many per turn. This square fucking sucks.
    bicycle: {},        // Double players next roll, add a status effect
    spash: {},          // Magikarp used Spash! Remember if player landed here for Gyrados
    possessed: {},      // Add a status effect until next turn - drinks bitch (has no real use right now, but would be cool to add to UI)
    haunter: {},        // Pick a player to move back 10 spaces
    silphGhost: {},     // Check if anyone has SilphCo effect, if yes everyone else drinks, if no add 3 drinks
    snorlax: {},        // Popup Youtube music - pick song, players vote Y/N for performance N = 4 drinks
    evolution: {},      // Evolve pokemon, Drink 4 + Skip next gym OR extraTurn
    porygon: {},        // Status effect, any time a drink is given to this player, reflect 3x
    lapras: {},         // Give status effect: CONFUSED = must roll 1-3, then REROLL for their turn ELSE skip turn
    chugging: {},       // Pick another play to chugg, input winner and add status effect for EXTRA TURN and MISS TURN
    ditto: {},          // Copy all drinks of next players turn
    missingno: {},      // Roll 3 times - need 5 or 6 once, else return to start, DEVOLVE
    fearow: {},         // Drink same amount as previous turn
    graveler: {},       // Status effect - lose 2 turns, but no drinks
    
}
</pre>

Note: Pokemon gameboard was not created by me, was found on Reddit. Attribution will be added once I find who the creator was.
I do not claim any ownership to the Pokemon brand or assets.
