#!/usr/bin/env python

import sys
import commands
from xml.etree.ElementTree import *

def parseRdf():
    tree = None
    try:
        #register_namespace('em', 'http://www.mozilla.org/2004/em-rdf#')
        tree = parse("install.rdf")
    except Exception as e:
        raise e
    elem = tree.getroot()
    ver = elem.find(".//{http://www.mozilla.org/2004/em-rdf#}version").text
    name = elem.find(".//{http://www.mozilla.org/2004/em-rdf#}name").text
    return ver, name

if __name__ == "__main__":
    """
    if len(sys.argv) != 2:
        print "usage: cmd prefix"
        sys.exit(1)
    """
    ver, name = parseRdf()
    fn = "%s-%s.xpi"%(name, ver)
    print fn
    status, out = commands.getstatusoutput('rm -f %s; \
        grep -rE "DEBUG|TEST" . | grep const; \
        zip -r %s Changelog.txt LICENSE.txt README.md bootstrap.js chrome.manifest content/highlighting-user.css content/nodeHighlighter.js content/nodeSearcher.js content/highlightWords.js icon.png icon64.png install.rdf; \
        cp %s /var/www/html/'%(fn, fn, fn))
    print status
    print out
