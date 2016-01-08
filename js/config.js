var map;
var oms;
var numPlayers = 0;
var playerArray = [];
var playerNames = new Array();
var gameSettings = {};
var pokeMarker = null; 
var pokemonSelected;
var markerRail = [[-232, 44], [-207, 44]]
var turnCounter = 0;
var movesRemaining = 0;
//**clusters** var markers = L.markerClusterGroup({ disableClusteringAtZoom: 4, maxClusterRadius: 5, spiderfyDistanceMultiplier: 3 });

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

$('#playerSetup').on('submit', function(i) {
    var playerNamesInput = $(this).find("input[name^='playerNames']");
    var playerNamesVal = playerNamesInput.val();
    if (playerNamesVal.length > 1) {
        var playerNamesString = playerNamesVal.toString();

        playerNames.push( ''+playerNamesString+'' );
        numPlayers = playerNames.length;
        playerArray.push(
            player = {
                name: playerNamesString,  //  Name entered from title screen
                pokemon: '',              //  Pokemon selected from title screen
                status: '',               //  Current status effects (stunned, immune etc)
                coords: [-230, 45],       //  Location on the gameboard
                square: 0,                //  Which square are you on
                drinks: 0,                //  How many drinks have been allocated to this player (display in console/scoreboard)
                marker: null,             //  Leaflet marker object
            });
        console.log(playerArray);
        watch(player, 'drinks', function(){
            $('#drinks-' + playerArray[turnCounter].pokemon).text(playerArray[turnCounter].drinks)
        });
        $('.nameList').append("<tr><td width='40%'><span>"+ playerNamesString +"</span></td></tr>");
        
        playerNamesInput.val('');
        playerNamesInput.attr('placeholder', 'Type another one!')

        console.log('Number of players ' + numPlayers)

        return false;
    }
    else {
        return false
    }
});

//avatar selection
var pokeCounter = 0;

$('#namesEntered').on('click', function() {
    $('#playerSetup').slideUp('slow');
    $('#playerNamePickPokemon').html(''+ playerArray[0].name + ', pick your favourite Pokemon!');
    $('#playerIcons').slideDown('slow')
    return false;
});

$('#playerIcons > table > tbody > tr > td').on('click', function(){

    pokemonSelected = $(this).attr('class');
    if ( !$(this).hasClass('pokemonSelected') ){

        playerArray[pokeCounter].pokemon = ''+ pokemonSelected +'';
        playerArray[pokeCounter].marker = L.Marker.movingMarker(markerRail, [2000], {
                                                    icon: window[pokemonSelected]
                                                });
        //**clusters** markers.addLayer(playerArray[pokeCounter].marker);
        oms.addMarker(playerArray[pokeCounter].marker)  //**spiderfier
        playerArray[pokeCounter].marker.addTo(map);
        
        $('.drinksTable').append("<tr><td width='40%'><span>"+ playerArray[pokeCounter].name +"</span></td><td><span id='drinks-"+ playerArray[pokeCounter].pokemon +"'>0</span></td></tr>");
        
        
        $(this).addClass('pokemonSelected');
        pokeCounter += 1;        
        $('#playerIcons').fadeOut();

        console.log(pokeCounter + 'vs' + numPlayers)
        if ( pokeCounter < numPlayers ) { 
            $('#playerIcons').promise().done(function(){
                $('#playerNamePickPokemon').html(''+ playerArray[pokeCounter].name + ', pick your favourite Pokemon!')
                $('#playerIcons').fadeIn();
            });             
        } else {
            $('#playerIcons').slideUp('slow');
            $('#gameConfig').slideDown('slow')
        };

    } else {
        return false;
    };


});

//close final dialog
$('#gameStart').on('click', function() {
    $('.intro-container').slideUp('slow');
    $('#map').slideDown('slow');
    $('#game-controls').slideDown('slow');
    map.invalidateSize();
    $('#ytplayer').remove()
    gameStart();
    return false;
});



//map init
    
