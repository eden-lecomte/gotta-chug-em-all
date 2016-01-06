$( document ).ready(function() {
// game init    

var gameboardOriginalUrl = 'img/board-original.png',
    gameboardGoldSilverUrl = 'img/board-gold-silver.png'

var gameVariant = gameboardOriginalUrl;

$('#selectBoard-original').on('click', function() {
   gameVariant = gameboardOriginalUrl; 
   $('.board-container').slideUp('slow');
   $('.forms-container').slideDown('slow');
   L.imageOverlay(gameVariant, bounds).addTo(map);
   return false;
   
});

$('#selectBoard-goldsilver').on('click', function() {
   gameVariant = gameboardGoldSilverUrl; 
   $('.board-container').slideUp('slow');
   $('.forms-container').slideDown('slow');
   L.imageOverlay(gameVariant, bounds).addTo(map);
   return false;      
});

//configuration
var numPlayers = 0
var playerArray = [];

var playerNames = new Array();
var pokemonSelected = new Array();

var gameSettings = {};

$('#playerSetup').on('submit', function(i) {
    var playerNamesInput = $(this).find("input[name^='playerNames']");
    var playerNamesVal = playerNamesInput.val();
    var playerNamesString = playerNamesVal.toString();

    playerNames.push( ''+playerNamesString+'' );
    numPlayers = playerNames.length;
    playerArray.push(
        player = {
            name: playerNamesString,   
            pokemon: null,
            status: '',
            square: 0,
            drinks: 0,
        });
    console.log(playerArray);
    
    $('.nameList').append("<tr><td width='40%'><span>"+ playerNamesString +"</span></td>");
    
    playerNamesInput.val('');
    playerNamesInput.attr('placeholder', 'Type another one!')

    console.log('Number of players ' + numPlayers)

    return false;
});

//avatar selection

$('#namesEntered').on('click', function() {
    $('#playerSetup').slideUp('slow');
    $('#playerNamePickPokemon').html(''+ playerArray[0].name + ', pick your favourite Pokemon!')
    $('#playerIcons').slideDown('slow')
    return false;
});

$('#playerIcons > table > tbody > tr > td').on('click', function(){
    var i = 1;
    var _pokemonSelected = $(this).attr('class');
    if ( !$(this).hasClass('pokemonSelected') ){
        pokemonSelected.push(_pokemonSelected);
        $(this).addClass('pokemonSelected');
        $('#playerIcons').fadeOut();
        $('#playerIcons').promise().done(function(){
            $('#playerNamePickPokemon').html(''+ playerArray[i].name + ', pick your favourite Pokemon!')
            $('#playerIcons').fadeIn();
        }); 
    
        
    } else {
        return false;
    }
});

function updatePlayerName(i) {
    
}

$('#pokemonSelectionComplete').on('click', function() {
    $('#playerIcons').slideUp('slow');
    $('#gameConfig').slideDown('slow')
    return false;
});

$('#gameStart').on('click', function() {
    $('.intro-container').slideUp('slow');
    $('#map').slideDown('slow')
    map.invalidateSize();
    $('#ytplayer').remove()
    return false;
});




//map init
    
var map = L.map('map', {
    minZoom: 2,
    maxZoom: 4,
    center: [0, 0],
    zoom: 2,
    crs: L.CRS.Simple
});


// dimensions of the image
var w = 2216,
    h = 2216,
    url = gameVariant;
    
// calculate the edges of the image, in coordinate space
var southWest = map.unproject([0, h], map.getMaxZoom()-1);
var northEast = map.unproject([w, 0], map.getMaxZoom()-1);
var bounds = new L.LatLngBounds(southWest, northEast);

// add the image overlay, 
// so that it covers the entire map
//L.imageOverlay(gameVariant, bounds).addTo(map);



// tell leaflet that the map is exactly as big as the image
map.setMaxBounds(bounds);
        
var sidebar = L.control.sidebar('sidebar', {position: 'left'}).addTo(map); //sidebar panel
var fullscreenControl = new L.control.fullscreen().addTo(map); // fullscreen control    
    
// resize left side map controls for sidebar
$(window).resize(function() {
	if( $('#sidebar').width() > 100 ){
		var windowsize = $(window).width();
		var leftpadding = '0';
		
		if (windowsize > 768 && windowsize < 992) {
			leftpadding = '315px';
		}else if (windowsize > 991 && windowsize < 1200) {
			leftpadding = '400px';
		}else if (windowsize > 1201){
			leftpadding = '470px';
		}
	$('.leaflet-left').css({'left': leftpadding})		
	};
});

//disable map controls when clicking/scrolling on sidebar
var div = L.DomUtil.get('sidebar');
if (!L.Browser.touch) {
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation);
} else {
    L.DomEvent.on(div, 'click', L.DomEvent.stopPropagation);
    L.DomEvent.on(div, 'touchstart', L.DomEvent.stopPropagation);	
}

});


// TODO:
    // 1. Number all squares and assign coordinates to each square
    // 2. Add spidifier to markers on same square
    // 3. Trainer battles
    
    //For each player create L.marker.divIcon
    
    //Turns: loop numPlayers until pokemon master, checking for status effects
    
    //Status effects:
    //  Miss a turn
    //  Confused
    //  Silver gym
    //  Drink finished??
    
    //Special squares
    //  Miss a turn
    //  Clefairy
    //  Take another turn (jigglypuff + rare candy)
    //  Gold gyms
    //  Silver gyms (Safari Zone... ugh)
    //  Missingno
    //  Haunter (move back 10)
    //  Magikarp SPASH + Gyrados
    //  Porygon drink reflections
    //  Pikachu
    //  Pokemon evolving (skip next gym)
    //  Jigglypuff
        
    
var gameSquares = {
    square0: {
        text: 'Start',
    },
    square1: {
        text: 'Rattata used Tackle! ... wait, you seriously rolled a 1?',
        action: 'You fainted, finish your drink.' 
    },
    square2: {
        text: 'Pidgey used Quick Attack!',
        action: 'Use that quickness to give 1 drink and take an extra turn.',
        extraTurn: true,
        drinkGive: 1,
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

// properties
// text: ''

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
        
        
    }
};

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