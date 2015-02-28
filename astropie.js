var MAX_RETRIES = 10;
  
var uid = 0,
    userBirthday,
    friendList = new Array(),
    currentFriendView = [],
    friendsBySign = {},
    canvasHeight,
    askedForPerms = false,
    userSign,
    zodiacHistogram = [],
    tableView = [],
    retryCount = MAX_RETRIES,
    radius = 100;

  var States = {
    Begin               : 1,
    WaitForLogin        : 2,
    AskForPerms         : 3,
    NotConnected        : 4,
    NotAuthorized       : 5,
    ConnectedNoPerms    : 6,
    Connected           : 7,
    RetryUserBday       : 8,
    RetryFriendsBdays   : 9,
    HaveUserBday        : 10,
    HaveFriendsBdays    : 11,
    RetryPerms          : 12,
    Done                : 13
  };

  var state = States.Begin;

  var Zodiac = {
    Aries       :   { value: 0, name: 'Aries', color: 'Red' },
    Taurus      :   { value: 1, name: 'Taurus', color: 'Pink' },
    Gemini      :   { value: 2, name: 'Gemini', color: 'Yellow' },
    Cancer      :   { value: 3, name: 'Cancer', color: 'Silver'},
    Leo         :   { value: 4, name: 'Leo', color: 'Orange' },
    Virgo       :   { value: 5, name: 'Virgo', color: 'Brown' },
    Libra       :   { value: 6, name: 'Libra', color: 'Pink' },
    Scorpio     :   { value: 7, name: 'Scorpio', color: 'DarkRed' },
    Sagittarius :   { value: 8, name: 'Sagittarius', color: 'Purple' },
    Capricorn   :   { value: 9, name: 'Capricorn', color: 'Black' },
    Aquarius    :   { value: 10, name: 'Aquarius', color: 'Turquoise' },
    Pisces      :   { value: 11, name: 'Pisces', color: 'SeaGreen' }
  };

function textSize() { return (canvasHeight / 2 ) / 24; }
function textPaddingPx() { return textSize() + 8; }
function signImageSize() { return (canvasHeight / 2) / 6; }

$(document).ready(function() {

   generateZodiacDivs();

   canvasHeight = $(document).height() - 210;

   $("#center").height(canvasHeight);
   $("#tableview").height(canvasHeight);

   // canvasHeight = 2 ( R + IMG + TEXT )
   radius = ( canvasHeight / 2 ) - textSize() - signImageSize();

   $("#backToPie").click(backToPie);
   $("#guysbutton").click(switchToGuys);
   $("#galsbutton").click(switchToGals);
   $("#bibutton").click(switchToBi);
});

function retryLoginStatus() {
    setTimeout( checkLoginStatus, 250 );
}

function checkLoginStatus() {
  FB.getLoginStatus(function(response) {
      if ( typeof response.error !== 'undefined' ) {
          console.log('checkLoginStatus error: ' + JSON.stringify(response));
          retryLoginStatus();
          return;
      }

      if ( typeof response.status === 'undefined' ) {
          // API change?!
          console.log('checkLoginStatus status not found: ' + JSON.stringify(response));
          return;
      }

      if ( response.status == "connected" ) {
          $("#center").show();
      }
      else
      {
          $("#splash").show();
       }
    });
}

