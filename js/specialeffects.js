var specialEffectsTemplate = {
    stringshot: {},     // All players 1/2 roll until next turn
    pikachu: {},        // Replace token with Pikachu?? Unsure about this...
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