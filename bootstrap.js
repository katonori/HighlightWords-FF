const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

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
gSearchWP.SyncRegex = new RegExp("^http[s]?://([^.]+\.)?google\.([a-z]+\.?)+/.*[?&]q=([^&]*)");

Cu.import('chrome://testapp/content/nodeSearcher.js');
Cu.import('chrome://testapp/content/nodeHighlighter.js');

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

gSearchWP.Highlighting = new function() {
  gSearchWP.loadStyleSheet("chrome://testapp/content/highlighting-user.css");

  var _stringBundle = null;
  var _tokensArrayCache;
  var _matchCaseCache;
  var _highlightTimeout;
  var _highlighter = new NodeHighlighter("searchwp-highlighting");
  var _nodeSearcher = new NodeSearcher();

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
// WordHighlighter
//===========================================
let WordHighlighter = {
    install: function() {
        //debug('install()');
    },

    uninstall: function() {
        //debug('uninstall()');
    },

    init: function() {
        debug('init()');

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
        deck.addEventListener("pageshow", this, false);
        deck.addEventListener("touch", this, false);
        Services.obs.addObserver(this, "Tab:Selected", false);
    },

    unload: function(aWindow) {
        //debug('unload(' + aWindow + ')');

        if (!aWindow)
            return;

        let deck = aWindow.BrowserApp.deck;
        deck.removeEventListener("pageshow", this, false);
        deck.removeEventListener("touch", this, false);
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

    _test: function(uri) {
        //var str = "https://www.google.co.jp/search?q=searchwp&rls=org.mozilla%3Aja%3Aofficial&oq=searchwp&gs_l=mobile-heirloom-serp.3..0l5.491163.502108.0.503551.24.10.6.4.7.2.772.2771.2j3j1j5-1j2.9.0....0...1c.1.34.mobile-heirloom-serp..9.15.932.P3NnWCdF6NU";
        //var str = "https://www.google.co.jp/search?q=searchwp+reboot&oe=utf-8&rls=org.mozilla%3Aja%3Aofficial&gws_rd=cr&oq=searchwp+reboot&gs_l=mobile-heirloom-serp.3..41.4495.15530.0.16229.19.13.5.0.0.2.524.2509.2j5j5j5-1.13.0....0...1c.1.34.mobile-heirloom-serp..11.8.797.ZsbhrEDVstM"
        var str = uri;
        var re0 = new RegExp("^http[s]?://([^.]+\.)?google\.([a-z]+\.?)+/(.*)");
        debug("=================== start");
        var match = re0.exec(str);
        debug("=================== end");
    },

    _updateHighlightWords: function(uri) {
        //this._test();
        debug("uri: " + uri);
        var index = uri.indexOf("://");
        if(index < 0) {
            return;
        }
        var str = uri.substr(index+3);
        debug("str: " + str);
        index = str.indexOf("/");
        if(index < 0) {
            return;
        }
        var addr = str.substr(0, index);
        debug("addr: " + addr);
        var re0 = new RegExp("^([^.]+\.)?google\.([a-z]+\.?)+");
        var match = re0.exec(addr);
        if(!match) {
            return;
        }
        var path = str.substr(index+1);
        var re1 = new RegExp("^.*[?&]q=([^&]*)");
        debug("path: " + path);
        debug("regexp: done");
        match = re1.exec(path);
        //var match = gSearchWP.SyncRegex.exec(uri);
        if(match) {
            debug("regexp: done: ");
            //this._test(uri);
            if(match) {
                var matchStr = match[match.length-1];
                matchStr = matchStr.replace("　", "+");
                matchStr = matchStr.replace("%81%40", "+");
                matchStr = matchStr.replace("%E3%80%80", "+");
                debug("matchStr: " + matchStr);
                var words = [];
                if(matchStr.indexOf("+") >= 0) {
                    var tmp = matchStr.split("+");
                    for(var i = 0, len = tmp.length; i < len; ++i) {
                        if(tmp[i] != "") {
                            words.push(tmp[i]);
                        }
                    }
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
        }
    },

    handleEvent: function(aEvent) {
        debug("handleEvent: " + aEvent.type);
        switch (aEvent.type) {
            case 'touch':
            {
                this._test();
                break;
            }
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
    },
};

//===========================================
// bootstrap.js API
//===========================================
function install(aData, aReason) {
    //WordHighlighter.install();
}

function uninstall(aData, aReason) {
    //if (aReason == ADDON_UNINSTALL)
        //WordHighlighter.uninstall();
}

function startup(aData, aReason) {
    // General setup
    WordHighlighter.init();

    // Load into any existing windows
    let windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
        let win = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        if (win)
            WordHighlighter.load(win);
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
            WordHighlighter.unload(win);
    }

    // General teardown
    WordHighlighter.uninit();
}

let windowListener = {
    onOpenWindow: function(aWindow) {
        let win = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                         .getInterface(Ci.nsIDOMWindowInternal
                                                || Ci.nsIDOMWindow);

        win.addEventListener('UIReady', function() {
            win.removeEventListener('UIReady', arguments.callee, false);
            WordHighlighter.load(win);
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
    aMsg = 'WordHighlighter: ' + aMsg;
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
        let uri = 'chrome://testapp/locale/main.properties';
        gStringBundle = Services.strings.createBundle(uri);
    }

    try {
        return gStringBundle.GetStringFromName(aName);
    } catch (ex) {
        return aName;
    }
}

