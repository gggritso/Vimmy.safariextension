(function() {
  'use strict';

  Array.prototype.contains = function( e ) {
    return this.indexOf( e ) !== -1;
  };

  Array.prototype.last = function() {
    return this.slice( -1 )[ 0 ];
  };

  String.prototype.startsWith = function( substring ) {
    return this.substring(0, substring.length ) === substring;
  };

  String.prototype.contains = function( substring ) {
    return this.indexOf( substring ) !== -1;
  };

  String.prototype.isIn = function( array ) {
    return array.indexOf( this ) !== -1;
  };

  String.prototype.reverse = function() {
    return this.split( '' ).reverse().join( '' );
  };

  String.prototype.isCapital = function() {
    return this.toUpperCase() === this;
  }


})();
