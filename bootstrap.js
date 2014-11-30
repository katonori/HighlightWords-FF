const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/PrivateBrowsingUtils.jsm');

//const DEBUG = false; // If false, the debug() function does nothing.
const DEBUG = true; // If false, the debug() function does nothing.

gSearchWP = {};
gSearchWP.Highlighter = {};
gSearchWP.Preferences = {};
gSearchWP.Preferences.highlighted = false;
gSearchWP.Preferences.highlightMatchCase = false;
gSearchWP.Preferences.highlighterCount = 5;
gSearchWP.Preferences.overlapsDisplayMode = 1;
gSearchWP.Preferences.maxColorizedHighlights  = 10000;

gSyncRegex = new RegExp("^http[s]?://([^.]+\.)?google\.([a-z]+\.?)+/.*[?&]q=([^&]*)", "g");

gSearchWP.loadStyleSheet = function(aFileURI, aIsAgentSheet) {
  var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                      .getService(Components.interfaces.nsIStyleSheetService);
  var ios = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
  var uri = ios.newURI(aFileURI, null, null);
  var sheetType = aIsAgentSheet ? sss.AGENT_SHEET : sss.USER_SHEET;
  if(!sss.sheetRegistered(uri, sheetType)) {
    sss.loadAndRegisterSheet(uri, sheetType);
  }
}

