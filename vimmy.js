(function() {
  'use strict';

  var Vimmy = {
    'characters': 'asdfejklio'.toUpperCase().split(''), // characters used for link hints
    'scrollDistance': 150,  // pixel distance for hjkl scrolling
    'scrollDelay': 100, // time to animate scrolling
    'mode': 'command',  // start in command mode, other mode is 'hint'
    'scrollLock': false, // keep track of scrolling, don't allow mashing/holding

    'isBlacklisted': false,
    'hostBlacklist': [ 'facebook.com', 'twitter.com', 'www.tumblr.com', 'getprismatic.com',
      'app.asana.com' ],

    'hintTemplate': function( hint ) {

      return '<span><b>' +  hint.split('').join('</b><b>') + '</b></span>';
    },

    'hintLookup': {}, // all the hints that we've stored, by hint
    'typedCharacters': [], // a place to save the characters a user's typed out for link hints

    'previousKeyName': undefined,  // keep track of the previous keyPress for combos like gg
    'keyLookup': {
      9: 'tab', 17: 'ctrl', 16: 'shift',
      18: 'alt', 27: 'esc', 8: 'backspace',

      65: 'a', 66: 'b', 67: 'c', 68: 'd', 69: 'e',
      70: 'f', 71: 'g', 72: 'h', 73: 'i', 74: 'j',
      75: 'k', 76: 'l', 77: 'm', 78: 'n', 79: 'o',
      80: 'p', 81: 'q', 82: 'r', 83: 's', 84: 't',
      85: 'u', 86: 'v', 87: 'w', 88: 'x', 89: 'y',
      90: 'z',

      219: '[', 191: '/'

    },

    'scroll': function( x, y, relative ) {
      // Scroll to a position with a quick jQuery animation
      if ( Vimmy.scrollLock ) return;

      Vimmy.scrollLock = true;

      var modifier = ( relative ) ? '+=' : '',
        animateScroll = function( props ) {
          $( 'body' ).animate( props, Vimmy.scrollDelay, function() {
            Vimmy.scrollLock = false; // clear the lock on animation end
          });
        };

      // animate the transition
      if ( y !== null ) {
        animateScroll({ 'scrollTop': modifier + y + 'px' });
      }

      if ( x !== null ) {
        animateScroll({ 'scrollLeft': modifier + x + 'px' });
      }

    },

    'followLink': function( $link ) {

      var href = $link.attr( 'href' ),
        destination;

      if ( $link.attr( 'target' ) === '_blank' ) {
        destination =  'new';
      } else {
        destination = 'same' ;
      }

      // Clean up the href
      if ( href.substring( 0, 4 ) !== 'http' ) { // i.e. it's a relative link
        if ( href.substring( 0, 1) === '/' ) { // i.e. it's to the root
          href = window.location.origin + href;
        } else { // i.e. it's from the same folder
          href = window.location.href.match(/.+\//) + href;
        }
      }

      // Follow the white rabbit with a slight UI delay
      setTimeout( function() {
        if ( destination === 'same' ) {
          window.location.href = href;
        } else if ( destination === 'new' ) {
          safari.self.tab.dispatchMessage( 'newtab', href );
        }

        Vimmy.typedCharacters = [];
        $( '#vimmyHints span' ).show();
      }, 100 );

      return true;
    },

    'activateIframe': function( $elem ) {

      // Unfortunately, YouTube and Vimeo don't use the same kinds of parameters :(
      // note that I want to catch when the _hostname_ is youtube/vimeo, just in case but I don't really know
      // how to do it nicely
      if ( $elem.attr( 'src' ).indexOf( 'youtube' ) > 0 ) {
        $elem.attr( 'src', $elem.attr( 'src' ).replace( /&autoplay=[10]/, '' ) + '&autoplay=1' );
      } else if ( $elem.attr( 'src' ).indexOf( 'vimeo' ) > 0 ) {
        $elem.attr( 'src', $elem.attr( 'src' ).replace( /&autoplay=(false|true)/, '' ) + '?autoplay=true' );
      }

    },

    'processKey': function( event ) {
      // Takes a keypress event and returns a nice, clean keyName

      var keyCode = event.keyCode,
        keyName = '',
        modifier = '';

      // Listen for modifiers, makes things a bit easier
      // There are a lot of extras here, but I'm leaving them in case I need some more
      if ( event.metaKey ) {
        modifier += 'cmd-';
      }
      if ( event.ctrlKey ) {
        modifier += 'ctrl-';
      }
      if ( event.altKey ) {
        modifier += 'alt-';
      }
      if ( event.shiftKey ) {
        modifier += 'shift-';
      }

      // If the key is a number, assign its name quickly, otherwise do a lookup
      if ( keyCode >= 48 && keyCode <= 57 ) {
        keyName = ( keyCode - 48 ).toString();
      } else {
        keyName = Vimmy.keyLookup[ keyCode ];
      }

      // Don't double up on the modifiers, store only if it's a meaningful keypress
      if ( $.inArray( keyCode, [16, 17, 18, 91] ) < 0 ) {
        keyName = modifier + keyName;
      }

      return keyName;
    },

    'showHints': function( ) {
      // Display all the nice little key hints!
      var links = $( 'a:in-viewport:visible, iframe[src*=youtube]:in-viewport, iframe[src*=vimeo]:in-viewport' ),
        linkCount = links.length,
        charCount = Vimmy.characters.length,
        hintLength = Math.ceil( Math.log( linkCount ) / Math.log( charCount ) ),
        hints = [],
        i, j, c, hint, $hint, $link, linkOffset;

      if ( linkCount > 0 && hintLength === 0 ) {
        // Math, bro - log(1) === 0 :(
        hintLength = 1;
      }

      // Create the hint text snippets AAA, AAB, ACD, etc
      $( 'body' ).append( $( '<div id="vimmyHints"></div>' ) );
      for ( i = 0; i < linkCount; i++ ) {
        // for every link
        hint = '';
        $link = $( links[ i ] );

        for ( j = 1; j <= hintLength; j++ ) {
          // for every character that we need to get until we have a long enough hint
          c = Math.floor( i /  Math.pow( charCount, hintLength - j ) ) % charCount;
          hint += Vimmy.characters[ c ];
        }

        $hint = $( Vimmy.hintTemplate( hint ) );

        // position the hint nicely
        linkOffset = $link.offset();
        linkOffset.left -= ( 23 + hintLength * 5 );
        linkOffset.top += ( -9 + ( $link.height() / 2 ) );
        $hint.offset( linkOffset );

        hints.push( $hint );
        Vimmy.hintLookup[ hint ] = { '$hint': $hint, '$link': $link };

      }

      $( '#vimmyHints' ).append( hints ); // append everything in one shot

    },

    'hideHints': function() {
      $( '#vimmyHints' ).remove(); // since they're generated for only chunks of pages, it's easier
                                   // to just remove them completely
    },

    'checkHint': function() {
      // Process the hint. If it's incomplete, highlight what's the good news, if it's complete
      // trigger the link

      $( '#vimmyHints b' ).removeClass( 'typed' );
      $( '#vimmyHints span' ).show();

      var sequence = Vimmy.typedCharacters.join('').toUpperCase(),
        hint, $hint, $link;

      for ( hint in Vimmy.hintLookup ) {
        if ( Vimmy.hintLookup.hasOwnProperty( hint ) ) {
          $link = Vimmy.hintLookup[ hint ].$link; // i.e. the hint properties, $link and $hint
          $hint = Vimmy.hintLookup[ hint ].$hint; // i.e. the hint properties, $link and $hint

          // Highlight the hint, hide all irrelevant ones
          if ( hint.substring(0, sequence.length) === sequence) {
            $hint.children().slice(0, sequence.length ).addClass( 'typed' );
          } else {
            $hint.hide();
          }

          if ( hint === sequence ) {
            if ( $link.prop( 'tagName' ) === 'A' ) {
              Vimmy.followLink( $link );
            } else if ( $link.prop( 'tagName' ) === 'IFRAME' ) {
              Vimmy.activateIframe( $link );
            }

            Vimmy.typedCharacters = [];
            $( '#vimmyHints span' ).show();
            break;

          }
        }
      }

    },

    'keyHandler': function( event ) {

      // If user is inside an input, ignore all actions
      if ( $.inArray( document.activeElement.tagName.toUpperCase(), ['INPUT', 'TEXTAREA'] ) > -1 ) {
        return;
      }

      // If it's a box with contenteditable (basically an input), ignore actions
      if ( $( document.activeElement ).attr( 'contenteditable' ) === 'true' ) {
        return;
      }


      var keyCode = event.keyCode,
        keyName = Vimmy.processKey( event );

      if ( Vimmy.mode === 'command' ) {
        // The simple case, just listen for keybindings

        if ( keyName === 'f' ) {
          Vimmy.mode = 'hint'; // enter hint mode for new tab opening
          Vimmy.showHints();
        }

        // Basic hjkl scrolling (not enabled on all sites!)
        if ( !Vimmy.isBlacklisted ) {
          if ( keyName === 'j' ) {
            Vimmy.scroll( null, Vimmy.scrollDistance, true );
          } else if ( keyName === 'k' ) {
            Vimmy.scroll( null, -Vimmy.scrollDistance, true );
          } else if ( keyName === 'h' ) {
            Vimmy.scroll( -Vimmy.scrollDistance, null, true );
          } else if ( keyName === 'l' ) {
            Vimmy.scroll( Vimmy.scrollDistance, null, true );
          }
        }

        // gg, G
        if ( keyName === 'g' && Vimmy.previousKeyName === 'g' ) {
          Vimmy.scroll( null, 0 );
        }
        if ( keyName === 'shift-g' ) {
          Vimmy.scroll( null, $( document ).height() );
        }

      } else { // Vimmy.mode === 'hint'
        // We're typing in links right now and such

        // Cut out of hint mode with escape of ctrl+[
        if ( keyName === 'esc' || keyName === 'ctrl-[' ) {
          Vimmy.mode = 'command';
          Vimmy.typedCharacters = [];
          Vimmy.hideHints();
          return;  // We don't need to do anything else here
        }

        // Backspace - remove last typed character
        if ( keyName === 'backspace' ) {
          Vimmy.typedCharacters.pop();
          Vimmy.checkHint();
          return;
        }

        // All's okay, nothing crazy, process the input to see if we're ready
        if ( keyName && $.inArray( keyName.toUpperCase(), Vimmy.characters ) > -1 ) {
          // Only listen to characters that compose the hints
          Vimmy.typedCharacters.push( keyName );
          Vimmy.checkHint();
        }
      }

      // Don't save the previousKey if it's a modifier
      if ( Vimmy.mode === 'command' && $.inArray( keyCode, [16, 17, 18, 91] ) === -1 ) {
        Vimmy.previousKeyName = keyName;
      }

    }
  };

  // Add the global key press listener
  // Do not bind (or do anything) to iframes! This caused a ton of issued related to Facebook "like"
  // buttons and other such embedded objects
  if ( top === self ) {
    $( window ).bind( 'keydown', Vimmy.keyHandler );

    // Add browser events listener (come from the extension HTML page)
    // Check the blacklist
    $.each( Vimmy.hostBlacklist, function( i, blockedHost ) {
      if ( window.location.host.substring( 0, blockedHost.length ) === blockedHost ) {
        Vimmy.isBlacklisted = true;
      }
    });

  }

})();
