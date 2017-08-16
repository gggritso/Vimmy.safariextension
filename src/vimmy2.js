( function() {
  'use strict';

  var
    $window = $( window ),
    $body = $( 'body' );

  var
    // TODO: These should be settings
    CHARACTERS = 'asdfewjklio'.toUpperCase().split( '' ),
    BUMP_DISTANCE = 100, // px
    SCROLL_DURATION = 100;  // ms

  var GREEDY_INPUT_TYPES = [
    'text',
    'password',
    'phone',
    'email',
    'search',
    'url',
    'tel',
    'number',
  ];

  var
    TARGETABLE_ELEMENTS = [ 'a', 'button', 'input', 'select' ],
    TARGETABLE_ELEMENT_SELECTOR = TARGETABLE_ELEMENTS.join( ', ' );

  var
    URL_IS_BLACKLISTED = false;

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
    FORCE_NEW_TAB_EXCEPTION = false,
    ROTATE_HINTS = true,

    SCROLL_IS_LOCKED = false,

    HINTS = [],

    PREVIOUS_KEY = null,
    MULTIPLIER = 0,
    TYPED_HINT_CHARACTERS = [];


  // // // // //

  function boot() {

    if ( amAnIframe() ) return;

    window.addEventListener( 'keydown', vimmyKeyDownHandler, true )
    $body.append( '<div id="vimmy-hints"></div>' );

    safari.self.addEventListener( 'message', function handleMessage( event ) {
      if ( event.name === 'settings' ) {
        checkBlackListStatus( event.message.blackListedURLs );
        setHintRotation( event.message.rotateHints );
        setContrastMode( event.message.highContrastMode );
        if ( event.message.hintCharacters ) setHintCharacters( event.message.hintCharacters );
      }
    });

    safari.self.tab.dispatchMessage( 'ready' );
  }


  function amAnIframe() {
    return top !== self;
  }


  function checkBlackListStatus( blackListedURLs ) {

    URL_IS_BLACKLISTED = false;

    if ( !blackListedURLs ) return;

    blackListedURLs = blackListedURLs.split( ',' );

    var
      i, expression;

    for ( i = 0; i < blackListedURLs.length; i += 1 ) {
      expression = new RegExp( blackListedURLs[ i ].trim() );
      if ( expression.test( window.location.href ) ) URL_IS_BLACKLISTED = true;
    }

  }


  function setHintRotation( shouldRotateHints ) {
    ROTATE_HINTS = shouldRotateHints;
  }


  function setContrastMode( highContrastMode ) {
    $( '#vimmy-hints' ).toggleClass( 'high-contrast', highContrastMode );
  }

  function setHintCharacters( characters ) {
    CHARACTERS = $.unique( characters.toUpperCase().split( '' ) );
  }

  function vimmyKeyDownHandler( event ) {

    if ( URL_IS_BLACKLISTED ) return;

    var
      key = getKeyNameFromEvent( event ),
      $elements;

    if ( elementCapturesKeys( document.activeElement ) ) {
      if ( key === 'esc' ) {
        event.target.blur();
      } else {
        return;
      }
    }

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

        var distance = BUMP_DISTANCE;
        if ( MULTIPLIER !== 0 ) distance *= MULTIPLIER;
        MULTIPLIER = 0;

        if ( key === 'h' ) scrollBy( -distance, 0 );
        if ( key === 'j' ) scrollBy( 0, distance );
        if ( key === 'k' ) scrollBy( 0, -distance );
        if ( key === 'l' ) scrollBy( distance, 0 );

        return;
      }

      if ( key === 'ctrl-u' ) {
        swallowEvent( event );

        scrollBy( 0, -( window.innerHeight / 2 ) );
      }

      if ( key === 'ctrl-d' ) {
        swallowEvent( event );

        scrollBy( 0, ( window.innerHeight ) / 2 );
      }

      if ( key === 'ctrl-b' ) {
        swallowEvent( event );

        scrollBy( 0, -window.innerHeight );
      }

      if ( key === 'ctrl-f' ) {
        swallowEvent( event );

        scrollBy( 0, window.innerHeight );
      }

      if ( key === 'g' ) {
        swallowEvent( event );
      }

      if ( key === 'x' ) {
        closeTab();
      }

      if ( key === 'r' ) {
        reloadTab();
      }

      if ( key === 'shift-j' ) ( swallowEvent( event ) && goToPreviousTab() );
      if ( key === 'shift-k' ) ( swallowEvent( event ) && goToNextTab() );

      if ( key === 'g' && PREVIOUS_KEY === 'g' ) scrollTo( null, 0 );
      if ( key === 'shift-g' ) scrollTo( null, $( document ).height() );

      if ( key === 'shift-t' && PREVIOUS_KEY === 'g' ) ( swallowEvent( event ) && goToPreviousTab() );
      if ( key === 't' && PREVIOUS_KEY === 'g' ) ( swallowEvent( event ) && goToNextTab() );

      if ( key === 'shift-h' ) goBackHistory();
      if ( key === 'shift-l' ) goForwardHistory();

      if ( key === 't' && PREVIOUS_KEY !== 'g' ) ( swallowEvent( event ) && openNewTab() );

      if ( !isNaN( key ) ) {
        MULTIPLIER = MULTIPLIER * 10 + key;
      } else {
        MULTIPLIER = 0;
      }

      if ( ![ 'cmd', 'esc', 'shift', 'alt', 'tab' ].contains( key ) ) PREVIOUS_KEY = key;

    } else if ( MODE === 'elements' ) {

      if ( [ 'esc', 'ctrl-[' ].contains( key ) ) {
        swallowEvent( event );

        MODE = 'command';
        hideHints();

        return;
      }

      if ( key === 'delete' ) {
        swallowEvent( event );

        if ( TYPED_HINT_CHARACTERS.length === 0 ) {
          MODE = 'command';
          hideHints();

          return;
        }

        TYPED_HINT_CHARACTERS.pop();
        filterHints( TYPED_HINT_CHARACTERS );

        return;
      }

      var letter;

      if ( key.startsWith( 'shift-' ) ) {
        letter = key.slice( 6 ).toUpperCase();
      } else {
        letter = key;
      }

      if ( letter.toUpperCase().isIn( CHARACTERS ) ) {
        swallowEvent( event );

        TYPED_HINT_CHARACTERS.push( letter );
        filterHints( TYPED_HINT_CHARACTERS );
      }

    }

  }


  function swallowEvent( event ) {

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    return true;
  }


  function elementCapturesKeys( element ) {

    var
      tag = element.tagName,
      type = element.getAttribute( 'type' );

    if ( tag === 'TEXTAREA' ) return true;
    if ( tag === 'SELECT' ) return true;
    if ( tag === 'INPUT' && ( !type || type.isIn( GREEDY_INPUT_TYPES ) ) ) return true;
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
      keyName = event.keyCode - 48;
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

    // TODO: Attach based on the top of the element, skip the extra calculations!
    var
      bounds = $element.getClientRects()[ 0 ],
      attachment = ( bounds.left > 40 && bounds.top > 10 ) ? 'left' : 'right',
      rotation = ROTATE_HINTS ? 'rotated' : '';

    var
      left,
      top;

    if ( attachment === 'left' ) {
      left = ( bounds.left - ( ( text.length * 8 ) + 15 ) ),
      top = ( bounds.top + bounds.bottom ) / 2 - 8;
    } else {
      left = ( bounds.right ) + 6,
      top = ( bounds.top + bounds.bottom ) / 2 - 8;
    };

    return $( '<span class="' + attachment + ' ' + rotation + '" style="left: ' + left + 'px; top: ' + top + 'px;">' +
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
      .css({ top: window.scrollY })
      .append( $hints );

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

    if ( characters.slice( -1 )[ 0 ].isCapital() ) FORCE_NEW_TAB_EXCEPTION = true;

    if ( activeHint.text === prefix ) {
      activateElement( activeHint.$element );
      highlightHint( activeHint.$hint );
    }

  }


  function activateElement( $element ) {

    var activator;

    if ( isLinkLike( $element ) ) {
      activator = activateAnchor;
    } else if ( isButtonLike( $element ) ) {
      activator = clickElement;
    } else if ( isRadioLike( $element ) ) {
      activator = clickElement;
    } else {
      activator = focusElement;
    }


    window.setTimeout( function() {
      activator( $element );
    }, 0 );

    if ( FORCE_NEW_TAB || FORCE_NEW_TAB_EXCEPTION ) {
      window.setTimeout( function() {

        TYPED_HINT_CHARACTERS = [];
        filterHints( TYPED_HINT_CHARACTERS );
      }, 150 );
    } else {
      window.setTimeout( function() {

        hideHints();
        MODE = 'command';
      }, 150 );
    }

  }

  function highlightHint( $hint ) {

    $hint
      .addClass( 'accepted' )
      .find( 'b' )
      .removeClass( 'typed' );

  }


  function isLinkLike( $element ) {
    return $element.tagName === 'A';
  }


  function isButtonLike( $element ) {
    if ( $element.tagName === 'BUTTON' ) return true;
    if ( $element.getAttribute( 'type' ) === 'button' ) return true;

    return false
  }


  function isRadioLike( $element ) {
    if ( [ 'radio', 'checkbox' ].contains( $element.getAttribute( 'type' ) ) ) return true;
    return false;
  }


  function focusElement( $element ) {

    $element.focus();
  }


  function activateAnchor( $anchor ) {

    var
      href = $anchor.getAttribute( 'href' ),
      target = $anchor.getAttribute( 'target' ),
      url = makeAbsoluteUrl( href );

    if ( FORCE_NEW_TAB || FORCE_NEW_TAB_EXCEPTION ) {

      safari.self.tab.dispatchMessage( 'newtab', {
        url: url,
        visibility: 'background',
      });

      FORCE_NEW_TAB_EXCEPTION = false;
    } else if ( target === '_blank' ) {

      safari.self.tab.dispatchMessage( 'newtab', {
        url: url,
        visibility: 'foreground',
      });

    } else {

      clickElement( $anchor );
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


  function goToNextTab() {
    safari.self.tab.dispatchMessage( 'nextTab' );
  }

  function goToPreviousTab() {
    safari.self.tab.dispatchMessage( 'previousTab' );
  }

  function openNewTab() {
    safari.self.tab.dispatchMessage( 'newTab' );
  }

  function goBackHistory() {
    window.history.back();
  }

  function goForwardHistory() {
    window.history.forward();
  }

  function closeTab(){
    safari.self.tab.dispatchMessage( 'closeTab' );
  }

  function reloadTab(){
    window.location.reload();
  }

  // // // // //

  boot();

})();
