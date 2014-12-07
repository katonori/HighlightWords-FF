/* ***** BEGIN LICENSE BLOCK *****
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 * Copyright (c) 2014, MPL Contributor1 katonori.d@gmail.com
 *
 * ***** END LICENSE BLOCK ***** */
let EXPORTED_SYMBOLS = ["HighlightWords"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

const DEBUG = false; // If false, the debug() function does nothing.
const TEST = false;
let Test = null;

let Preferences = {};
Preferences.highlighted = false;
Preferences.highlightMatchCase = false;
Preferences.highlighterCount = 5;
Preferences.overlapsDisplayMode = 1;
Preferences.maxColorizedHighlights  = 1000;
let SyncRegex = new RegExp("^http[s]?://([^.]+\.)?google\.([a-z]+\.?)+/.*[?&]q=([^&]*)");

HighlightWords = function() {
  Cu.import('chrome://highlightwords/content/nodeSearcher.js');
  Cu.import('chrome://highlightwords/content/nodeHighlighter.js');
  if(TEST) {
      Cu.import('chrome://highlightwords/content/testModule.js');
      Test = new TestModule();
  }
  loadStyleSheet("chrome://highlightwords/content/highlighting-user.css");

  let _highlighter = new NodeHighlighter("searchwp-highlighting");
  let _nodeSearcher = new NodeSearcher();
  let _menuId = null;

  /**
   * Refreshes the current highlighting.
   */
  this.refresh = function() {
    if (Preferences.highlighted) {
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
    let matchCase = aEvent.altKey || aEvent.ctrlKey;

    Preferences.highlightMatchCase = matchCase;
    if (!Preferences.highlighted || !matchCase) {
      Preferences.highlighted = !Preferences.highlighted;
    }
  }

  /**
   * Hightlight the current page.
   */
  //function highlight() {
  this.highlight = function () {
      let words = getChromeWindow()._extensionHilighterWords;
      if(words) {
          let termsArray = words;
          for(let i = 0, len = termsArray.length; i < len; ++i) {
              debug("Words: " + termsArray[i]);
          }
          if ( termsArray ) {
              let count = 0;
              let highlighterCount = Preferences.highlighterCount;
              let highlightMatchCase = Preferences.highlightMatchCase;

              for ( let i = 0, len = termsArray.length; i < len; ++i ) {
                  let criteria = "term-" + ( i % highlighterCount + 1 );
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
    let count = 0;
    let window = getWindow();

    if (!aWindow) {
      aWindow = window.content;
    }

    for (let i = 0; aWindow.frames && i < aWindow.frames.length; i++) {
      count += highlightBrowserWindow(aWord, aCriteria, aMatchCase, aWindow.frames[i]);
    }

    let doc = aWindow.document;
    if ( !doc || !doc.body ) {
      return count;
    }

    let clearing = !aCriteria || !aWord;
    let overlapsDisplayMode = Preferences.overlapsDisplayMode;

    if ( !clearing && overlapsDisplayMode == 1 ) { // fixed
      doc.body.classList.add("searchwp-overlaps-display-mode-1");
      doc.body.classList.remove("searchwp-overlaps-display-mode-2");
    }

    if ( clearing ) {
      _highlighter.clear(doc);
      let findSelection = getFindSelection( aWindow );
      findSelection && findSelection.removeAllRanges();
      return count;
    }

    let criteria = aWord.replace(/\s*/, "");

    let searchResults = _nodeSearcher.search( doc.body, criteria, aMatchCase, true );

    if ( searchResults.length ) {
      if ( searchResults.length > Preferences.maxColorizedHighlights ) {
        let findSelection = getFindSelection( aWindow );

        if ( findSelection ) {
          for ( let i = 0, l = searchResults.length; i < l; ++i ) {
            findSelection.addRange( searchResults[i].range );
          }

          count = searchResults.length;
        }

      } else {
        let elementProto = createElementProto( doc, aCriteria );
        _highlighter.highlight( searchResults, elementProto );

        count = searchResults.length;
      }
    }

    return count;
  }

  function loadStyleSheet(aFileURI, aIsAgentSheet) {
      let sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
          .getService(Components.interfaces.nsIStyleSheetService);
      let ios = Components.classes["@mozilla.org/network/io-service;1"]
          .getService(Components.interfaces.nsIIOService);
      let uri = ios.newURI(aFileURI, null, null);
      let sheetType = aIsAgentSheet ? sss.AGENT_SHEET : sss.USER_SHEET;
      if(!sss.sheetRegistered(uri, sheetType)) {
          sss.loadAndRegisterSheet(uri, sheetType);
      }
  }

  function createElementProto( aDocument, aCriteria ) {
    let element = aDocument.createElement("layer");
    element.className = "searchwp-term";
    element.setAttribute( "highlight", aCriteria );
    return element;
  }

  function getFindSelection( aWindow ) {
    return getSelectionOfType( aWindow, 128 );
  }

  function areArraysEqual( aArray1, aArray2 ) {
    if ( aArray1.length != aArray2.length ) {
      return false;
    }

    for ( let i = 0, len = aArray1.length; i < len; ++i ) {
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

      if(TEST) {
          this._menuId = aWindow.NativeWindow.menu.add("run test", null, test);
      }

      let deck = aWindow.BrowserApp.deck;
      deck.addEventListener("pageshow", this, false);
      Services.obs.addObserver(this, "Tab:Selected", false);
  }

  this.unload = function(aWindow) {
      //debug('unload(' + aWindow + ')');

      if (!aWindow)
          return;

      if(TEST) {
          aWindow.NativeWindow.menu.remove(this._menuId);
      }

      let deck = aWindow.BrowserApp.deck;
      deck.removeEventListener("pageshow", this, false);
      Services.obs.removeObserver(this, "Tab:Selected", false);
  }

  this.observe = function(aSubject, aTopic, aData) {
      debug('observe(' + aSubject + ', ' + aTopic + ', ' + aData + ')');

      switch (aTopic) {
          case 'Tab:Selected':
              debug("onloadCb");
              let uri = getTabUrl(aData);
              this._updateHighlightWords(uri);
              break;
      }
  }

  function _parseUri(uri) {
      debug("uri: " + uri);
      let index = uri.indexOf("://");
      if(index < 0) {
          return null;
      }
      let str = uri.substr(index+3);
      index = str.indexOf("/");
      if(index < 0) {
          return null;
      }
      let addr = str.substr(0, index);
      let re0 = new RegExp("^([^.]+\.)?google\.([a-z]+\.?)+");
      let match = re0.exec(addr);
      if(!match) {
          return null;
      }
      let path = str.substr(index+1);
      let re1 = new RegExp("^.*[?&]q=([^&]*)");
      match = re1.exec(path);
      //let match = SyncRegex.exec(uri);
      if(match) {
          let words = [];
          if(match) {
              let matchStr = match[match.length-1];
              matchStr = matchStr.replace("　", "+");
              matchStr = matchStr.replace("%E3%80%80", "+");
              if(matchStr.indexOf("+") >= 0) {
                  let tmp = matchStr.split("+");
                  for(let i = 0, len = tmp.length; i < len; ++i) {
                      if(tmp[i] != "") {
                          words.push(tmp[i]);
                      }
                  }
              }
              else {
                  words = [matchStr];
              }
              for(let i = 0, len = words.length; i < len; ++i) {
                  words[i] = decodeURI(words[i]);
              }
          }
          return words;
      }
      return null;
  }

  this._updateHighlightWords = function(uri) {
      let words = _parseUri(uri);
      if(words) {
          getChromeWindow()._extensionHilighterWords = words;
      }
  }

  this.handleEvent = function(aEvent) {
      debug("handleEvent: " + aEvent.type);
      switch (aEvent.type) {
          case 'pageshow':
          {
              let tab = getSelectedTab();
              if(!tab || aEvent.originalTarget.defaultView != tab.browser.contentWindow) {
                  break;
              }
              let uri = getCurTabUrl();
              this._updateHighlightWords(uri);
              this.highlight();
              if(TEST) {
                  Test.check();
              }
              break;
          }
      }
  }
}

//===========================================
// Utilities
//===========================================
function debug(aMsg, aWord) {
    if(aWord == null) {
        aWord = "HighlightWords: ";
    }
    if (!DEBUG) return;
    aMsg = aWord + aMsg;
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
    let uri = null;
    if(tabs.length > idx) {
        uri = chromeWindow.BrowserApp._tabs[idx].browser.currentURI.spec;
    }
    return uri;
}

function getWindow()
{
    return getSelectedTab().window;
}

function test()
{
    Test.test();
}