gSearchWP.Highlighter.NodeSearcher = function NodeSearcher() {

  this.search = function( topElement, word, caseSensitive, excludeEditable ) {

    var ret = [], textNodes;

    // Workaround for bug https://bugzilla.mozilla.org/show_bug.cgi?id=488427
    // (forcing a FlushPendingNotifications call)
    topElement.offsetWidth;

    var searchRange = topElement.ownerDocument.createRange();
    //var searchRange = topElement.createRange();
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

gSearchWP.Highlighter.NodeHighlighter = function(aName) {
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

gSearchWP.Highlighting = new function() {
  gSearchWP.loadStyleSheet("chrome://testapp/content/highlighting-user.css");

  var _stringBundle = null;
  var _tokensArrayCache;
  var _matchCaseCache;
  var _highlightTimeout;
  var _highlighter = new gSearchWP.Highlighter.NodeHighlighter("searchwp-highlighting");
  var _nodeSearcher = new gSearchWP.Highlighter.NodeSearcher();

  /**
   * Initialize this class.
   */
  this.init = function() {
    _stringBundle = document.getElementById("bundle-searchwp");

    var tabBox = document.getElementById("content").mTabBox;
    tabBox.addEventListener("select", refreshCallback, false);
  }

  /**
   * Updates the highlighting according to the terms.
   */
  this.update = function(aTokensArray, aForce) {
    var highlightMatchCase = gSearchWP.Preferences.highlightMatchCase;

    if ( aForce ||
      !_tokensArrayCache != !aTokensArray ||
      !_matchCaseCache != !highlightMatchCase ||
      !areArraysEqual( _tokensArrayCache || [], aTokensArray || [] )
    ) {
      _tokensArrayCache = aTokensArray;
      _matchCaseCache = highlightMatchCase;

      setRefreshTimeout();
    }
  }

  /**
   * Refreshes the current highlighting.
   */
  this.refresh = function() {
   clearRefreshTimeout();

    if (gSearchWP.Preferences.highlighted) {
      unhighlight();
      highlight();
    }
    else {
      unhighlight();
    }
  }

  this.flushUpdate = function() {
    if ( _highlightTimeout ) {
      this.refresh();
    }
  }

  /**
   * Toggles on and off the highlighting and the match case highlighting.
   *
   * @param aEvent the event object.
   */
  this.toggleHighlight = function(aEvent) {
    var matchCase = aEvent.altKey || aEvent.ctrlKey;

    gSearchWP.Preferences.highlightMatchCase = matchCase;
    if (!gSearchWP.Preferences.highlighted || !matchCase) {
      gSearchWP.Preferences.highlighted = !gSearchWP.Preferences.highlighted;
    }
  }

  /**
   * @return true if the highlight button exists.
   */
  this.exist = function() {
    return this.highlightButton != null;
  }

  /**
   * @return a reference to the highlight button.
   */
  this.__defineGetter__("highlightButton", function() {
    return document.getElementById("searchwp-highlight-button");
  });

  /**
   * Sets a refresh for the highlighting in 500ms.
   */
  function setRefreshTimeout() {
    clearRefreshTimeout();
    _highlightTimeout = setTimeout( refreshCallback, 500 );
  }

  function clearRefreshTimeout() {
    if ( _highlightTimeout ) {
      clearTimeout( _highlightTimeout );
      _highlightTimeout = 0;
    }
  }

  function refreshCallback() {
    gSearchWP.Highlighting.refresh();
  }

  /**
   * Hightlight the current page.
   */
  //function highlight() {
  this.highlight = function () {
    var termsArray = getChromeWindow()._extensionHilighterWords;
    for(var i = 0, len = termsArray.length; i < len; ++i) {
        debug("WORDS: " + termsArray[i]);
    }
    if ( termsArray ) {
      var count = 0;
      var highlighterCount = gSearchWP.Preferences.highlighterCount;
      var highlightMatchCase = gSearchWP.Preferences.highlightMatchCase;

      for ( var i = 0, len = termsArray.length; i < len; ++i ) {
        var criteria = "term-" + ( i % highlighterCount + 1 );
        count += highlightBrowserWindow( termsArray[i], criteria, highlightMatchCase );
      }
    }
  }

  /**
   * Removes the highlighting of the current page.
   */
  function unhighlight() {
    highlightBrowserWindow();
  }

  function highlightBrowserWindow(aWord, aCriteria, aMatchCase, aWindow) {
    var count = 0;
    let window = getWindow();

    if (!aWindow) {
      aWindow = window.content;
    }

    for (var i = 0; aWindow.frames && i < aWindow.frames.length; i++) {
      count += highlightBrowserWindow(aWord, aCriteria, aMatchCase, aWindow.frames[i]);
    }

    var doc = aWindow.document;
    if ( !doc || !doc.body ) {
      return count;
    }

    var clearing = !aCriteria || !aWord;
    var overlapsDisplayMode = gSearchWP.Preferences.overlapsDisplayMode;

    if ( !clearing && overlapsDisplayMode == 1 ) { // fixed
      doc.body.classList.add("searchwp-overlaps-display-mode-1");
      doc.body.classList.remove("searchwp-overlaps-display-mode-2");
    }

    if ( clearing ) {
      _highlighter.clear(doc);
      var findSelection = getFindSelection( aWindow );
      findSelection && findSelection.removeAllRanges();
      return count;
    }

    var criteria = aWord.replace(/\s*/, "");

    var searchResults = _nodeSearcher.search( doc.body, criteria, aMatchCase, true );

    if ( searchResults.length ) {
      if ( searchResults.length > gSearchWP.Preferences.maxColorizedHighlights ) {
        var findSelection = getFindSelection( aWindow );

        if ( findSelection ) {
          for ( var i = 0, l = searchResults.length; i < l; ++i ) {
            findSelection.addRange( searchResults[i].range );
          }

          count = searchResults.length;
        }

      } else {
        var elementProto = createElementProto( doc, aCriteria );
        _highlighter.highlight( searchResults, elementProto );

        count = searchResults.length;
      }
    }

    return count;
  }

  function createElementProto( aDocument, aCriteria ) {
    var element = aDocument.createElement("layer");
    element.className = "searchwp-term";
    element.setAttribute( "highlight", aCriteria );
    return element;
  }

  function getFindSelection( aWindow ) {
    debug("DDDDDDDDD: getFindSelection()");
    return gSearchWP.getSelectionOfType( aWindow, 128 );
  }

  function areArraysEqual( aArray1, aArray2 ) {
    if ( aArray1.length != aArray2.length ) {
      return false;
    }

    for ( var i = 0, len = aArray1.length; i < len; ++i ) {
      if ( aArray1[i] !== aArray2[i] ) {
        return false;
      }
    }

    return true;
  }
}

//===========================================
// OneHandZoom
//===========================================
let OneHandZoom = {
    install: function() {
        //debug('install()');
    },

    uninstall: function() {
        //debug('uninstall()');
    },

    init: function() {
        debug('init()');

        const firefoxApp = Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULAppInfo);
        this._firefoxVersion = parseInt(firefoxApp.version);

        this._branch = null;

        if (!this._branch) {
            this._branch = Services.prefs.getBranch('extensions.testapp.');

            this._branch.addObserver('', this, false);
        }
    },

    uninit: function() {
        //debug('uninit()');

        if (this._branch) {
            this._branch.removeObserver('', this);
            this._branch = null;
        }
    },

    myOnDoubleTap: function(aData) {
    },

    load: function(aWindow) {
        //debug('load(' + aWindow + ')');

        if (!aWindow)
            return;

        let deck = aWindow.BrowserApp.deck;
        deck.addEventListener("touchstart", this, true);
        deck.addEventListener("pageshow", this, false);
        Services.obs.addObserver(this, "Tab:Selected", false);
    },

    unload: function(aWindow) {
        //debug('unload(' + aWindow + ')');

        if (!aWindow)
            return;

        let deck = aWindow.BrowserApp.deck;
        deck.removeEventListener('touchstart', this, true);
        deck.removeEventListener("pageshow", this, false);
        Services.obs.removeObserver(this, "Tab:Selected", false);
    },

    observe: function(aSubject, aTopic, aData) {
        debug('observe(' + aSubject + ', ' + aTopic + ', ' + aData + ')');

        switch (aTopic) {
            case 'Tab:Selected':
                debug("onloadCb");
                var uri = getTabUrl(aData);
                this._updateHighlightWords(uri);
                break;
        }
    },

    _updateHighlightWords: function(uri) {
        debug("uri: " + uri);
        var match = gSyncRegex.exec(uri);
        if(match) {
            var matchStr = match[match.length-1];
            var words = [];
            if(matchStr.indexOf("+") >= 0) {
                words = match[match.length-1].split("+");
            }
            else {
                words = [matchStr];
            }
            for(var i = 0, len = words.length; i < len; ++i) {
                words[i] = decodeURI(words[i]);
                debug("Words: " + words[i]);
            }
            getChromeWindow()._extensionHilighterWords = words;
        }
    },

    handleEvent: function(aEvent) {
        debug("handleEvent: " + aEvent.type);
        switch (aEvent.type) {
            case 'pageshow':
            {
                if (aEvent.originalTarget.defaultView != getSelectedTab().browser.contentWindow) {
                    break;
                }
                var uri = getCurTabUrl();
                this._updateHighlightWords(uri);
                gSearchWP.Highlighting.highlight();
                break;
            }
        }

        switch (aEvent.type) {
            case 'touchstart':
                break;
        }
    },
};

//===========================================
// bootstrap.js API
//===========================================
function install(aData, aReason) {
    //OneHandZoom.install();
}

function uninstall(aData, aReason) {
    //if (aReason == ADDON_UNINSTALL)
        //OneHandZoom.uninstall();
}

function startup(aData, aReason) {
    // General setup
    OneHandZoom.init();

    // Load into any existing windows
    let windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
        let win = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        if (win)
            OneHandZoom.load(win);
    }

    // Load into any new windows
    Services.wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
    // When the application is shutting down we normally don't have to clean
    // up any UI changes made
    if (aReason == APP_SHUTDOWN)
        return;

    // Stop listening for new windows
    Services.wm.removeListener(windowListener);

    // Unload from any existing windows
    let windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
        let win = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        if (win)
            OneHandZoom.unload(win);
    }

    // General teardown
    OneHandZoom.uninit();
}