function init() {
  state = States.WaitForLogin;

  checkLoginStatus();

  // Here we subscribe to the auth.authResponseChange JavaScript event. This event is fired
  // for any auth related change, such as login, logout or session refresh. This means that
  // whenever someone who was previously logged out tries to log in again, the correct case below 
  // will be handled. 
   FB.Event.subscribe('auth.authResponseChange', function(response) {
         // Here we specify what we do with the response anytime this event occurs. 
         if (response.status === 'connected') {
            // The response object is returned with a status field that lets the app know the current
            // login status of the person. In this case, we're handling the situation where they 
            // have logged in to the app.
            $("#splash").hide();
            $("#center").show();

            transition( States.ConnectedNoPerms );

         } else if (response.status === 'not_authorized') {
            // In this case, the person is logged into Facebook, but not into the app, so we call
            // FB.login() to prompt them to do so. 
            // In real-life usage, you wouldn't want to immediately prompt someone to login 
            // like this, for two reasons:
            // (1) JavaScript created popup windows are blocked by most browsers unless they 
            // result from direct user interaction (such as a mouse click)
            // (2) it is a bad experience to be continually prompted to login upon page load.

            transition( States.NotAuthorized );
         } else {
            // In this case, the person is not logged into Facebook, so we call the login() 
            // function to prompt them to do so. Note that at this stage there is no indication
            // of whether they are logged into the app. If they aren't then they'll see the Login
            // dialog right after they log in to Facebook. 
            // The same caveats as above apply to the FB.login() call here.
            transition( States.NotConnected );
         }
       });
   } // end of init

function onConnected() {
   $("#loading").show();

   getUserBirthday();
}

function drawUserSign() {
   // display the user's sign details
   if ( typeof userSign !== 'undefined' ) {

       var signTd = document.getElementById("sign_td");

       signTd.innerHTML = "<h2>Your sign is<br>" + userSign.name + "</h2>";

       var signImg = document.createElement("img");

       signImg.src          = "images/" + userSign.name + ".png";
       signImg.id           = "user_sign_img";
       signImg.style.top    = "0px";
       signImg.style.width  = "25%";
       signImg.style.height = "25%";

       document.getElementById("sign_img").appendChild(signImg);
   }

}

function noFilter() {
    return friendList;
}

function guysFilter() {
    return friendList.filter( 
            function (friend) { 
                return friend.gender == 'male' 
            } ); 
}

function galsFilter() {
    return friendList.filter( 
            function (friend) { 
                return friend.gender == 'female' 
            } ); 
}


function drawZodiac(zodiac) {
    $("#zodiaccenter").empty();

   // create the pie chart
   var adjustedImgDim = Math.floor(radius / 6);

   var canvas = document.createElement("canvas");
   canvas.id                = 'mycanvas';
   canvas.width             = radius * 2 + adjustedImgDim * 2;
   canvas.height            = $("#center").height();
   canvas.style.position    = "absolute";
   canvas.style.top         = "0px";
   canvas.style.left        = Math.floor(($("#center").width() / 2) - radius - adjustedImgDim) + "px";
   canvas.style.zIndex      = 0;

   $("#zodiaccenter").append(canvas);

   var ctx = canvas.getContext("2d"),
       radiusProportion = (radius - adjustedImgDim) / zodiac.maxFriendsPerSign;

   var  canvasCenterX = radius + adjustedImgDim,
        canvasCenterY = canvasCenterX;

   zodiac.histogram.sort( function(a, b) { return a.friendCount - b.friendCount; });

   for (var i = 0; i < 12; i++) {

       var sign = zodiac.histogram[i].sign;
       ctx.fillStyle = sign.color;
       ctx.beginPath();
       ctx.moveTo(canvasCenterX, canvasCenterY);

       // a zero value in the histogram is false, so this should work
       histogramValue = zodiac.histogram[i].friendCount || 0;

       ctx.arc( canvasCenterX,
                canvasCenterY, 
                radiusProportion * histogramValue,  
                sign.value * Math.PI * 2 / 12, 
                (sign.value + 1) * Math.PI * 2 / 12, 
                false);

       ctx.lineTo(canvasCenterX, canvasCenterY);

       ctx.fill();  

       var halfADegree = (2 * sign.value + 1) * Math.PI / 12;
       var posX = canvasCenterX + radius * Math.cos( halfADegree ) - adjustedImgDim / 2;
       var posY = canvasCenterY + radius * Math.sin( halfADegree ) - adjustedImgDim / 2;

       var signImg = document.getElementById(sign.name + "_image");

       var imgElem = document.createElement("img");
       imgElem.id = "zodiac" + sign.name;
       imgElem.src = signImg.src;
       imgElem.width = adjustedImgDim;
       imgElem.height = adjustedImgDim;
       imgElem.style.position = "absolute";
       imgElem.style.top = Math.floor(canvas.offsetTop + posY) + "px";
       imgElem.style.left = Math.floor(canvas.offsetLeft + posX) + "px";
       imgElem.style.zIndex = 1;

       $("#zodiaccenter").append(imgElem);

       $("#zodiac" + sign.name).mouseenter(imgElem, zodiacImageEnter);
       $("#zodiac" + sign.name).mouseleave(imgElem, zodiacImageLeave);
       $("#zodiac" + sign.name).click(sign, zodiacImageClick);

       //ctx.drawImage(signImg, posX, posY, adjustedImgDim, adjustedImgDim);

       ctx.textAlign    = "center";
       ctx.textBaseline = "top";
       ctx.fillStyle    = "black";
       ctx.font         = textSize() + "px sans-serif";

       var  signImgCaption = sign.name + "(" + (histogramValue * 100 / zodiac.totalFriendCount).toFixed(1) + "%)",
            textPosX = posX + (adjustedImgDim / 2)
            textPosY = posY - textPaddingPx();

       ctx.fillText(signImgCaption, textPosX, textPosY);
   }
}

