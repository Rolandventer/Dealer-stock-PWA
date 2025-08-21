# AutoSLM Stock PWA

A lightweight Progressive Web App that displays vehicle stock from an XML feed.

**Feed URL**:  
`https://www.dealerhub.net/workspace/zaexports/autoslmcustomstockfeed/autoslmcustomstockfeedXquisiteUmhlanga.xml`

## Features
- Installable on Android and iOS (Add to Home Screen on iOS).
- Landing screen with a vehicle icon → tap to open stock list.
- Stock list shows each vehicle card with a border, displaying the `<TITLE>` and the first image.
- Tap the title or image to open full details: **all fields** parsed from the XML and an **image gallery**.
- Back button at the top.
- Offline app-shell via Service Worker; network-first for the feed so stock stays fresh.

## Quick start (local)
1. Serve the folder with any static server (e.g., `python3 -m http.server 8080`).
2. Open `http://localhost:8080`.
3. Click **View Vehicle Stock**. If you see a CORS error, set up a proxy (see below).

## Deploy to GitHub & DigitalOcean
- Commit these files to a GitHub repository.
- Deploy to a DigitalOcean App / Droplet as **static site** (Nginx).

### Important: CORS on the XML feed
Many third-party XML endpoints do **not** send `Access-Control-Allow-Origin` headers. If the browser blocks direct reads, add a tiny reverse-proxy on your server so the request is same-origin.

**Nginx snippet** (serve the site at `/` and proxy the XML at `/stock.xml`):
```nginx
location = /stock.xml {
  resolver 1.1.1.1 ipv6=off;
  proxy_set_header Host www.dealerhub.net;
  proxy_pass https://www.dealerhub.net/workspace/zaexports/autoslmcustomstockfeed/autoslmcustomstockfeedXquisiteUmhlanga.xml;
  add_header Access-Control-Allow-Origin *;
  add_header Cache-Control "no-cache";
}
```

Then in `app.js`, change:
```js
const FEED_URL = "/stock.xml";
```

## iOS install notes
- iOS supports "Add to Home Screen" and uses `apple-touch-icon`. This project includes `assets/apple-touch-icon.png`.
- PWA install prompts differ from Android; users add manually via Share → Add to Home Screen.

## Structure
```
/index.html
/styles.css
/app.js
/manifest.webmanifest
/service-worker.js
/assets/icon-192.png
/assets/icon-512.png
/assets/apple-touch-icon.png
```

## How vehicle parsing works
- The app searches the XML for elements that have a direct child `<TITLE>` and treats each such element as a vehicle record.
- It collects **all** child nodes (key/value) and **any `<IMAGE*>`** fields to build the gallery.
- The list page shows the `<TITLE>` and the **first image**; tapping opens a details page showing all fields and a gallery.

If your feed uses different field names (e.g., `IMAGE_URL_1`, `IMG1`), update the image key detection in `normalizeVehicle()`.

## License
MIT