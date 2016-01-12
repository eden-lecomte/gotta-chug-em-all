// pass vars to each function as they are called
// var pokemon = playerArray[turnCounter].pokemon
// var name = playerArray[turnCounter].name
// gameStart(pokemon, name)
// will pass the pokemon of the current turn, and the name between functions


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


//shortcodes for current player properties
var _player = playerArray[turnCounter]
var _square = playerArray[turnCounter].square
var _pokemon = playerArray[turnCounter].pokemon
var _name = playerArray[turnCounter].name
var _coords = playerArray[turnCounter].coords
var _marker = playerArray[turnCounter].marker
var _drinks = playerArray[turnCounter].drinks

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
        watch(player, 'drinks', function(){
            $('#drinks-' + playerArray[turnCounter].pokemon).text(playerArray[turnCounter].drinks)
        });
        $('.nameList').append("<tr><td width='40%'><span>"+ playerNamesString +"</span></td></tr>");
        
        playerNamesInput.val('');
        playerNamesInput.attr('placeholder', 'Type another one!')

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
        map.setView(playerArray[turnCounter].coords, 4, {animate: true});
        
       
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
                moveMarker();
            }, 6000);

            setTimeout(function () {
                 
                close_modal();
                $(".diceAnimation").remove();
                $('.diceResults').remove();
                $(".diceAnimation").css('background-img', 'none');
            }, 7000);
        }, 1000);         
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

        
        var nextSquare = _square + 1;
        
        _marker.moveTo(gameSquares[nextSquare].latlng, 800)

        _square = nextSquare;
        _coords = gameSquares[nextSquare].latlng;

        map.panTo(_coords, {animate: true, duration: 1.0});
        
        if (gameSquares[nextSquare].gymGold == true) {
            movesRemaining = 0;
            //do gym things
            resolveTurn();
        } else {
            movesRemaining -= 1;
            if (movesRemaining > 0) {
                moveMarker();
            }
            else {
                resolveTurn();
            }
        }
    }, 1200);    
    
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

    var square = gameSquares[_square];
    
    setTimeout(function () {    
        if (square.fn) {            
            square.fn();
        };
        setTimeout(function () {                
            if (square.drink > 0) {
                _drinks += square.drink
                alert('' + _name + ', drink ' + square.drink);
                }
            setTimeout(function () {   
                endTurn();
            }, 1000);             
        }, 1500);
    }, 500);     
       
};

//finilise turn, and progress to next player
function endTurn() {
    $('.' + _pokemon).css('background-image', '');
    $('.' + _pokemon).css('background-size', '');
    $('.' + _pokemon).css('background-position', '');
    
    turnCounter += 1;
    if (turnCounter >= numPlayers) {
        turnCounter = 0;
    } 
    setTimeout(function () {                
        var currentBkgd = $('.' + _pokemon).css('background-image');
        var animatedPath = currentBkgd.replace("''", "").replace("/sprites/", "/sprites/animated/").replace(".png", ".gif");
        
        $('.' + _pokemon).css('background-image', animatedPath);
        $('.' + _pokemon).css('background-size', '150%');
        $('.' + _pokemon).css('background-position', 'center');
    }, 500);        
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
};

function clearModal(modal_id){
    $(modal_id).html('');
    close_modal();
};