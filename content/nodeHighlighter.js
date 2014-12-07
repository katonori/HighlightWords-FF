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

var EXPORTED_SYMBOLS = ["NodeHighlighter"];

NodeHighlighter = function(aName) {
  var _name = aName;
  var _className = "searchwp-highlight-" + _name;

  /**
   * Clear the highlighting for a particular document.
   * @param aDocument The document to clear.
   */
  this.clear = function(aDocument) {
    if (!aDocument) {
      return;
    }

    var elementList = aDocument.getElementsByClassName( _className );
    var elements = Array.slice( elementList, 0 );

    var lastParent;

    elements.forEach(function( element ) {
      var parent = element.parentNode;

      while ( element.firstChild ) {
        parent.insertBefore( element.firstChild, element );
      }
      parent.removeChild( element );

      if ( parent !== lastParent ) {
        lastParent && lastParent.normalize();
        lastParent = parent;
      }
    });

    lastParent && lastParent.normalize();
  };


  this.highlight = function( aTextNodesArray, aElementProto ) {
    if ( aTextNodesArray.length === 0 ) {
      return;
    }

    var document = aElementProto.ownerDocument;
    var elementProto = aElementProto.cloneNode(false);
    elementProto.className += " " + _className;

    var prevNode, fragment, usedOffset, offset, rest, left, towrap, element;

    for ( var i = 0, ii = aTextNodesArray.length; i < ii; ++i ) {
      var textNodes = aTextNodesArray[i];

      for ( var j = 0, jj = textNodes.length, n = jj-1; j < jj ; ++j ) {
        var node = textNodes[j];

        if ( node != prevNode && fragment ) {
          rest && rest.data && fragment.appendChild( rest );
          prevNode.parentNode.replaceChild( fragment, prevNode );
          fragment = null;
        }

        // first or/and last
        if ( j == 0 || j == n ) {
          if ( !fragment ) {
            fragment = document.createDocumentFragment();
            rest = node.cloneNode(false);
            usedOffset = 0;
          }

          towrap = rest;
          rest = null;

          if ( j == 0 ) {
            offset = textNodes.range.startOffset - usedOffset;
            if ( offset ) {
              left = towrap;
              towrap = towrap.splitText( offset );
              fragment.appendChild( left );
              usedOffset += offset;
            }
          }

          if ( j == n ) {
            offset = textNodes.range.endOffset - usedOffset;
            rest = towrap.splitText( offset );
            usedOffset += offset;
          }

          element = elementProto.cloneNode(false);
          element.appendChild( towrap );
          fragment.appendChild( element );

        // others
        } else {
          element = elementProto.cloneNode(false);
          node.parentNode.replaceChild( element, node );
          element.appendChild( node );
        }

        prevNode = node;
      }
    }

    if ( fragment ) {
      rest && rest.data && fragment.appendChild( rest );
      prevNode.parentNode.replaceChild( fragment, prevNode );
    }
  };
};
