# webwork

WebWork is a build of OpenWork, which is a clone of Claude Cowork, and runs entirely in your browser.

Access latest version online:

- https://webwork.chat
- https://3p3r.github.io/webwork

![webwork-screenshot](./demo.png)

Current status (work in progress):

- Runs entirely offline in-browser, no backend server required.
- Supports local file storage using WebAssembly and persistence with IndexedDB.
- Supports a virtual shell for running commands in-browser through BusyBox.
- Can initially import directories from the user file system.

## development

```sh
# install dependencies
npm install
# build once for prod
npm run build
# optionally start webpack dev server
npm run dev
```

If you build for prod, you can serve it locally with `npm run serve`.

## deployment

Site automatically deploys to GitHub Pages on push to `main` branch.

## license

MIT License. See LICENSE file for details.
