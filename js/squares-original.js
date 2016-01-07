var gameSquares = {
    square0: {
        text: 'Start',
        latlng: [20, 30],
    },
    square1: {
        text: 'Rattata used Tackle! ... wait, you seriously rolled a 1?',
        action: 'You fainted, finish your drink.' 
    },
    square2: {
        text: 'Pidgey used Quick Attack!',
        action: 'Use that quickness to give 1 drink and take an extra turn.',
        extraTurn: true,
        give: 1,
    },
    square3: {
        text: 'Caterpie used String Shot! It was super effective!',
        action: 'All other players may only move 1/2 of what they roll on their next turn (round up)',
        stringShot: true,
    },
    square4: {
        text: 'Pidgey used Quick Attack!',
        action: 'Use that quickness to give 1 drink and take an extra turn.',
        extraTurn: true,
        give: 1,
    },
    square5: {
        text: 'Pidgey used Quick Attack!',
        action: 'Use that quickness to give 1 drink and take an extra turn.',
        extraTurn: true,
        drinkGive: 1,
    },            
};

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