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
        getChromeWindow()._extensionHilighterWords = ["ubuntu", "re", "asdf", "enabled"];
        getWindow().open("http://192.168.11.19","_self")
    }
    this.check = function() {
        this._bodyDump = "";
        this.dumpDoc(getWindow().content.document.body);
        let lines = this._bodyDump.split("\n");
        for(let i = 0, len = lines.length; i < len; ++i) {
            debug(lines[i], "DUMP");
        }
        if(this.compare(getWindow().content.document.body)) {
            debug("DIFFER");
        }
        else {
            debug("OK: compare");
        }
    }

    this.dumpDoc = function(aElement)
    {
        let children = aElement.children;
        this._bodyDump += aElement.innerHTML;
        debug(aElement.toString(), "DBG: ");
        let lines = aElement.innerHTML.split("\n");
        for(let i = 0, len = lines.length; i < len; i++) {
            debug(lines[i]);
        }
        for(var i = 0, len = children.length; i < len; ++i) {
            debug(children[i].innerHTML);
        }
    }

    this.compare = function(aElement)
    {
        let lines = aElement.innerHTML.split("\n");
        for(let i = 0, len = ref.length; i < len; i++) {
            if(lines[i] != ref[i]) {
                debug("line:" + i + ":\"" + lines[i] + "\"");
                debug("line:" + i + ":\"" + ref[i] + "\"");
                return 1;
            }
        }
        return 0;
    }
    this.dumpDocRecursive = function(aElement)
    {
        let children = aElement.children;
        this._bodyDump += aElement.innerHTML;
        debug(aElement.toString(), "DBG: ");
        let lines = aElement.innerHTML.split("\n");
        for(let i = 0, len = lines.length; i < len; i++) {
            debug(lines[i]);
        }
        for(var i = 0, len = children.length; i < len; ++i) {
            this.dumpDoc(children[i]);
        }
    }

};

