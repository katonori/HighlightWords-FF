/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is SearchWP.
 *
 * The Initial Developer of the Original Code is
 *  Georges-Etienne Legendre <legege@legege.com> <http://legege.com>.
 * Portions created by the Initial Developer are Copyright (C) 2004-2008.
 * All Rights Reserved.
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
