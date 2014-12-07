rm -f a.xpi
grep -rE "DEBUG|TEST" . | grep const
zip -r a.xpi Changelog.txt LICENSE.txt README.md bootstrap.js chrome.manifest content/highlighting-user.css content/nodeHighlighter.js content/nodeSearcher.js content/highlightWords.js icon.png icon64.png install.rdf 
cp a.xpi /var/www/html/
cp a.xpi HighlightWords-1.0.0.xpi
