/* ***** BEGIN LICENSE BLOCK *****
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 * Copyright (c) 2014, MPL Contributor1 katonori.d@gmail.com
 *
 * ***** END LICENSE BLOCK ***** */
var EXPORTED_SYMBOLS = ["TestModule"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

TestModule = function() {
    function debug(aMsg, aWord) {
        if(aWord == null) {
            aWord = "HighlightWords: ";
        }
        aMsg = aWord + aMsg;
        Services.console.logStringMessage(aMsg);
    }
    function getChromeWindow() {
        return Services.wm.getMostRecentWindow('navigator:browser');
    }
    function getSelectedTab() {
        let chromeWindow = Services.wm.getMostRecentWindow('navigator:browser');
        let selectedTab = chromeWindow.BrowserApp.selectedTab;
        return selectedTab;
    }
    function getWindow()
    {
        return getSelectedTab().window;
    }
    this.test = function() {
        getChromeWindow()._testResult = "";
        getChromeWindow()._extensionHilighterWords = ["ubuntu", "re"];
        getWindow().open("http://192.168.11.19","_self")
    }
    this.check = function() {
        this._bodyDump = "";
        this.dumpDoc(getWindow().content.document.body);
        debug("BBB" + this._bodyDump.length);
        var lines = this._bodyDump.split("\n");
        for(var i = 0, len = lines.length; i < len; ++i) {
            debug(lines[i]);
        }
    }

    this.dumpDoc = function(aElement)
    {
        var children = aElement.children;
        this._bodyDump += aElement.innerHTML;
        for(var i = 0, len = children.length; i < len; ++i) {
            this.dumpDoc(children[i]);
        }
    }

};

const ref = [
];
