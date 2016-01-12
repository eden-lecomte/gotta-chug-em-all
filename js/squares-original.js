goldGyms = [
    gym0 = {
        function () {
            alert('You landed on a Gold Gym!');
            reRoll();
            setTimeout(function () {                
                if (diceRoll == 2 || diceRoll == 4 || diceRoll == 6) {
                    //gameSquares[6].give = 1
                    alert('Give someone a drink!')
                } else {
                    playerArray[turnCounter].drink += 1
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
        drink: function(){ return fullDrink }
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
        action: 'Drink 2 and replace your starter with this walking electric franchise.',
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
        text: 'PEWTER GYM will Brock your world',
        action: 'Roll a die. Even: Give a drink. Odd Take a drink',
        gymGold: function () {},
        drink: function () { 
            setTimeout(function () {
                    reRoll();
                        setTimeout(function () {                
                            if (diceRoll == 2 || diceRoll == 4 || diceRoll == 6) {
                                return 0
                            } else {
                                playerArray[turnCounter].drink += 1
                                return 1
                            }
                        }, 6000)
            })
        }
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
        fn: function (){
            show_modal('pokerap');
            $('#pokerap').html('<iframe width="560" height="315" src="https://www.youtube.com/embed/-dedmEDT_60?autoplay=1&modestbranding=1&controls=0&loop=1&showinfo=0&rel=0&playlist=-dedmEDT_60" frameborder="0" allowfullscreen></iframe><br /><br /><button onclick="clearModal(pokerap)" style="float: right">Finished</button>');
        },
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
        action: "Roll a die. 1-3: Stun Spore; Lose a turn. 4-6: Mega Drain; Finish your drink",
        reRoll: true
        
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
    	latlng: [-136, 67],
        
        text: "Porygon used Tri Attack!",
        action: "While on this space, for each drink you are given the giver must drink 3",
        specialEffect: 'porygon',
        //
    }, 
    
    square36= {//SILPH CO.
    	latlng: [-115, 67],
        gymSilver: true, //Silphco
        text: "You've infiltrated the headquarters of the infamous Team Rocket! You will need all your courage to make it to their leader.",
        action: "Drink an extra 2 every turn to calm your nerves",
        
        //
    }, 
    square37= {//scientist
    	latlng: [-92, 67],
        gymSilver: true, //Silphco
        text: "A Scientist uses his magnet Pokemon!",
        action: "You magnetically attract 1 drink per player in the game",
        drink: function(){ return numPlayers }
        //
    }, 
    square38= {//Lapras
    	latlng: [-68, 67],
        gymSilver: true, //Silphco
        text: "Lapras used Confuse Ray!",
        action: "Pick a player; they are now confused. Next turn, they must roll a 1-3 to stop being confused. If not, they are still confused and lose a turn.",
        specialEffect: 'confuseRay',
        //
    }, 
    square39= {//Team rocket
    	latlng: [-68, 91],
        gymSilver: true, //Silphco
        text: "It's Team Rocket! Watch them defeat themselves with incompetence.",
        action: "Everyone drink to them blasting off",
        give: [1,99],
        //
    }, 
    square40= {//Giovanni
    	latlng: [-68, 114],
        gymSilver: true, //Silphco
        text: "GIOVANNI",
        action: "Roll a die. 1-3 Give that number. 4-6 Drink that number",
        reRoll: true
        //
    }, 
    square41= {//rare candy
    	latlng: [-68, 138],
        
        text: "Rare Candy - Level up!",
        action: "You get and extra turn.",
        extraTurn: true,
        //
    }, 
    square42= {//gary
    	latlng: [-68, 162],
        
        text: "Gaaaaaary. The next time this punk hassles you will be the last.",
        action: "Roll a die and take that many drinks.",
        reRoll: true,
        //
    }, 
    square43= {//SAFFRON GYM
    	latlng: [-68, 185],
        gymGold: true,
        text: "SAFFRON GYM - lol gl.",
        action: "Use psychich powers to pick a number, then roll the die. If it's your number, take and extra turn. If not, drink 2",
        specialEffect: 'saffronGym',
        //
    }, 
    square44= {//chugging contest
    	latlng: [-68, 209],
        
        text: "The ultimate chug down of ultimate destiny",
        action: "Challenge someone to a chugging contest. First to finish gets an extra turn, last to finish loses a turn.",
        extraTurn: true,
        //
    }, 
    square45= {//Krabby
    	latlng: [-91, 209],
        
        text: "Krabby(boss af.) used Crabhammer!",
        action: "Bring down the Crabhammer on someone; They must finish their drink",
        give: [1,100],//finish
        //
    }, 
    square46= {//Ditto
    	latlng: [-115, 209],
        
        text: "Ditto used Transform!",
        action: "During the next person's turn, you must copy everything they do!",
        
        //
    }, 
    square47= {//Doduo
    	latlng: [-137, 209],
        
        text: "Doduo used Double-Edge",
        action: "You give 4 drinks, but you drink 1",
        give: 4,
        drink: 1,
        //
    }, 
    square48= {//Safari zone
    	latlng: [-162, 209],
        gymSilver: true,//sadness zone
        text: "SAFARI ZONE - Valley of tears",
        action: "Before each turn in the Safari Zone, roll a die. 1-2: You throw bait. Give 1 drink to someone. 3-4: You throw a rock, dick. Lose your turn, drink 4. 5-6: You throw a safari ball. Drink 2 in sadness, because safari balls are just awful.",
        //
    }, 
    square49= {//Dratini
    	latlng: [-185, 209],
          gymSilver: true,//sadness zone
        text: "Gone fishin'... a wild Dratini appeared!",
        action: "Roll a 1 to catch. Otherwise, drink 1",
        reRoll: true
        //
    }, 
    square50= {//Taurus
    	latlng: [-209, 209],
          gymSilver: true,//sadness zone
        text: "A wild Taurus appeared... but instantly fled.",
        action: "Drink 2 for not being quick enough",
        drink: 2,
        //
    }, 
    square51= {//Chansey
    	latlng: [-209, 185],
          gymSilver: true,//sadness zone
        text: "A wild Chansey appeared",
        action: "Roll the dir. if it's 1-3 Chansey eludes you, drink 1. If 4-6, you capture Chansey, give 2.",
        drink: 2,
        //
    }, 
    square52= {//FUCHSIA GYM
    	latlng: [-209, 162],
          gymGold: true,//sadness zone
        text: "FUCHSIA GYM - Poison Pokemon are Toxic!",
        action: "Better get intoxicated! Drink 3.",
        drink: 3,
        //
    }, 
    square53= {//AWESOME
    	latlng: [-209, 209],
        text: "Electrode used Explosion!",
        action: "Everybody finish their drinks!",
        give: [100,99]
        //
    }, 
    square54= {//Electabuzz 
    	latlng: [-209, 115],         
        text: "Electabuzz used Thunder Punch!",
        action: "You're paralyzed; miss your next turn.",
        missTurn: true,
        //
    }, 
    square55= {//poliwag
    	latlng: [-209, 92],        
        text: "Poliwag used Hydro Pump!",
        action: "Shotgun a beer",
        drink: function(){ return fullDrink }
        //
    }, 
    square56= {//Seaking
    	latlng: [-185, 92],        
        text: "Seaking used Waterfall!",
        action: "...do a waterfall!",
        give: [50,50],
        //
    }, 
    square57= {//Missingno!
    	latlng: [-162, 92],        
        text: "A wild Missingno!",
        action: "Roll 3 times. Get a 5 or 6, and you continue. If not, you glitched. Restart at Pallet Town.",
        specialEffect: 'missingno',
        //
    }, 
    square58= {//CINNABAR GYM
    	latlng: [-137, 92],  
        gymGold: true,      
        text: "CINNABAR GYM - Zhu Li, do the thing",
        action: "Roll a die, Even, roll again. Odd, drink twice as many times as you rolled evens.",
        //needs a thing
        //
    }, 
    square59= {//Koffing used Haze!
    	latlng: [-114, 92],        
        text: "If there's anything nearby to smoke",
        action: "smoke it to avoid taking 2 drinks",
        specialEffect: 'Koffing',
        //
    }, 
    square60= {//fossil pokes
    	latlng: [-92, 92],        
        text: "You resurrected a Fossil Pokemon! ",
        action: "Everyone older than you drinks 2.",
        specialEffect: 'being old',
        //
    }, 
    square61= {//catch
    	latlng: [-92, 114],        
        text: "You throw a Pokeball!",
        action: "If your favorite Pokemon is on the board, roll a 1-3 to catch it! Roll a 4-6 and it got away, drink 3. if your favorite is not on the board, sadly drink 3.",
        reRoll: function (){
            if (diceRoll != 1 ||diceRoll != 2 ||diceRoll != 3)
            drink: 3;        
                }
        //
    }, 
    square62= {//Persian
    	latlng: [-92, 137],        
        text: "Persian used Fury Swipes!",
        action: "Roll a die, and give out that many drinks.",
        reRoll: function (){
            give: [1,diceRoll]
        }
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