function zodiacImageEnter(ev) {
    ev.data.width   *= 2;
    ev.data.height  *= 2;
}

function zodiacImageLeave(ev) {
    ev.data.width   /= 2;
    ev.data.height  /= 2;
}

function zodiacImageClick(ev) {
    var sign = ev.data;

    switchToTableView(sign);
}

function switchToTableView(sign) {
    // replace center div with tableview div
    $("#center").hide();
    $("#tableview").show();

    // populate tableview's table with sign's friend list
    populateTableViewBySign(sign);
}

function populateTableViewBySign(sign) {
    // empty the table first
    $("#friendtable").empty();
    $("#tablesignheader").html(sign.name);
    //$("#friendtable").append('<thead><tr><th style="position: relative; left: 0px; font-size: 3em">' + sign.name + '</th></tr></thead>');
    $("#friendtable").append('<tbody>');
    // iterate all friends and put them as tr/tds in table
    for (friend in currentFriendView) {
        if ( currentFriendView[friend].sign.value != sign.value ) continue;

        var name    = currentFriendView[friend]['name'];
        var picture = currentFriendView[friend]['picture'];

        $("#friendtable > tbody:last").append('<tr><td><img src="' + picture + '"/>' + name + '</td></tr>');
    }
    $("#friendtable").append('</tbody>');
}


function old_populateTableViewBySign(sign) {
    // empty the table first
    $("#friendtable").empty();
    $("#tablesignheader").html(sign.name);
    //$("#friendtable").append('<thead><tr><th style="position: relative; left: 0px; font-size: 3em">' + sign.name + '</th></tr></thead>');
    $("#friendtable").append('<tbody>');
    // iterate all friends and put them as tr/tds in table
    for (friend in friendsBySign[sign.value]) {
        var name    = friendsBySign[sign.value][friend]['name'];
        var picture = friendsBySign[sign.value][friend]['picture'];

        $("#friendtable > tbody:last").append('<tr><td><img src="' + picture + '"/>' + name + '</td></tr>');
    }
    $("#friendtable").append('</tbody>');
}

function backToPie() {
    $("#tableview").hide();
    $("#center").show();
}

