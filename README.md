# Ma PAL — iPhone app without the App Store

This is your `Ma-PAL-2-lus-1-acheté.tsx` packaged as a **Progressive Web App (PWA)**.
Once added to the iPhone home screen it opens full-screen with its own icon, works offline,
and keeps its data on the phone. No App Store, no Apple developer account, no fees.

## 1. Put it online (free, HTTPS required)

The ready-to-host files are in the `dist/` folder (also delivered as `ma-pal-dist.zip`).
Pick any free static host:

- **Netlify Drop** (easiest): go to app.netlify.com/drop, drag the `dist` folder onto the page.
  Create a free account when asked so the site isn't deleted.
- **Cloudflare Pages**: Workers & Pages → Create → Pages → upload the `dist` folder.
- **GitHub Pages**: push the contents of `dist/` to a repo, Settings → Pages → deploy from branch.
  (The build uses relative paths, so a sub-folder URL like `user.github.io/ma-pal/` works.)

## 2. Install on the iPhone

1. Open the site's URL in **Safari** (on iOS 16.4+ other browsers' Share menu works too).
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Launch it from the "Ma PAL" icon. From then on it runs offline.

## 3. Things to know

- **Data lives on the phone**, in the home-screen app's own storage (separate from Safari's).
  Deleting the icon deletes the data. Hosting it on a different URL starts from empty.
- **Updates**: change `src/App.tsx`, rebuild, re-upload `dist/`. The app picks up the new version
  the next time it's opened with a connection (sometimes after a second launch).
- Keep the same URL forever if you want to keep your data.

## Rebuilding (optional, needs Node.js 20+)

```bash
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # produces dist/
```

### Changes made to the original component
- Inputs are 16px so Safari doesn't zoom in when you tap them.
- Top/bottom padding respects the notch and home bar (`safe-area-inset`).
- Everything else is untouched.