const ref = [
'',
'    <div class="main_page">',
'      <div class="page_header floating_element">',
'        <img src="/icons/ubuntu-logo.png" alt="Ubuntu Logo" class="floating_element">',
'        <span class="floating_element">',
'          Apache2 <layer highlight="term-1" class="searchwp-term searchwp-highlight-searchwp-highlighting">Ubuntu</layer> Default Page',
'        </span>',
'      </div>',
'<!--      <div class="table_of_contents floating_element">',
'        <div class="section_header section_header_grey">',
'          TABLE OF CONTENTS',
'        </div>',
'        <div class="table_of_contents_item floating_element">',
'          <a href="#about">About</a>',
'        </div>',
'        <div class="table_of_contents_item floating_element">',
'          <a href="#changes">Changes</a>',
'        </div>',
'        <div class="table_of_contents_item floating_element">',
'          <a href="#scope">Scope</a>',
'        </div>',
'        <div class="table_of_contents_item floating_element">',
'          <a href="#files">Config files</a>',
'        </div>',
'      </div>',
'-->',
'      <div class="content_section floating_element">',
'',
'',
'        <div class="section_header section_header_red">',
'          <div id="about"></div>',
'          It works!',
'        </div>',
'        <div class="content_section_text">',
'          <p>',
'                This is the default welcome page used to test the cor<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>ct ',
'                operation of the Apache2 server after installation on <layer highlight="term-1" class="searchwp-term searchwp-highlight-searchwp-highlighting">Ubuntu</layer> systems.',
'                It is based on the equivalent page on Debian, from which the <layer highlight="term-1" class="searchwp-term searchwp-highlight-searchwp-highlighting">Ubuntu</layer> Apache',
'                packaging is derived.',
'                If you can <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>ad this page, it means that the Apache HTTP server installed at',
'                this site is working properly. You should <b><layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>place this file</b> (located at',
'                <tt>/var/www/html/index.html</tt>) befo<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer> continuing to operate your HTTP server.',
'          </p>',
'',
'',
'          <p>',
'                If you a<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer> a normal user of this web site and don\'t know what this page is',
'                about, this probably means that the site is cur<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>ntly unavailable due to',
'                maintenance.',
'                If the problem persists, please contact the site\'s administrator.',
'          </p>',
'',
'        </div>',
'        <div class="section_header">',
'          <div id="changes"></div>',
'                Configuration Overview',
'        </div>',
'        <div class="content_section_text">',
'          <p>',
'                <layer highlight="term-1" class="searchwp-term searchwp-highlight-searchwp-highlighting">Ubuntu</layer>\'s Apache2 default configuration is diffe<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>nt from the',
'                upst<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>am default configuration, and split into several files optimized for',
'                interaction with <layer highlight="term-1" class="searchwp-term searchwp-highlight-searchwp-highlighting">Ubuntu</layer> tools. The configuration system is',
'                <b>fully documented in',
'                /usr/sha<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>/doc/apache2/<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">RE</layer>ADME.Debian.gz</b>. <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">Re</layer>fer to this for the full',
'                documentation. Documentation for the web server itself can be',
'                found by accessing the <a href="/manual">manual</a> if the <tt>apache2-doc</tt>',
'                package was installed on this server.',
'',
'          </p>',
'          <p>',
'                The configuration layout for an Apache2 web server installation on <layer highlight="term-1" class="searchwp-term searchwp-highlight-searchwp-highlighting">Ubuntu</layer> systems is as follows:',
'          </p>',
'          <pre>/etc/apache2/',
'|-- apache2.conf',
'|       `--  ports.conf',
'|-- mods-<layer highlight="term-4" class="searchwp-term searchwp-highlight-searchwp-highlighting">enabled</layer>',
'|       |-- *.load',
'|       `-- *.conf',
'|-- conf-<layer highlight="term-4" class="searchwp-term searchwp-highlight-searchwp-highlighting">enabled</layer>',
'|       `-- *.conf',
'|-- sites-<layer highlight="term-4" class="searchwp-term searchwp-highlight-searchwp-highlighting">enabled</layer>',
'|       `-- *.conf',
'          </pre>',
'          <ul>',
'                        <li>',
'                           <tt>apache2.conf</tt> is the main configuration',
'                           file. It puts the pieces together by including all <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>maining configuration',
'                           files when starting up the web server.',
'                        </li>',
'',
'                        <li>',
'                           <tt>ports.conf</tt> is always included from the',
'                           main configuration file. It is used to determine the listening ports for',
'                           incoming connections, and this file can be customized anytime.',
'                        </li>',
'',
'                        <li>',
'                           Configuration files in the <tt>mods-<layer highlight="term-4" class="searchwp-term searchwp-highlight-searchwp-highlighting">enabled</layer>/</tt>,',
'                           <tt>conf-<layer highlight="term-4" class="searchwp-term searchwp-highlight-searchwp-highlighting">enabled</layer>/</tt> and <tt>sites-<layer highlight="term-4" class="searchwp-term searchwp-highlight-searchwp-highlighting">enabled</layer>/</tt> di<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>ctories contain',
'                           particular configuration snippets which manage modules, global configuration',
'                           fragments, or virtual host configurations, <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>spectively.',
'                        </li>',
'',
'                        <li>',
'                           They a<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer> activated by symlinking available',
'                           configuration files from their <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>spective',
'                           *-available/ counterparts. These should be managed',
'                           by using our helpers',
'                           <tt>',
'                                <a href="http://manpages.debian.org/cgi-bin/man.cgi?query=a2enmod">a2enmod</a>,',
'                                <a href="http://manpages.debian.org/cgi-bin/man.cgi?query=a2dismod">a2dismod</a>,',
'                           </tt>',
'                           <tt>',
'                                <a href="http://manpages.debian.org/cgi-bin/man.cgi?query=a2ensite">a2ensite</a>,',
'                                <a href="http://manpages.debian.org/cgi-bin/man.cgi?query=a2dissite">a2dissite</a>,',
'                            </tt>',
'                                and',
'                           <tt>',
'                                <a href="http://manpages.debian.org/cgi-bin/man.cgi?query=a2enconf">a2enconf</a>,',
'                                <a href="http://manpages.debian.org/cgi-bin/man.cgi?query=a2disconf">a2disconf</a>',
'                           </tt>. See their <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>spective man pages for detailed information.',
'                        </li>',
'',
'                        <li>',
'                           The binary is called apache2. Due to the use of',
'                           environment variables, in the default configuration, apache2 needs to be',
'                           started/stopped with <tt>/etc/init.d/apache2</tt> or <tt>apache2ctl</tt>.',
'                           <b>Calling <tt>/usr/bin/apache2</tt> di<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>ctly will not work</b> with the',
'                           default configuration.',
'                        </li>',
'          </ul>',
'        </div>',
'',
'        <div class="section_header">',
'            <div id="docroot"></div>',
'                Document Roots',
'        </div>',
'',
'        <div class="content_section_text">',
'            <p>',
'                By default, <layer highlight="term-1" class="searchwp-term searchwp-highlight-searchwp-highlighting">Ubuntu</layer> does not allow access through the web browser to',
'                <em>any</em> file apart of those located in <tt>/var/www</tt>,',
'                <a href="http://httpd.apache.org/docs/2.4/mod/mod_userdir.html">public_html</a>',
'                di<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>ctories (when <layer highlight="term-4" class="searchwp-term searchwp-highlight-searchwp-highlighting">enabled</layer>) and <tt>/usr/sha<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer></tt> (for web',
'                applications). If your site is using a web document root',
'                located elsewhe<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer> (such as in <tt>/srv</tt>) you may need to whitelist your',
'                document root di<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>ctory in <tt>/etc/apache2/apache2.conf</tt>.',
'            </p>',
'            <p>',
'                The default <layer highlight="term-1" class="searchwp-term searchwp-highlight-searchwp-highlighting">Ubuntu</layer> document root is <tt>/var/www/html</tt>. You',
'                can make your own virtual hosts under /var/www. This is diffe<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>nt',
'                to p<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>vious <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>leases which provides better security out of the box.',
'            </p>',
'        </div>',
'',
'        <div class="section_header">',
'          <div id="bugs"></div>',
'                <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">Re</layer>porting Problems',
'        </div>',
'        <div class="content_section_text">',
'          <p>',
'                Please use the <tt><layer highlight="term-1" class="searchwp-term searchwp-highlight-searchwp-highlighting">ubuntu</layer>-bug</tt> tool to <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>port bugs in the',
'                Apache2 package with <layer highlight="term-1" class="searchwp-term searchwp-highlight-searchwp-highlighting">Ubuntu</layer>. However, check <a href="https://bugs.launchpad.net/ubuntu/+source/apache2">existing',
'                bug <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>ports</a> befo<layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer> <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>porting a new bug.',
'          </p>',
'          <p>',
'                Please <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>port bugs specific to modules (such as PHP and others)',
'                to <layer highlight="term-2" class="searchwp-term searchwp-highlight-searchwp-highlighting">re</layer>spective packages, not to the web server itself.',
'          </p>',
'        </div>',
'',
'',
'',
'',
'      </div>',
'    </div>',
'    <div class="validator">',
'    <p>',
'      <a href="http://validator.w3.org/check?uri=referer"><img src="http://www.w3.org/Icons/valid-xhtml10" alt="Valid XHTML 1.0 Transitional" height="31" width="88"></a>',
'    </p>',
'    </div>',
'  ',
'',
'',
'',
];