function mapBdayToSign(bday) {

   moy = parseInt(bday.substring(0, 2));
   dom = parseInt(bday.substring(3, 5));

   compound = moy * 100 + dom;

   // aries 3/21 - 4/19
   if ( 321 <= compound && compound <= 419 ) return Zodiac.Aries;
   // taurus 4/20 - 5/20
   if ( 420 <= compound && compound <= 520 ) return Zodiac.Taurus;
   // gemini 5/21 - 6/20
   if ( 521 <= compound && compound <= 620 ) return Zodiac.Gemini;
   // cancer 6/21 - 7/22
   if ( 621 <= compound && compound <= 722 ) return Zodiac.Cancer;
   // leo 7/23 - 8/22
   if ( 723 <= compound && compound <= 822 ) return Zodiac.Leo;
   // virgo 8/23 - 9/22
   if ( 823 <= compound && compound <= 922 ) return Zodiac.Virgo;
   // libra 9/23 - 10/22
   if ( 923 <= compound && compound <= 1022 ) return Zodiac.Libra;
   // scorpio 10/23 - 11/21
   if ( 1023 <= compound && compound <= 1121 ) return Zodiac.Scorpio;
   // sagittarius 11/22 - 12/21
   if ( 1122 <= compound && compound <= 1221 ) return Zodiac.Sagittarius;
   // capricorn 12/22 - 1/19 -- special case for ||
   if ( 1222 <= compound || compound <= 119 ) return Zodiac.Capricorn;
   // aquarius 1/20 - 2/18
   if ( 120 <= compound && compound <= 218 ) return Zodiac.Aquarius;
   // pisces 2/19 - 3/20
   if ( 219 <= compound && compound <= 320 ) return Zodiac.Pisces;

   return undefined;
}

function getUserBirthday() {
   FB.api('/' + uid + '?fields=birthday', function(response) {

       if ( typeof response.error !== 'undefined' ) {
           console.log('getUserBirthday: ' + JSON.stringify(response));
           transition( States.RetryUserBday );
           return;
       }

       userBirthday = bday = response.birthday;

       if ( typeof bday === 'undefined' ) {
           console.log('no user bday?! ' + JSON.stringify(response));

           transition( States.RetryUserBday );
           return;
        }

       userSign = mapBdayToSign(bday);

       transition( States.HaveUserBday );
   });
}

function retryUserBday() {
    if ( retryCount-- == 0 ) {
        console.log('Epic fail retrying to get user birthday');
        return;
    }

   setTimeout( getUserBday, 250) ;
}

function haveUserBday() {
   retryCount = MAX_RETRIES;

   getFriendsBdays();
}

// takes [ friend ]
// returns { 'histogram' : [signs][ sign, friendCount ], 'maxFriendsPerSign' : int, 'totalFriendCount' : int }
function makeZodiac(friends) {
    currentFriendView = friends;
    var histogram = new Array();
    var maxFriendsPerSign = 0;
    var totalFriendCount = 0;

    for ( friendIdx in friends ) {
        var sign = friends[friendIdx].sign;
        var perSign = histogram[sign.value];

        if ( typeof perSign === 'undefined' ) {
            perSign = histogram[sign.value] = { sign: sign, friendCount: 0 };
        }

        perSign.friendCount++;

        totalFriendCount++;
        maxFriendsPerSign = Math.max(maxFriendsPerSign, perSign.friendCount);
    }

    return { histogram: histogram, maxFriendsPerSign: maxFriendsPerSign, totalFriendCount: totalFriendCount };
}

function getFriendsBdays() {
   FB.api('/' + uid + '/friends?fields=birthday,name,picture,gender', function(response) {

       if ( typeof response.error !== 'undefined' ) {
           console.log('getUserBirthday: ' + JSON.stringify(response));
           transition( States.RetryUserBday );
           return;
       }

       bdays = response.data;

       if ( typeof bdays === 'undefined' || bdays === null ) {
           console.log('no bdays?! ' + JSON.stringify(response));
           transition( States.RetryFriendsBdays );
           return;
       }

       for ( bdayItem in bdays ) {
           bday = bdays[bdayItem].birthday;

           if ( typeof bday === 'undefined' ) continue;

           sign = mapBdayToSign(bday);

           if ( typeof sign === 'undefined' ) continue;

           var uid      = bdays[bdayItem].id;
           var picture  = bdays[bdayItem].picture.data['url'];
           var gender   = bdays[bdayItem].gender;
           var name     = bdays[bdayItem].name;

           var friend = {   'name'      : name, 
                            'uid'       : uid, 
                            'birthday'  : bday,
                            'picture'   : picture, 
                            'gender'    : gender, 
                            'sign'      : sign  };

           friendList.push(friend);

           var bySign = friendsBySign[ sign.value ];

           if ( typeof bySign === 'undefined' ) {
                bySign = new Array();
                friendsBySign[ sign.value ] = bySign;
           }


           bySign.push( friend );
       }

       transition( States.HaveFriendsBdays );
   });

}