map = new L.Map('map', {
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
        
//var fullscreenControl = new L.control.fullscreen().addTo(map); // fullscreen control    
L.polyline(markerRail).addTo(map);

var options = {  //**spiderfier
    keepSpiderfied: true,
    nearbyDistance: 120
};
oms = new OverlappingMarkerSpiderfier(map, options); //**spiderfier


// Grid for marker placement
var gridOptions = {interval: 20,
               showOriginLabel: true,
               redraw: 'move',
               zoomIntervals: [
                {start: 0, end: 1, interval: 25},
                {start: 2, end: 3, interval: 20},
                {start: 4, end: 20, interval: 5}
            ]};

L.simpleGraticule(gridOptions).addTo(map);

// Resize markers on zoom 
map.on('zoomend', function() {
  var currentZoom = map.getZoom();

  var zoomStyles = [ 'null', 'null', '48px', '64px', '128px'];

  $('.marker').css({
      'width': zoomStyles[currentZoom],
      'height': zoomStyles[currentZoom]
  });
});



//Roll the dice
$('.diceRoller').on('click', function(){  

        rollDice();
        //use the function to show it
        show_modal('diceWindow');  
         
        setTimeout(function () {
            $("<div class='diceAnimation'></div>").appendTo('#diceWindow');
            $(".diceAnimation").css('background-image', 'url(img/throw.gif)');
            setTimeout(function () {
                $(".diceAnimation").css('background-image', 'url(img/result.gif)');
            }, 2400);
            setTimeout(function () {
                $(".diceAnimation").css('background-image', 'url(img/diceresult.png)');
            }, 3600);
            setTimeout(function () {
                $("<div class='diceResults'></div>").appendTo('.diceAnimation');
                $('.diceResults').html('<span>' + diceRoll + '</span>');
                $('.die').html( '<span>' + diceRoll + '</span>' );
                $('.diceResults').fadeIn(1500);
            }, 3700);
            setTimeout(function () {
                movesRemaining = diceRoll;
                map.setView(playerArray[turnCounter].coords, 4, {animate: true});
                moveMarker();
            }, 6000);

            setTimeout(function () {
                 
                close_modal();
                $(".diceAnimation").remove();
                $('.diceResults').remove();
                $(".diceAnimation").css('background-img', 'none');
            }, 7000);
        }, 300);         
});  



        

});

//function runs at the beginning of the game
function gameStart(){
    setTimeout(function () {
        map.invalidateSize();
        //**clusters** map.addLayer(markers);
     
        //**clusters** var bounds = markers.getBounds(); // [1]
        //**clusters** map.fitBounds(bounds); // [2]  
    }, 500);
};


function moveMarker() {
    //zoom to marker
    setTimeout(function () {            
        //move marker
        var marker = playerArray[turnCounter].marker;
        var loc = playerArray[turnCounter].square;
        var moveToSquare = loc + 1;
        
        marker.moveTo(gameSquares[moveToSquare].latlng, 800)

        playerArray[turnCounter].square = moveToSquare;
        playerArray[turnCounter].coords = gameSquares[moveToSquare].latlng;

        map.panTo(playerArray[turnCounter].coords, {animate: true, duration: 1.0});
        
        if (gameSquares[moveToSquare].gymGold == true) {
            movesRemaining = 0;
            //do gym things
            resolveTurn();
        } else {
            movesRemaining -= 1;
            console.log('moves remaining ' + movesRemaining)
            if (movesRemaining > 0) {
                moveMarker();
            }
            else {
                resolveTurn();
            }
        }
    }, 2000);    
    
};

//function TEST(){
//    setTimeout(function () {
//        map.invalidateSize();
//        geojson = L.geoJson(playerArray, {
//            pointToLayer: function (player) {
//                return L.marker(player.coords, {icon: player.pokemon})
//           }
//        })
//        markers.addLayer(geojson);
//        map.addLayer(markers);
//        console.log(markers + 'added to map');
//        
//        var bounds = markers.getBounds(); // [1]
//        map.fitBounds(bounds); // [2]  
//    }, 500);
//}


// dice roll
function rollDice() {
    diceRoll = Math.floor(Math.random() * 6) + 1
};

//Check squares and finish turn
function resolveTurn() {
    var playerSquare = playerArray[turnCounter].square;
    var square = gameSquares[playerSquare];
    
    setTimeout(function () {                
        square.fn
            setTimeout(function () {                
                if (square.drink > 0) {
                    playerArray[turnCounter].drinks += square.drink
                    alert('' + playerArray[turnCounter].name + ', drink ' + square.drink);
                    }
                setTimeout(function () {   
                    endTurn();
                }, 1000);             
            }, 1500);
    }, 500);     
       
};

//finilise turn, and progress to next player
function endTurn() {
    turnCounter += 1;
    if (turnCounter >= numPlayers) {
        turnCounter = 0;
    } 
    setTimeout(function () {                
        //map.setView(playerArray[turnCounter].coords, map.getZoom(), {animate: true, duration: 5});
    }, 5000);        
}

function reRoll() {
        rollDice();
        //use the function to show it
        show_modal('diceWindow');  
         
        setTimeout(function () {
            $("<div class='diceAnimation'></div>").appendTo('#diceWindow');
            $(".diceAnimation").css('background-image', 'url(img/throw.gif)');
            setTimeout(function () {
                $(".diceAnimation").css('background-image', 'url(img/result.gif)');
            }, 2400);
            setTimeout(function () {
                $(".diceAnimation").css('background-image', 'url(img/diceresult.png)');
            }, 3600);
            setTimeout(function () {
                $("<div class='diceResults'></div>").appendTo('.diceAnimation');
                $('.diceResults').html('<span>' + diceRoll + '</span>');
                $('.die').html( '<span>' + diceRoll + '</span>' );
                $('.diceResults').fadeIn(1500);
            }, 3700);
            setTimeout(function () {


            }, 6000);

            setTimeout(function () {
                 
                close_modal();
                $(".diceAnimation").remove();
                $('.diceResults').remove();
                $(".diceAnimation").css('background-img', 'none');
            }, 7000);
        }, 300);      
}