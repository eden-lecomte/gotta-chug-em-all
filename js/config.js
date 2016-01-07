var map;
var oms;
var numPlayers = 0;
var playerArray = [];
var playerNames = new Array();
var gameSettings = {};
var pokeMarker = null; 
var pokemonSelected;
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
numPlayers = 0
playerArray = [];

playerNames = new Array();

gameSettings = {};

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
                drinks: 0,                //  How many drinks have been allocated to this player (display in console/scoreboard)
                marker: null,             //  Leaflet marker object
            });
        console.log(playerArray);
        
        $('.nameList').append("<tr><td width='40%'><span>"+ playerNamesString +"</span></td>");
        
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
    $('#playerNamePickPokemon').html(''+ playerArray[0].name + ', pick your favourite Pokemon!')
    $('#playerIcons').slideDown('slow')
    return false;
});

$('#playerIcons > table > tbody > tr > td').on('click', function(){

    pokemonSelected = $(this).attr('class');
    if ( !$(this).hasClass('pokemonSelected') ){

        playerArray[pokeCounter].pokemon = ''+ pokemonSelected +'';
        playerArray[pokeCounter].marker = L.marker([playerArray[pokeCounter].coords[0], playerArray[pokeCounter].coords[1]], {
                                                    icon: window[pokemonSelected]
                                                });
        //**clusters** markers.addLayer(playerArray[pokeCounter].marker);
        oms.addMarker(playerArray[pokeCounter].marker)  //**spiderfier
        playerArray[pokeCounter].marker.addTo(map);
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


$('#gameStart').on('click', function() {
    $('.intro-container').slideUp('slow');
    $('#map').slideDown('slow')
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
        
var sidebar = L.control.sidebar('sidebar', {position: 'left'}).addTo(map); //sidebar panel
var fullscreenControl = new L.control.fullscreen().addTo(map); // fullscreen control    

var options = {  //**spiderfier
    keepSpiderfied: true,
    nearbyDistance: 120
};
oms = new OverlappingMarkerSpiderfier(map, options); //**spiderfier



var gridOptions = {interval: 20,
               showOriginLabel: true,
               redraw: 'move',
               zoomIntervals: [
                {start: 0, end: 1, interval: 25},
                {start: 2, end: 3, interval: 20},
                {start: 4, end: 20, interval: 5}
            ]};

L.simpleGraticule(gridOptions).addTo(map);

    
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


map.on('zoomend', function() {
  var currentZoom = map.getZoom();

  var zoomStyles = [ 'null', 'null', '48px', '64px', '128px'];

  $('.marker').css({
      'width': zoomStyles[currentZoom],
      'height': zoomStyles[currentZoom]
  });

});


// NEED LAYERS I THINK????



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
        

});


function gameStart(){
    setTimeout(function () {
        map.invalidateSize();
        //**clusters** map.addLayer(markers);
     
        //**clusters** var bounds = markers.getBounds(); // [1]
        //**clusters** map.fitBounds(bounds); // [2]  
    }, 500);
}

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