/* ***** BEGIN LICENSE BLOCK *****
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 * Copyright (c) 2014, MPL Contributor1 katonori.d@gmail.com
 *
 * ***** END LICENSE BLOCK ***** */
/*
 * This file is brought from SearchWP and modified for Highlightwords.
 * The Initial Developer of the Original Code is
 *  Georges-Etienne Legendre <legege@legege.com> <http://legege.com>.
 */

var EXPORTED_SYMBOLS = ["NodeSearcher"];

NodeSearcher = function() {

  this.search = function( topElement, word, caseSensitive, excludeEditable ) {

    var ret = [], textNodes;

    // Workaround for bug https://bugzilla.mozilla.org/show_bug.cgi?id=488427
    // (forcing a FlushPendingNotifications call)
    topElement.offsetWidth;

    var searchRange = topElement.ownerDocument.createRange();
    searchRange.selectNodeContents( topElement );

    var startPt = searchRange.cloneRange();
    startPt.collapse( true );

    var endPt = searchRange.cloneRange();
    endPt.collapse( false );

    var finder = Components.classes['@mozilla.org/embedcomp/rangefind;1']
      .createInstance( Components.interfaces.nsIFind );

    finder.caseSensitive = !!caseSensitive;

    while (( startPt = finder.Find(word, searchRange, startPt, endPt) )) {
      textNodes = getTextNodesFromFindRange( startPt );

      if ( excludeEditable && textNodes.some( isEditable ) ) {
        // Skip the first node.
        startPt.setStartAfter( textNodes[0] );

      } else {
        textNodes.range = startPt.cloneRange();
        ret.push( textNodes );
      }

      startPt.collapse( false );
    }

    return ret;
  };

  function isEditable( node ) {
    // No need to check the text node itself (only parents).
    while (( node = node.parentNode )) {
      if ( node instanceof Components.interfaces.nsIDOMNSEditableElement ) {
        return true;
      }
    }
    return false;
  }

  function getTextNodesFromFindRange( range ) {
    var node = range.startContainer;
    var last = range.endContainer;
    var ret = [], isTextNode;

    while ( 1 ) {
      isTextNode = node.nodeType === 3;

      if ( isTextNode ) {
        ret.push( node );
      }

      if ( node === last ) {
        break;
      }

      // Skip childs as nsFind does...
      node = getNextNode( node, isTextNode || /^(?:script|noframe|select)$/i.test(node.nodeName) );
      if ( !node ) {
        throw "last node in range not reached - check nsFind.cpp to see which nodes are skipped";
      }
    }

    return ret;
  }

  function getNextNode( node, skipChilds ) {
    var next = !skipChilds && node.firstChild || node.nextSibling;
    while ( !next ) {
      node = node.parentNode;
      if ( !node ) {
        return null;
      }
      next = node.nextSibling;
    }
    return next;
  }

};
