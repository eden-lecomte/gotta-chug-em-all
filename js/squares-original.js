goldGyms = [
    gym0 = {
        function () {
            alert('You landed on a Gold Gym!');
            reRoll();
            setTimeout(function () {                
                if (diceRoll == 2 || diceRoll == 4 || diceRoll == 6) {
                    gameSquares[6].give = 1
                    alert('Give someone a drink!')
                } else {
                    gameSquares[6].drink = 1
                    alert('Drink 1!')
                }
            }, 6000);
        }
    }
]

var gameSquares = [
    square0 = {
        text: 'Start',
        latlng: [-232, 44],
    },
    square1 = {
    	latlng: [-207, 44],
        text: 'Rattata used Tackle! ... wait, you seriously rolled a 1?',
        action: 'You fainted, finish your drink.' ,
        drink: 100,
    },
    square2= {//pidge
    	latlng: [-185, 44],
        text: 'Pidgey used Quick Attack!',
        action: 'Use that quickness to give 1 drink and take an extra turn.',
        extraTurn: true,
        give: 1,
    },
    square3= {//caterpie
  		latlng: [-162, 44],
        text: 'Caterpie used String Shot! It was super effective!',
        action: 'All other players may only move 1/2 of what they roll on their next turn (round up)',
        specialEffect: 'stringshot',
    },
    square4= {//pika
    	latlng: [-137, 44],
        text: 'You caught a Pikachu!',
        action: 'Drink 2 and replace your started with this walking electric franchise.',
        drink: 2,
        specialEffect: 'pikachu',
    },
    square5= {//beedrill
    	latlng: [-115, 44],
        text: 'Beedrill used Twinneedle!',
        action: 'Pick two people to drink',
        give: [1,2],//drinks,people
    },     
    square6= {//Pewter Gym
    	latlng: [-90, 44],   
    	gymGold: true,
        text: 'PEWTER GYM will Brock your world',
        action: 'Roll a die. Even: Give a drink. Odd Take a drink',
        reroll: true,
        fn: goldGyms[0].function,
    },   
    square7= {//nidos
    	latlng: [-67, 44],
        text: 'Enjoy that sexism',
        action: "If you're a guy, guys drink. If you're a girl, girls drink",
        give: [1, 'gender']
    },    
    square8= {//zubats
    	latlng: [-45, 44],
        text: "Zubats... they're... they're everywhere!",
        action: 'Take a drink. Next turn, if you roll a 1 or 2 stay here and drink!',
        drink: 1,
        specialEffect: 'zubats',
    },      
    square9= {//RNG SQUARE
    	latlng: [-45, 68],
        text: 'Clefairy used Metronome!',
        action: 'RNG a square, and drink or give what is says. If no drink is given or taken, just drink 2.',
        specialEffect: 'clefairy',
    }, 
    square10= {//Jigglypuff
    	latlng: [-45, 92],
        text: 'Jigglypuff used Sing!',
        action: 'Everyone else fell asleep! Take an extra turn',
        extraTurn: true,
    }, 
    square11= {//abra
    	latlng: [-45, 115],
        text: 'Abra used Teleport!',
        action: 'Teleport to the other Abra.',
        specialEffect: 'abra',
    }, 
    square12= {//gary
    	latlng: [-45, 137],
        text: "Gaaaaaaary. What's this guys deal anyway?",
        action: 'Roll a die. Drink half, give half(round up)',
        drink: diceRoll/2,
        give: diceRoll/2,
    }, 
    square13= {//cerulean gym
    	latlng: [-45, 162],
        gymGold: true,
        text: 'CERULEAN GYM - Did you Mist me?',
        action: "Misty's water attacks caused splash damage. You drink 2, everyone else drinks 1",
        drink: 2,
        give: [1,99],//all take one except player
    }, 
    square14= {//slowpizzle
    	latlng: [-45, 185],
        text: 'Slowpoke is slow.',
        action: 'For the first one here, make up a gesture. For the rest of the game, when you do it the last to mimic you takes a drink',
    }, 
    square15= {//bellsprout
    	latlng: [-45, 207],
        text: 'Bellsprout used Razor Leaf!',
        action: "Shred someone's dignity with a reckless callout. They drink 1 in shame",
        give: 1,
    }, 
    square16= {//Meowth
    	latlng: [-45, 232],
        text: 'Meowth used Pay Day',
        action: "Everybody but you takes a drink",
        give: [1,99],//all but you
    }, 
    square17= {//Diglett
    	latlng: [-67, 232],
        text: 'Diglett used Dig!',
        action: "Dig deep and finish your drink.",
        drink: 100,
    }, 
    square18= {//ssanne
    	latlng: [-90, 232],
        text: 'Enjoy your cruise aboard the S.S. Anne! Sucker.',
        action: "Roll a die, you lose that many turns aboard the luxury cruise liner. Roll again, and drink that number during each turn lost.",
        missTurn: diceRoll[0],
        drink: diceRoll[1],
        //probably easiest to set up something in the give array
    }, 
    square19= {//VERMILION GYM
    	latlng: [-115, 232],
        gymGold: true,
        text: 'VERMILION GYM - Let me Surge life into you with some drinks',
        action: "Roll a die. Even, you're paralyzed; take 2 drinks and miss your next turn. Odd, take a drink",
        reroll: true,
    }, 
    square20= {//bicycle
    	latlng: [-137, 232],
        text: 'I want to ride my BYCYCLE! BICYCLE! BICYCLE!',
        action: "On your next turn, roll the die and move twice that number",
        specialEffect: 'bicycle',
        
    }, 
    square21= {//spash spash motherfucker
    	latlng: [-162, 232],
        text: 'MAGICARP USED SPASH!',
        action: "...but nothing happened",
        specialEffect: 'spash',
    }, 
    square22= {//Sandshrew
    	latlng: [-186, 232],
        text: 'Sandshrew used Sand-Attack! Your accuracy is lowered.',
        action: "For the rest of the game, you may only drink with your non-dominant hand",
    }, 
    square23= {//Pokemans tower
    	latlng: [-207, 232],
        gymSilver:true,//pokemans tower
        text: 'While in the Pokemans Tower, out of respect for the dead, you should not speak. Doing so results in a drink each time.',
        action: "Take a drink now for your fallen comrades.",
        give: [1,99],//all 1
    }, 
    square24= {//drinks bitch
    	latlng: [-232, 232],
        gymSilver:true,//pokemans tower
        text: "A possessed Channeler. Now you're possessed too!",
        action: "While you are on this space, anyone may make you get them a drink.",
        specialEffect: 'possessed',
    }, 
    square25= {//Haunter
    	latlng: [-232, 208],
        gymSilver:true,//pokemans tower
        text: "Haunter used Dream Eater!",
        action: "Devour someone else's dreams by moving them back 10 spaces",
        specialEffect: 'haunter',
    }, 
    square26= {//cubone
    	latlng: [-232, 185],
        gymSilver:true,//pokemans tower
        text: "Cubone used 'My mother is dead.'",
        action: "Share a depressing story with the group. Then everyone take a drink.",
        give: [1,99],
    }, 
    square27= {//mysterious ghost
    	latlng: [-232, 161],
        gymSilver:true,//pokemans tower
        text: "If someone is in Silph Co, you use the Silph Scope to beat the ghost.",
        action: "If you beat the ghost, everyone else drinks. Otherwise take 3 drinks to appease the dead. ",
    }, 
    square28= {//bad abra
    	latlng: [-232, 137],
       
        text: "Abra used Teleport!",
        action: "Teleport to the other Abra.",
        specialEffect: 'teleport',
    }, 
    square29= {//Snorelax
    	latlng: [-232, 114],
        
        text: "A sleeping Snorelax blocks your path",
        action: "Belt out a song of the group's choice to wake him, or take 4 D's",
        //drink:4,
    }, 
    square30= {//gaaary
    	latlng: [-232, 91],
       
        text: "Gaaaary. Seriously though, is this dude following you or something?",
        action: "Roll a die. Drink that number minus one.",
        drink: diceRoll-1,
    }, 
    square31= {//evee
    	latlng: [-232, 67],
        
        text: "Eeveelution time!",
        action: "You choose a new rule! any rule violations result in a drink.",
        //
    }, 
    square32= {//CELADON GYM
    	latlng: [-210, 67],
        gymGold: true,
        text: "CELADON GYM - something something Erika",
        action: "Roll a die. 1-3: Stun Spore; Lose a turn. 4-6 Mega Drain; Finish your drink.",
        //
    }, 
    square33= {//psyduck
    	latlng: [-185, 67],
        
        text: "Psyduck is slow.",
        action: "For the first one here, make a gesture. For the rest of the game, when you do it, the last to mimic you takes a drink",
        //
    }, 
    square34= {//evolve!
    	latlng: [-162, 67],
        
        text: "What? Your Pokemon is evolving!",
        action: "Let is evolve: Drink 4 and skip the next gym. Stop evolution: take and extra turn.",
        specialEffect: 'evolution',
    }, 
    square35= {//Porygon
    	latlng: [-232, 67],
        
        text: "Porygon used Tri Attack!",
        action: "While on this space, for each drink you are given the giver must drink 3",
        specialEffect: 'porygon',
        //
    }, 
    
    square36= {//evee
    	latlng: [-232, 67],
        
        text: "Eeveelution time!",
        action: "You choose a new rule! any rule violations result in a drink.",
        rule: true,
        //
    }, 
    
                             
];



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
        missTurn: true,     // Player misses their turn
        gymGold: true,      // Gold square, players must stop here
        gymSilver: true,    // Silver square, special effects apply - must be checked beginning and end of turn
        gesture: true,      // First one here makes a gesture, set to false once landed on
        rule: true,         // Make a rule
        specialEffect: 'zubats', // see special effects below
        
        //silver squares
        silphCo: true,      // Begin each turn +2 drinks
        safariZone: true,   // Roll dice at start of each turn, then take turn
        pikachu: true,      //replace starter with pikachu
        bicycle: true,      //double movement next turn
    }
};