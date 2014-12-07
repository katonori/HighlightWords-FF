/* ***** BEGIN LICENSE BLOCK *****
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 * Copyright (c) 2014, MPL Contributor1 katonori.d@gmail.com
 *
 * ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

const DEBUG = false; // If false, the debug() function does nothing.

//===========================================
// bootstrap.js API
//===========================================
function install(aData, aReason) {
    //HighlightWords.install();
}

function uninstall(aData, aReason) {
    //if (aReason == ADDON_UNINSTALL)
        //HighlightWords.uninstall();
}

function startup(aData, aReason) {
    // General setup
    Cu.import('chrome://highlightwords/content/highlightWords.js');
    HighlightWords.init();

    // Load into any existing windows
    let windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
        let win = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        if (win)
            HighlightWords.load(win);
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
            HighlightWords.unload(win);
    }

    // General teardown
    HighlightWords.uninit();
}

let windowListener = {
    onOpenWindow: function(aWindow) {
        let win = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                         .getInterface(Ci.nsIDOMWindowInternal
                                                || Ci.nsIDOMWindow);

        win.addEventListener('UIReady', function() {
            win.removeEventListener('UIReady', arguments.callee, false);
            HighlightWords.load(win);
        }, false);
    },

    // Unused
    onCloseWindow: function(aWindow) {},
    onWindowTitleChange: function(aWindow, aTitle) {},
};


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

