#!/usr/bin/env python3
"""Build the Penyola website (GitHub Pages serves the repository root as-is).

Privacy, terms and credits pages reuse the body of the legal files the app bundles, so the
published text never drifts from what users read in the app. Run after those files change:

    python3 build.py [path/to/penyola-release]
"""
import json, pathlib, re, sys

SITE = pathlib.Path(__file__).resolve().parent
RELEASE = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else SITE.parent / 'penyola-release')
LEGAL = RELEASE / 'app/engine/iphone/Maps/ScenicResources/legal'
config = json.loads((RELEASE / 'release-config.json').read_text())
EMAIL = config['support_email']
APP_STORE = 'https://apps.apple.com/app/id6821783513'
BASE = 'https://ericning2023.github.io/penyola/'

NAV = [('index.html', 'Home'), ('support.html', 'Support'), ('privacy.html', 'Privacy'), ('credits.html', 'Credits')]


def legal_body(name):
    html = (LEGAL / f'{name}.html').read_text()
    if '{SUPPORT_EMAIL}' in html:
        sys.exit(f'{name}.html still has the {{SUPPORT_EMAIL}} placeholder')
    return re.search(r'<body>(.*)</body>', html, re.S).group(1).strip()


def page(file, title, description, main, body_class=''):
    nav = ''.join(f'<a href="{href}"{" aria-current=\"page\"" if href == file else ""}>{label}</a>'
                  for href, label in NAV)
    url = BASE + ('' if file == 'index.html' else file)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}assets/img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f8f3ea">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="stylesheet" href="assets/site.css">
</head>
<body class="{body_class}">
<header class="top">
  <div class="wrap top-inner">
    <a class="brand" href="index.html"><img src="assets/img/icon-256.png" alt="" width="32" height="32">Penyola</a>
    <nav aria-label="Main">{nav}</nav>
  </div>
</header>
<main>
{main}
</main>
<footer class="foot">
  <div class="wrap foot-inner">
    <p><strong>Penyola</strong> · offline guides to Beijing's imperial sights<br>
    Support: <a href="mailto:{EMAIL}">{EMAIL}</a></p>
    <p><a href="support.html">Support</a> · <a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Use</a> · <a href="credits.html">Credits</a></p>
    <p class="fine">Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>. Penyola is an independent guide and is not affiliated with the management of these sites. © 2026 Hong Ning.</p>
  </div>
</footer>
</body>
</html>
'''


def store_button(extra=''):
    return f'''<a class="store{extra}" href="{APP_STORE}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.27-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.84c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28z"/></svg><span><small>Download on the</small>App Store</span></a>'''


GUIDES = [
    ('jingshan', 'Jingshan Park', 'Free', 'Climb to the hilltop pavilions for the classic view over the Forbidden City.'),
    ('forbiddencity', 'Forbidden City', 'Unlock All Guides', 'Courtyards, halls, carved guardians and the stories behind them, with routes for a short visit or a full day.'),
    ('summerpalace', 'Summer Palace', 'Unlock All Guides', 'Kunming Lake, Longevity Hill and the Long Corridor, with walking routes around the lake.'),
]

SHOTS = [
    ('02', 'Every detail has a story', 'Lions, cranes and roof beasts, each with its own page on the map.'),
    ('03', 'Listen as you explore', 'Narrated audio stories in English for every highlight.'),
    ('04', 'Routes that fit your time', 'Walking times, distances and stops, planned for you.'),
    ('05', 'See what others walk past', 'Small treasures beside the famous halls.'),
    ('06', 'No signal? No problem.', 'Maps, stories and audio live on your phone.'),
]

guides = ''.join(f'''
    <article class="guide">
      <img src="assets/img/map-{key}.webp" alt="Hand-drawn map of {name}" loading="lazy" width="1000" height="{h}">
      <div class="guide-text">
        <p class="tag{' free' if tag == 'Free' else ''}">{tag}</p>
        <h3>{name}</h3>
        <p>{text}</p>
      </div>
    </article>''' for (key, name, tag, text), h in zip(GUIDES, (1202, 1250, 1168)))

shots = ''.join(f'''
      <figure><img src="assets/img/shot-{n}.webp" alt="{cap}. {sub}" loading="lazy" width="720" height="1564"></figure>'''
                for n, cap, sub in SHOTS)

HOME = f'''
<section class="hero">
  <div class="wrap hero-inner">
    <div class="hero-text">
      <p class="eyebrow">Offline guide · Beijing</p>
      <h1>Beijing's imperial sights, beautifully drawn.</h1>
      <p class="lede">Penyola is an English guide for international visitors to Jingshan Park, the Forbidden City and the Summer Palace. Hand-drawn maps, narrated stories and ready-made walking routes, all stored on your iPhone so they work without a connection.</p>
      <div class="cta">{store_button()}<a class="text-link" href="#guides">See the guides ↓</a></div>
      <p class="note">Free to download. Jingshan Park is free; one purchase unlocks the rest.</p>
    </div>
    <div class="hero-phone"><img src="assets/img/hero.webp" alt="Penyola showing the hand-drawn Forbidden City map" width="530" height="1118"></div>
  </div>
</section>

<section class="band" id="guides">
  <div class="wrap">
    <p class="eyebrow">Three guides</p>
    <h2>One app, three of Beijing's great sites</h2>
    <div class="guides">{guides}
    </div>
  </div>
