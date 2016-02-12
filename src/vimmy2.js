( function() {
  'use strict';

  var
    $window = $( window ),
    $body = $( 'body' );

  var
    // TODO: These should be settings
    CHARACTERS = 'asdfejklio'.toUpperCase().split( '' ),
    SCROLL_DISTANCE = 450,  // px
    SCROLL_DURATION = 100;  // ms

  var GREEDY_INPUT_TYPES = [ 'text', 'password', 'phone', 'email' ];

  var KEYCODE_LOOKUP = {
    9: 'tab', 17: 'ctrl', 16: 'shift',
    18: 'alt', 27: 'esc', 8: 'backspace',

    65: 'a', 66: 'b', 67: 'c', 68: 'd', 69: 'e',
    70: 'f', 71: 'g', 72: 'h', 73: 'i', 74: 'j',
    75: 'k', 76: 'l', 77: 'm', 78: 'n', 79: 'o',
    80: 'p', 81: 'q', 82: 'r', 83: 's', 84: 't',
    85: 'u', 86: 'v', 87: 'w', 88: 'x', 89: 'y',
    90: 'z',

    219: '[', 191: '/'
  };

  // TODO: Benchmark and improve hint creation time

  // TODO: This should be a setting
  var HJKL_BLACKLIST = [
    'www.facebook.com',
    'facebook.com',
    'www.twitter.com',
    'twitter.com',
  ];

  var MODIFIER_KEYCODES = [ 16, 17, 18, 91 ];

  var
    MODE = 'command',
    FORCE_NEW_TAB = false,

    SCROLL_IS_LOCKED = false,
    HJKL_ENABLED = true,

    HINTS = [],

    PREVIOUS_KEY = null,
    TYPED_HINT_CHARACTERS = [];


  // // // // //

  function boot() {

    if ( amAnIframe() ) return;

    HJKL_ENABLED = !HJKL_BLACKLIST.contains( window.location.host );

    $window.on( 'keydown', vimmyKeyDownHandler );
    $body.append( '<div id="vimmy-hints"></div>' );

  }


  function amAnIframe() {
    return top !== self;
  }


  function vimmyKeyDownHandler( event ) {

    if ( elementCapturesKeys( document.activeElement ) ) return;


    var
      key = getKeyNameFromEvent( event ),
      $elements;

    if ( MODE === 'command' ) {

      if ( key.isIn([ 'f', 'shift-f' ]) ) {
        FORCE_NEW_TAB = ( key === 'shift-f' );

        $elements = getVisibleElements();
        if ( $elements.length === 0 ) return;

        MODE = 'elements';

        HINTS = createHintsForElements( $elements );
        showHints();

        return;
      }

      if ( [ 'h', 'j', 'k', 'l' ].contains( key ) && HJKL_ENABLED ) {

        if ( key === 'h' ) scrollBy( -SCROLL_DISTANCE, 0 );
        if ( key === 'j' ) scrollBy( 0, SCROLL_DISTANCE );
        if ( key === 'k' ) scrollBy( 0, -SCROLL_DISTANCE );
        if ( key === 'l' ) scrollBy( SCROLL_DISTANCE, 0 );

        return;
      }

      if ( key === 'g' && PREVIOUS_KEY === 'g' ) scrollTo( null, 0 );
      if ( key === 'shift-g' ) scrollTo( null, document.height );

    } else if ( MODE === 'elements' ) {

      if ( [ 'esc', 'ctrl+[' ].contains( key ) ) {
        MODE = 'command';
        hideHints();

        return;
      }

      if ( key === 'backspace' ) {
        TYPED_HINT_CHARACTERS.pop();
        filterHints( TYPED_HINT_CHARACTERS );

        return;
      }

      if ( key.toUpperCase().isIn( CHARACTERS ) ) {
        TYPED_HINT_CHARACTERS.push( key );
        filterHints( TYPED_HINT_CHARACTERS );
      }

    }

    PREVIOUS_KEY = key;
  }


  function elementCapturesKeys( element ) {

    var
      tag = element.tagName,
      type = element.getAttribute( 'type' );

    if ( tag === 'TEXTAREA' ) return true;
    if ( tag === 'INPUT' && type.isIn( GREEDY_INPUT_TYPES ) ) return true;
    if ( element.contentEditable === 'true' ) return true;


    return false;
  }


  function getKeyNameFromEvent( event ) {

    var
      keyName,
      modifier = '';

    if ( event.metaKey ) modifier += 'cmd-';
    if ( event.ctrlKey ) modifier += 'ctrl-';
    if ( event.altKey ) modifier +=  'alt-';
    if ( event.shiftKey ) modifier += 'shift-';

    if ( event.keyCode >= 48 && event.keyCode <= 57 ) {
      keyName = ( event.keyCode - 48 ).toString();
    } else {
      keyName = KEYCODE_LOOKUP[ event.keyCode ];
    }

    if ( MODIFIER_KEYCODES.contains( event.keyCode ) ) return keyName;
    return modifier + keyName;
  }


  function getVisibleElements() {

    return Array.prototype.slice.call( document.querySelectorAll( 'a' ) )
      .filter( inViewPort )
      .filter( isVisible );

  }


  function inViewPort( element ) {

    var bounds = element.getBoundingClientRect()

    return ( bounds.left >= 0 && bounds.top >= 0 && bounds.bottom <= window.innerHeight && bounds.right <= window.innerWidth );

  }


  function isVisible( element ) {
    // TODO: Check performance issues
    return $( element ).is( ':visible' );
  }


  function createHintsForElements( $elements ) {

    var
      requiredHintLength = Math.floor( Math.log( $elements.length ) / Math.log( CHARACTERS.length ) ) + 1, // TODO: Abstract out
      j = 0, i = 0,
      text;

    return $elements.map( function( $element ) {

      text = '';
      for ( j = 1; j <= requiredHintLength; j++ ) {
        text += CHARACTERS[ Math.floor( i /  Math.pow( CHARACTERS.length, requiredHintLength - j ) ) % CHARACTERS.length ]; // TODO: Abstract out
      }

      i += 1;

      return {
        text: text,
        $hint: makeHintHTML( $element, text ),
        $element: $element,
      };

    });

  }


  function makeHintHTML( $element, text ) {

    var
      // TODO: We already calculated bounds, we need to re-use them if possible!
      bounds = $element.getBoundingClientRect(),
      attachment = ( bounds.left > 40 ) ? 'left' : 'right';

    var
      left,
      top;

    if ( attachment === 'left' ) {
      left = ( bounds.left - ( ( text.length * 8 ) + 15 ) ) + window.scrollX,
      top = ( bounds.top + bounds.bottom ) / 2 - 8 + window.scrollY;
    } else {
      left = ( bounds.right ) + 8 + window.scrollX,
      top = ( bounds.top + bounds.bottom ) / 2 - 8 + window.scrollY;
    };

    return $( '<span class="' + attachment + '" style="left: ' + left + 'px; top: ' + top + 'px;">' +
      '<b>' +  text.split('').join('</b><b>') +
      '</b></span>' );

  }


  function hideHints() {

    TYPED_HINT_CHARACTERS = [];

    $( '#vimmy-hints' )
      .html( '' );

  }


  function showHints() {

    var $hints = HINTS.map( function( hint ) {
      return hint.$hint;
    });

    $( '#vimmy-hints' )
      .append( $hints )

  }


  function filterHints( characters ) {

    var
      prefix = characters.join( '' ).toUpperCase(),
      activeHints = [];

    HINTS.forEach( function checkHint( hint ) {

      if ( hint.text.startsWith( prefix ) ) {
        // This hint is valid!
        activeHints.push( hint );
        hint.$hint.children()
          .removeClass( 'typed' )
          .slice( 0, prefix.length )
          .addClass( 'typed' );

        hint.$hint.removeClass( 'ineligible' );
      } else {
        hint.$hint.addClass( 'ineligible')
      }

    });

    if ( activeHints.length === 1 ) activateElement( activeHints[ 0 ].$element );
  }


  function activateElement( $element ) {

    if ( $element.tagName === 'A' ) window.setTimeout( function() {
      activateAnchor( $element );
    });

    window.setTimeout( function() {

      hideHints();
      MODE = 'command';
    }, 250 );

  }


  function activateAnchor( $anchor ) {

    var
      url = makeAbsoluteUrl( $anchor.getAttribute( 'href' ) ),
      openNewTab = $anchor.getAttribute( 'target' ) === '_blank' || FORCE_NEW_TAB;

    if ( openNewTab ) {
      safari.self.tab.dispatchMessage( 'newtab', url )
    } else {
      window.location.href = url
    }

  }


  function makeAbsoluteUrl( url ) {

    if ( url.startsWith( '#' ) ) {
      return window.location.href + url;
      hideHints();
    }

    if ( !url.startsWith( 'http' ) ) {

      if ( url.startsWith( '//' ) ) {
        url = window.location.protocol + url;
      } else if ( url.startsWith( '/' ) ) {
        url = window.location.origin + url;
      } else {
        url = window.location.url.match(/.+\//) + url;
      }

    }

    return url;
  }


  function scrollBy( x, y ) {
    scroll( '+=' + ( x || 0 ) , '+=' + ( y || 0 ) );
  }


  function scrollTo( x, y ) {
    scroll( x, y );
  }


  function scroll( left, top ) {

    if ( SCROLL_IS_LOCKED ) return;
    SCROLL_IS_LOCKED = true;

    var animationProperties = {};

    if ( top !== null ) animationProperties.scrollTop = top + 'px';
    if ( left !== null ) animationProperties.scrollLeft = left + 'px';

    $body.animate( animationProperties, SCROLL_DURATION, unlockScroll );

  }


  function unlockScroll() {
    SCROLL_IS_LOCKED = false;
  }

  // // // // //

  boot();

})();
