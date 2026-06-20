# public/potree

This directory must contain a **build of the Potree Viewer library**
(JS + CSS + its dependencies). It is intentionally **not** committed to
version control or bundled via npm, because:

1. Potree is distributed as classic global scripts (it registers `Potree`,
   `THREE`, `$`, etc. on `window`), not as ES modules / npm packages
   designed for bundling into a Next.js app.
2. The build output is large (several MB of JS/CSS/workers) and changes
   independently of this application's source code.

## Expected directory layout

After setup, this directory should look like:

```
public/potree/
├── build/
│   └── potree/
│       ├── potree.js
│       └── potree.css
└── libs/
    ├── jquery/jquery-3.1.1.min.js
    ├── jquery-ui/jquery-ui.min.js
    ├── jquery-ui/jquery-ui.min.css
    ├── spectrum/spectrum.js
    ├── spectrum/spectrum.css
    ├── three.js/build/three.js
    ├── other/BinaryHeap.js
    ├── tween/tween.min.js
    ├── d3/d3.js
    ├── proj4/proj4.js
    ├── openlayers3/ol.js
    ├── openlayers3/ol.css
    ├── i18next/i18next.js
    └── jstree/
        ├── jstree.js
        └── themes/mixed/style.css
```

This mirrors the official Potree repository's own `build/` and `libs/`
folders. The simplest way to populate it is to build (or download a
release of) Potree itself and copy those two folders here.

## How to obtain these files

### Option A — Build from source (recommended, matches upstream exactly)

```bash
git clone https://github.com/potree/potree.git
cd potree
npm install
npm run build
```

This produces `./build/potree/` (containing `potree.js` and `potree.css`)
and uses the dependencies already vendored under `./libs/` in the cloned
repository. Copy both folders into this project:

```bash
# from the potree repo you just built:
cp -r build  /path/to/point-cloud-viewer/public/potree/build
cp -r libs   /path/to/point-cloud-viewer/public/potree/libs
```

On Windows (PowerShell), from inside the cloned `potree` folder:

```powershell
Copy-Item -Recurse -Force .\build  ..\point-cloud-viewer\public\potree\build
Copy-Item -Recurse -Force .\libs   ..\point-cloud-viewer\public\potree\libs
```

### Option B — Use a tagged release archive

Download a release/tag archive from
`https://github.com/potree/potree` (see the Releases page) and copy its
`build/` and `libs/` directories the same way.

## Verifying the install

Start the dev server and open any "ready" dataset's viewer page. If the
files are missing or incomplete, the viewer panel will display:

> Failed to load viewer — Failed to load script: /potree/...

The error message names the exact missing file/path, which tells you
which file under `public/potree/` is missing or misnamed.