function retryFriendsBdays() {
   if ( retryCount-- == 0 ) {
       console.log('Epic fail trying to get friends birthday');
       return;
   }

   setTimeout( getFriendsBdays, 250 );
}

function haveFriendsBdays() {
    retryCount = MAX_RETRIES;

    $("#loading").hide();
    drawUserSign();

    // unfiltered view first
    drawZodiac( makeZodiac(friendList) );

    storeStats();

    transition( States.Done );
}

function storeStats() {
    json = { 'uid' :  uid, 'birthday': userBirthday, 'friends' : friendList };
    jsonPayload = JSON.stringify(json);

    //console.log("jsonPayload: " + jsonPayload);

    $.ajax( {
            url: '/add',
            type: 'POST',
            data: jsonPayload,
    });
}

function ensurePerms() {
  FB.api('/me', function(response) {
      uid = response.id;
      FB.api('/' + uid + '/permissions', function(response) {
          if ( typeof response.error !== 'undefined' ) {
             console.log('ensurePerms error: ' + JSON.stringify(response));
             transition( States.RetryPerms );
             return;
          }

          userBday = response.data[0].user_birthday;
          friendsBday = response.data[0].friends_birthday;

          if ( typeof userBday === 'undefined'|| typeof friendsBday === 'undefined' )
          {

            transition( States.AskForPerms );

            return;
          }

          retryCount = MAX_RETRIES;

          transition( States.Connected );
      });
  });
}

function retryPerms() {
   if ( retryCount-- == 0 ) {
       console.log('Epic fail trying to get permissions');
       return;
   }

    setTimeout( ensurePerms, 250 );
}

function generateZodiacDivs() {

    for (var sign in Zodiac) {
        var div = document.createElement("div");

        div.id              = Zodiac[sign].name;
        div.style.display   = "none";
        
        var img = document.createElement("img");
        img.src = "images/" + Zodiac[sign].name + ".png";
        img.id  = Zodiac[sign].name + "_image";

        div.appendChild(img);

        document.body.appendChild(div);
    }
    
}

function askForPerms() {
    $("#redoLogin").show();
}

function switchToGuys() {
    drawZodiac( makeZodiac( guysFilter() ) );
}

function switchToGals() {
    drawZodiac( makeZodiac( galsFilter() ) );
}

function switchToBi() {
    drawZodiac( makeZodiac( noFilter() ) );
}

function transition( newState ) {
    state = newState;
    setTimeout( evalState, 1 );
}

function evalState() {
    switch ( state )
    {
        case States.Begin:
            init();

            break;

        case States.WaitForLogin:
            break;

        case States.ConnectedNoPerms:
            ensurePerms();

            break;

        case States.RetryPerms:
            retryPerms();

            break;

        case States.AskForPerms:
            askForPerms();

            break;

        case States.NotAuthorized:
            askForPerms();

            break;

        case States.NotConnected:
            askForPerms();

            break;

        case States.Connected:
            onConnected();

            break;

        case States.RetryUserBday:
            retryUserBday();

            break;

        case States.RetryFriendsBday:
            retryFriendsBday();

            break;

        case States.HaveUserBday:
            haveUserBday();

            break;

        case States.HaveFriendsBdays:
            haveFriendsBdays();

            break;

        case States.Done:
            break;

        default:
            console.log("Unknown state: " + state);
            break;
    }
}
