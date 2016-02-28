( function() {
  'use strict';

  var
    $window = $( window ),
    $body = $( 'body' );

  var
    // TODO: These should be settings
    CHARACTERS = 'asdfewjklio'.toUpperCase().split( '' ),
    SCROLL_DISTANCE = 450,  // px
    SCROLL_DURATION = 100;  // ms

  var GREEDY_INPUT_TYPES = [ 'text', 'password', 'phone', 'email' ];

  var
    TARGETABLE_ELEMENTS = [ 'a', 'button', 'input', 'select' ],
    TARGETABLE_ELEMENT_SELECTOR = TARGETABLE_ELEMENTS.join( ', ' );

  var KEYCODE_LOOKUP = {
    9: 'tab', 17: 'ctrl', 16: 'shift',
    18: 'alt', 27: 'esc', 8: 'delete',
    91: 'cmd', 93: 'cmd', 13: 'return',

    65: 'a', 66: 'b', 67: 'c', 68: 'd', 69: 'e',
    70: 'f', 71: 'g', 72: 'h', 73: 'i', 74: 'j',
    75: 'k', 76: 'l', 77: 'm', 78: 'n', 79: 'o',
    80: 'p', 81: 'q', 82: 'r', 83: 's', 84: 't',
    85: 'u', 86: 'v', 87: 'w', 88: 'x', 89: 'y',
    90: 'z',

    219: '[', 191: '/'
  };

  // TODO: Benchmark and improve hint creation time

  var MODIFIER_KEYCODES = [ 16, 17, 18, 91, 93 ];

  var
    MODE = 'command',
    FORCE_NEW_TAB = false,

    SCROLL_IS_LOCKED = false,

    HINTS = [],

    PREVIOUS_KEY = null,
    TYPED_HINT_CHARACTERS = [];


  // // // // //

  function boot() {

    if ( amAnIframe() ) return;

    window.addEventListener( 'keydown', vimmyKeyDownHandler, true )
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
        swallowEvent( event );

        FORCE_NEW_TAB = ( key === 'shift-f' );

        $elements = getVisibleElements();
        if ( $elements.length === 0 ) return;

        MODE = 'elements';

        HINTS = createHintsForElements( $elements );
        showHints();

        return;
      }

      if ( [ 'h', 'j', 'k', 'l' ].contains( key ) ) {
        swallowEvent( event );

        if ( key === 'h' ) scrollBy( -SCROLL_DISTANCE, 0 );
        if ( key === 'j' ) scrollBy( 0, SCROLL_DISTANCE );
        if ( key === 'k' ) scrollBy( 0, -SCROLL_DISTANCE );
        if ( key === 'l' ) scrollBy( SCROLL_DISTANCE, 0 );

        return;
      }

      if ( key === 'g' && PREVIOUS_KEY === 'g' ) scrollTo( null, 0 );
      if ( key === 'shift-g' ) scrollTo( null, document.height );

    } else if ( MODE === 'elements' ) {
      swallowEvent( event );

      if ( [ 'esc', 'ctrl+[' ].contains( key ) ) {
        MODE = 'command';
        hideHints();

        return;
      }

      if ( key === 'delete' ) {
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


  function swallowEvent( event ) {

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
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

    return Array.prototype.slice
      .call( document.querySelectorAll( TARGETABLE_ELEMENT_SELECTOR ) )
      .filter( inViewPort )
      .filter( isVisible );

  }


  function inViewPort( element ) {

    var bounds = element.getBoundingClientRect()

    return ( bounds.left >= 0 && bounds.top >= 0 && bounds.bottom <= window.innerHeight && bounds.right <= window.innerWidth );

  }


  function isVisible( element ) {
    // TODO: Check performance issues
    if ( element.offsetWidth === 0 && element.offsetHeight === 0 ) return false;
    if ( element.getClientRects().length === 0 ) return false;

    var style = window.getComputedStyle( element );

    if ( style.visibility === 'hidden' ) return false;
    if ( style.opacity === '0' ) return false;

    return true;
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

      text = text.reverse(); // A usability feature, ensure that adjacent hints start with different letters

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
      activeHints = [],
      activeHint;

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

    if ( activeHints.length > 1 ) return;
    activeHint = activeHints[ 0 ];

    if ( activeHint.text === prefix ) activateElement( activeHint.$element );
  }


  function activateElement( $element ) {

    var activator;

    if ( isLinkLike( $element ) ) {
      activator = activateAnchor;
    } else if ( isButtonLike( $element ) ) {
      activator = clickElement;
    } else {
      activator = focusElement;
    }


    window.setTimeout( function() {
      activator( $element );
    }, 50 );


    window.setTimeout( function() {

      hideHints();
      MODE = 'command';
    }, 150 );

  }


  function isLinkLike( $element ) {
    return $element.tagName === 'A';
  }


  function isButtonLike( $element ) {
    if ( $element.tagName === 'BUTTON' ) return true;
    if ( $element.getAttribute( 'type' ) === 'button' ) return true;

    return false
  }


  function focusElement( $element ) {

    $element.focus();
  }


  function activateAnchor( $anchor ) {
    // NOTE: Triggering .click() on these tends to flat-out not work

    var
      href = $anchor.getAttribute( 'href' ),
      target = $anchor.getAttribute( 'target' ),
      url = makeAbsoluteUrl( href );

    console.log( 'Activating anchor', $anchor );
    console.log( 'Anchor has target', $anchor.getAttribute( 'target' ) );

    if ( FORCE_NEW_TAB ) {
      console.log( 'Demanded new tab, requesting', url );
      // safari.self.tab.dispatchMessage( 'newtab', url );
      clickElement( $anchor );
    } else if ( target === '_blank' ) {
      console.log( 'Target is blank, requesting tab', url );
      // safari.self.tab.dispatchMessage( 'newtab', url );
      clickElement( $anchor );
    } else {
      // window.location.href = url;
      console.log( 'Triggering click' );
      clickElement( $anchor );
      // $anchor.click();
    }

  }


  function clickElement( $element ) {

    $element.click();
  }


  function makeAbsoluteUrl( url ) {

    if ( url.startsWith( '#' ) ) {
      return window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search + url;
    }

    if ( !url.startsWith( 'http' ) ) {

      if ( url.startsWith( '//' ) ) {
        url = window.location.protocol + url;
      } else if ( url.startsWith( '/' ) ) {
        url = window.location.origin + url;
      } else {
        url = window.location.href.match(/.+\//) + url;
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

    $body.animate( animationProperties, SCROLL_DURATION, function() {
      SCROLL_IS_LOCKED = false;
    });

  }

  // // // // //

  boot();

})();