let windowListener = {
    onOpenWindow: function(aWindow) {
        let win = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                         .getInterface(Ci.nsIDOMWindowInternal
                                                || Ci.nsIDOMWindow);

        win.addEventListener('UIReady', function() {
            win.removeEventListener('UIReady', arguments.callee, false);
            OneHandZoom.load(win);
        }, false);
    },

    // Unused
    onCloseWindow: function(aWindow) {},
    onWindowTitleChange: function(aWindow, aTitle) {},
};


//===========================================
// Utilities
//===========================================
function debug(aMsg) {
    if (!DEBUG) return;
    aMsg = 'OneHandZoom: ' + aMsg;
    Services.console.logStringMessage(aMsg);
}

function showToast(aWindow, aMsg) {
    if (!aMsg) return;
    aWindow.NativeWindow.toast.show(aMsg, 'short');
}

function sendMessageToJava(aMessage) {
    let bridge = Cc['@mozilla.org/android/bridge;1'].getService(Ci.nsIAndroidBridge);
    return bridge.handleGeckoMessage(JSON.stringify(aMessage));
}

function getSelectedTab() {
    let chromeWindow = Services.wm.getMostRecentWindow('navigator:browser');
    let selectedTab = chromeWindow.BrowserApp.selectedTab;
    return selectedTab;
}

function getChromeWindow() {
    return Services.wm.getMostRecentWindow('navigator:browser');
}

function getCurTabUrl() {
    return getSelectedTab().browser.currentURI.spec;
}

function getTabUrl(idx) {
    let chromeWindow = getChromeWindow();
    let tabs = chromeWindow.BrowserApp._tabs;
    var uri = null;
    if(tabs.length > idx) {
        uri = chromeWindow.BrowserApp._tabs[idx].browser.currentURI.spec;
    }
    return uri;
}

function getWindow()
{
    return getSelectedTab().window;
}

function getContentWindow()
{
    return this._contentWindow = getSelectedTab().browser.contentWindow;
}

let gStringBundle = null;

function tr(aName) {
    // For translation
    if (!gStringBundle) {
        let uri = 'chrome://onehandzoom/locale/main.properties';
        gStringBundle = Services.strings.createBundle(uri);
    }

    try {
        return gStringBundle.GetStringFromName(aName);
    } catch (ex) {
        return aName;
    }
}

