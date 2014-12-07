rm -f a.xpi
zip -r a.xpi Changelog.txt LICENSE.txt README.md bootstrap.js chrome.manifest content/testModule.js content/highlighting-user.css content/nodeHighlighter.js content/nodeSearcher.js content/highlightWords.js icon.png icon64.png install.rdf 
cp a.xpi /var/www/html/
