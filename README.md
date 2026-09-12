charlaywood.com
The source of my personal website. It is plain HTML, one stylesheet and one
JavaScript file: there is no framework, no build step and nothing to install.
What is in this repository is what gets served.
Structure
```
index.html            Landing page
about.html            Biography, career path, degrees, recognition
research.html         Research, publications and writing (ORCID-backed)
ventures.html         Business and commercialisation record
speaking.html         Talks, workshops, conference record, speaker kit
content-creation.html Chaska \& Charlay, blog and social channels
connect.html          Contact routes
tango.html            Argentine tango
travel.html           Countries visited
languages.html        Languages
life.html             Index page for the three above
terms.html            Terms and conditions

style.css             The whole stylesheet
site.js               Navigation, filters, modals, blog feed, ORCID, email links
CV.pdf                Linked from the footer of every page
assets/               Images, favicons and the ring motif used in the design

\_redirects            Netlify redirect rules for retired URLs
robots.txt            Crawler policy, points at the sitemap
sitemap.xml           The twelve live pages
netlify.toml          Publishes the repository root, no build command
```
Deploying
Netlify builds from this repository and publishes the root directory. There is
no build command, so a push is a deploy.
`netlify.toml` sets `publish = "."`. The previous repository kept the site in a
`my-website` subfolder and set `base = "my-website"` in the Netlify UI. If that
base directory is still set on the Netlify site, clear it in
Site configuration → Build & deploy → Build settings, otherwise the deploy
will look for a folder that no longer exists.
Old URLs
Every retired address is handled in `\_redirects` with a forced `301!` rule, so
`/science`, `/contact`, `/beyond`, `/sport`, `/football`, `/Education.html`,
`/Work-history.html`, `/achievements.html` and the old `/life/...` pages all
land on the right page and keep their search ranking. The redirect rules
replace the placeholder HTML files that used to sit at those paths.
Things worth knowing before editing
Filters. `\[hidden] { display: none !important; }` near the top of
`style.css` is what makes the filter buttons work. Component rules set
`display` on the same elements, and an author rule beats the browser's own
`\[hidden]` rule, so removing that line silently stops every filter on the
site from hiding anything.
Publications. `research.html` pulls the publication list from the public
ORCID API at page load. Anything published in The Plant Journal is labelled
a Research Highlight automatically; the override table at the top of the
script in `site.js` handles the exceptions.
Travel count. The number of countries is counted from the cards
themselves through `data-count-of`, so adding a card updates the total.
Email. The address is assembled in `site.js` at runtime and does not
appear in the HTML source, which keeps it away from address harvesters.
Blog. The three posts on the homepage are replaced at load time by the
live WordPress feed; the ones in the HTML are the fallback if the feed is
unreachable.
Licence
All rights reserved. The terms are in `terms.html` and at
https://charlaywood.com/terms.