</section>

<section class="band alt">
  <div class="wrap">
    <p class="eyebrow">What's inside</p>
    <h2>Made for walking around, not reading at home</h2>
    <ul class="features">
      <li><strong>Hand-drawn maps</strong> you can pinch and explore</li>
      <li><strong>129 illustrated highlights</strong>, each with its own story</li>
      <li><strong>150+ audio stories</strong> in two English voices</li>
      <li><strong>Suggested routes</strong> with walking times between stops</li>
      <li><strong>Visitor information</strong>: opening hours, ticket notes and entrances</li>
      <li><strong>A Chinese address card</strong> to show your taxi driver</li>
      <li><strong>Fully offline</strong>: no account, no sign-in, no ads</li>
    </ul>
    <div class="shots" tabindex="0" aria-label="App screenshots">{shots}
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap price">
    <div>
      <p class="eyebrow">Pay once</p>
      <h2>Free to start. One purchase for every guide.</h2>
      <p>Jingshan Park is free and complete. You can open the Forbidden City and Summer Palace maps before you buy. A single in-app purchase, <strong>Unlock All Guides</strong>, unlocks their stories, audio and routes, plus every guide added later.</p>
      <p>No subscription and nothing renews. The price is US$6.99 in the United States; the App Store shows the price in your local currency.</p>
      <div class="cta">{store_button()}</div>
    </div>
    <img class="price-shot" src="assets/img/shot-07.webp" alt="The Unlock All Guides purchase screen" loading="lazy" width="720" height="1564">
  </div>
</section>
'''

SUPPORT = f'''
<section class="doc wrap">
  <h1>Support</h1>
  <p class="lede">Questions, problems or feedback: write to <a href="mailto:{EMAIL}">{EMAIL}</a>. We usually reply within two business days.</p>
  <p>If something isn't working, it helps to tell us your iPhone model, iOS version and which guide you were using.</p>

  <h2>Frequently asked questions</h2>

  <details open><summary>Does Penyola work offline?</summary>
  <p>Yes. All maps, texts and audio are included in the app when you install it, so nothing needs to be downloaded at the site. You only need an internet connection to buy or restore the purchase.</p></details>

  <details><summary>What is free, and what do I pay for?</summary>
  <p>The app is free to download and the Jingshan Park guide is free and complete. The Forbidden City and Summer Palace show a map preview. One non-consumable in-app purchase, <strong>Unlock All Guides</strong>, unlocks their stories, audio and routes, and covers guides added later. It is a one-time purchase, not a subscription.</p></details>

  <details><summary>How do I buy Unlock All Guides?</summary>
  <p>On the home screen, open the Forbidden City (or the Summer Palace), tap <strong>Open guide map</strong>, then tap <strong>Unlock full guide</strong> at the bottom of the map. Apple's purchase sheet handles the payment; Penyola never sees your payment details.</p></details>

  <details><summary>How do I restore my purchase on a new iPhone?</summary>
  <p>Sign in with the same Apple Account you bought with. Tap the gear icon on the home screen, open <strong>Purchases &amp; restore</strong> and tap <strong>Restore Purchases</strong>. The Restore button is also on the purchase sheet.</p></details>

  <details><summary>Does Penyola use my location?</summary>
  <p>No. Penyola never asks for location access. You follow the map and choose stops yourself.</p></details>

  <details><summary>In which countries is Penyola available?</summary>
  <p>Penyola is on the App Store in every region except mainland China, Hong Kong and Taiwan. The app is the same everywhere: all content is in English and works offline. It runs on iPhone.</p></details>

  <details><summary>Are opening hours and tickets always up to date?</summary>
  <p>We check them carefully, but sites change their hours, routes and closures. Always follow official signs and staff on the day.</p></details>

  <details><summary>I found a mistake in a guide.</summary>
  <p>Thank you. Please email us with the guide, the place and what looks wrong, and we'll fix it in an update.</p></details>
</section>
'''


def legal_page(main_html, extra_class='legal'):
    return f'<section class="doc wrap {extra_class}">\n{main_html}\n</section>'


pages = {
    'index.html': ("Penyola – Offline guide to Beijing's imperial sights",
                   'Hand-drawn maps, audio stories and walking routes for Jingshan Park, the Forbidden City and the Summer Palace. Works offline. Jingshan Park is free.',
                   HOME, 'home'),
    'support.html': ('Support – Penyola', 'Contact Penyola support and answers to common questions about offline use, purchases and restoring.', SUPPORT, ''),
    'privacy.html': ('Privacy Policy – Penyola', 'Penyola collects no data: no accounts, no analytics, no ads.', legal_page(legal_body('privacy')), ''),
    'terms.html': ('Terms of Use – Penyola', 'Terms of use for the Penyola app.', legal_page(legal_body('terms')), ''),
    'credits.html': ('Credits – Penyola', 'Content credits, map data attribution and open-source notices for Penyola.',
                     legal_page(legal_body('content-credits') + '\n<hr>\n' + legal_body('notice')), ''),
}
for file, (title, desc, main, cls) in pages.items():
    (SITE / file).write_text(page(file, title, desc, main, cls))
(SITE / '.nojekyll').write_text('')
print(json.dumps(sorted(pages)))
