const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

//const DEBUG = false; // If false, the debug() function does nothing.
const DEBUG = true; // If false, the debug() function does nothing.

gHighlightWords = {};
gHighlightWords.Preferences = {};
gHighlightWords.Preferences.highlighted = false;
gHighlightWords.Preferences.highlightMatchCase = false;
gHighlightWords.Preferences.highlighterCount = 5;
gHighlightWords.Preferences.overlapsDisplayMode = 1;
gHighlightWords.Preferences.maxColorizedHighlights  = 10000;
gHighlightWords.SyncRegex = new RegExp("^http[s]?://([^.]+\.)?google\.([a-z]+\.?)+/.*[?&]q=([^&]*)");

Cu.import('chrome://highlightwords/content/nodeSearcher.js');
Cu.import('chrome://highlightwords/content/nodeHighlighter.js');

gHighlightWords.loadStyleSheet = function(aFileURI, aIsAgentSheet) {
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

gHighlightWords.Highlighting = new function() {
  gHighlightWords.loadStyleSheet("chrome://highlightwords/content/highlighting-user.css");

  var _highlighter = new NodeHighlighter("searchwp-highlighting");
  var _nodeSearcher = new NodeSearcher();
  var _menuId = null;

  /**
   * Refreshes the current highlighting.
   */
  this.refresh = function() {
    if (gHighlightWords.Preferences.highlighted) {
      unhighlight();
      highlight();
    }
    else {
      unhighlight();
    }
  }

  /**
   * Toggles on and off the highlighting and the match case highlighting.
   *
   * @param aEvent the event object.
   */
  this.toggleHighlight = function(aEvent) {
    var matchCase = aEvent.altKey || aEvent.ctrlKey;

    gHighlightWords.Preferences.highlightMatchCase = matchCase;
    if (!gHighlightWords.Preferences.highlighted || !matchCase) {
      gHighlightWords.Preferences.highlighted = !gHighlightWords.Preferences.highlighted;
    }
  }

  /**
   * Hightlight the current page.
   */
  //function highlight() {
  this.highlight = function () {
      var words = getChromeWindow()._extensionHilighterWords;
      if(words) {
          var termsArray = words;
          for(var i = 0, len = termsArray.length; i < len; ++i) {
              debug("Words: " + termsArray[i]);
          }
          if ( termsArray ) {
              var count = 0;
              var highlighterCount = gHighlightWords.Preferences.highlighterCount;
              var highlightMatchCase = gHighlightWords.Preferences.highlightMatchCase;

              for ( var i = 0, len = termsArray.length; i < len; ++i ) {
                  var criteria = "term-" + ( i % highlighterCount + 1 );
                  count += highlightBrowserWindow( termsArray[i], criteria, highlightMatchCase );
              }
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
    var overlapsDisplayMode = gHighlightWords.Preferences.overlapsDisplayMode;

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
      if ( searchResults.length > gHighlightWords.Preferences.maxColorizedHighlights ) {
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
    return gHighlightWords.getSelectionOfType( aWindow, 128 );
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

  this.install = function() {
      //debug('install()');
  }

  this.uninstall = function() {
      //debug('uninstall()');
  }

  this.init = function() {
      debug('init()');

      this._branch = null;

      if (!this._branch) {
          this._branch = Services.prefs.getBranch('extensions.highlightwords.');

          this._branch.addObserver('', this, false);
      }
  }

  this.uninit = function() {
      //debug('uninit()');

      if (this._branch) {
          this._branch.removeObserver('', this);
          this._branch = null;
      }
  }

  this.load = function(aWindow) {
      //debug('load(' + aWindow + ')');

      if (!aWindow)
          return;

      if(DEBUG) {
          this._menuId = aWindow.NativeWindow.menu.add("run test", null, test);
      }

      let deck = aWindow.BrowserApp.deck;
      deck.addEventListener("pageshow", this, false);
      deck.addEventListener("touch", this, false);
      Services.obs.addObserver(this, "Tab:Selected", false);
  }

  this.unload = function(aWindow) {
      //debug('unload(' + aWindow + ')');

      if (!aWindow)
          return;

      if(DEBUG) {
          aWindow.NativeWindow.menu.remove(this._menuId);
      }

      let deck = aWindow.BrowserApp.deck;
      deck.removeEventListener("pageshow", this, false);
      deck.removeEventListener("touch", this, false);
      Services.obs.removeObserver(this, "Tab:Selected", false);
  }

  this.observe = function(aSubject, aTopic, aData) {
      debug('observe(' + aSubject + ', ' + aTopic + ', ' + aData + ')');

      switch (aTopic) {
          case 'Tab:Selected':
              debug("onloadCb");
              var uri = getTabUrl(aData);
              this._updateHighlightWords(uri);
              break;
      }
  }

  function _test(uri) {
      //var str = "https://www.google.co.jp/search?q=searchwp&rls=org.mozilla%3Aja%3Aofficial&oq=searchwp&gs_l=mobile-heirloom-serp.3..0l5.491163.502108.0.503551.24.10.6.4.7.2.772.2771.2j3j1j5-1j2.9.0....0...1c.1.34.mobile-heirloom-serp..9.15.932.P3NnWCdF6NU";
      //var str = "https://www.google.co.jp/search?q=searchwp+reboot&oe=utf-8&rls=org.mozilla%3Aja%3Aofficial&gws_rd=cr&oq=searchwp+reboot&gs_l=mobile-heirloom-serp.3..41.4495.15530.0.16229.19.13.5.0.0.2.524.2509.2j5j5j5-1.13.0....0...1c.1.34.mobile-heirloom-serp..11.8.797.ZsbhrEDVstM"
      var str = uri;
      var re0 = new RegExp("^http[s]?://([^.]+\.)?google\.([a-z]+\.?)+/(.*)");
      debug("=================== start");
      var match = re0.exec(str);
      debug("=================== end");
  }

  function _parseUri(uri) {
      debug("uri: " + uri);
      var index = uri.indexOf("://");
      if(index < 0) {
          return null;
      }
      var str = uri.substr(index+3);
      debug("str: " + str);
      index = str.indexOf("/");
      if(index < 0) {
          return null;
      }
      var addr = str.substr(0, index);
      debug("addr: " + addr);
      var re0 = new RegExp("^([^.]+\.)?google\.([a-z]+\.?)+");
      var match = re0.exec(addr);
      if(!match) {
          return null;
      }
      var path = str.substr(index+1);
      var re1 = new RegExp("^.*[?&]q=([^&]*)");
      debug("path: " + path);
      debug("regexp: done");
      match = re1.exec(path);
      //var match = gHighlightWords.SyncRegex.exec(uri);
      if(match) {
          var words = [];
          debug("regexp: done: ");
          //this._test(uri);
          if(match) {
              var matchStr = match[match.length-1];
              matchStr = matchStr.replace("　", "+");
              matchStr = matchStr.replace("%81%40", "+");
              matchStr = matchStr.replace("%E3%80%80", "+");
              debug("matchStr: " + matchStr);
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
              }
          }
          return words;
      }
      return null;
  }

  this._updateHighlightWords = function(uri) {
      //this._test();
      var words = _parseUri(uri);
      if(words) {
          getChromeWindow()._extensionHilighterWords = words;
      }
  }

  this.handleEvent = function(aEvent) {
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
              gHighlightWords.Highlighting.highlight();
              if(DEBUG) {
                  if(getChromeWindow()._extensionHilighterWords) {
                      debug(getChromeWindow()._extensionHilighterWords);
                  }
                  dumpDoc(getWindow().content.document.body);
              }
              break;
          }
      }
  }
}

//===========================================
// bootstrap.js API
//===========================================


function test()
{
    getChromeWindow()._extensionHilighterWords = ["ubuntu", "re"];
    getWindow().open("http://192.168.11.19","_self")
}

function dumpDoc(aElement)
{
    var toString = Object.prototype.toString;
    var children = aElement.children;
    debug(toString.call(aElement));
    debug(aElement.innerHTML);
    for(var i = 0, len = children.length; i < len; ++i) {
        dumpDoc(children[i]);
    }
}

function install(aData, aReason) {
    //gHighlightWords.install();
}

function uninstall(aData, aReason) {
    //if (aReason == ADDON_UNINSTALL)
        //gHighlightWords.uninstall();
}

function startup(aData, aReason) {
    // General setup
    gHighlightWords.Highlighting.init();

    // Load into any existing windows
    let windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
        let win = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        if (win)
            gHighlightWords.Highlighting.load(win);
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
            gHighlightWords.Highlighting.unload(win);
    }

    // General teardown
    gHighlightWords.Highlighting.uninit();
}

let windowListener = {
    onOpenWindow: function(aWindow) {
        let win = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                         .getInterface(Ci.nsIDOMWindowInternal
                                                || Ci.nsIDOMWindow);

        win.addEventListener('UIReady', function() {
            win.removeEventListener('UIReady', arguments.callee, false);
            gHighlightWords.Highlighting.load(win);
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
    aMsg = 'HighlightWords: ' + aMsg;
    Services.console.logStringMessage(aMsg);
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

