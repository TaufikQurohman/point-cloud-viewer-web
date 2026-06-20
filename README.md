# Universal Point Cloud Viewer

A local, filesystem-only web application for converting and visualizing
point cloud datasets. Upload a LAS, LAZ, E57, PLY, PTS, or XYZ file; the
app normalizes it with **PDAL** (when needed), converts it to a streamable
octree with **PotreeConverter**, and renders it in-browser with
**Potree Viewer**.

Built for an academic Kerja Praktek (work placement) project. No database,
no authentication, no cloud deployment — everything runs locally and
stores data on disk.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Windows Setup — PDAL](#windows-setup--pdal)
6. [Windows Setup — PotreeConverter](#windows-setup--potreeconverter)
7. [Potree Viewer Library Setup](#potree-viewer-library-setup)
8. [Installation](#installation)
9. [Environment Configuration](#environment-configuration)
10. [Running the App](#running-the-app)
11. [Example Dataset Workflow](#example-dataset-workflow)
12. [API Reference](#api-reference)
13. [Storage Layout](#storage-layout)
14. [Troubleshooting](#troubleshooting)

---

## Architecture

```
User
 ↓ upload file
Validation Layer (format + size check)
 ↓
Preprocessing Layer (PDAL)         — only for E57 / PLY / PTS / XYZ
 ↓
Normalized LAZ Dataset
 ↓
PotreeConverter
 ↓
Potree Dataset (metadata.json, octree.bin, hierarchy.bin)
 ↓
Filesystem Storage (storage/converted/{datasetId}/)
 ↓
Potree Viewer (browser, via /api/v1/storage/converted/...)
```

LAS/LAZ files skip the PDAL step and go directly to PotreeConverter.
All other supported formats are normalized to LAZ by PDAL first.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|--------------------------------------|
| Frontend     | Next.js (App Router), TypeScript, TailwindCSS |
| Backend      | Next.js Route Handlers (API)        |
| Conversion   | PDAL (CLI), PotreeConverter (CLI)   |
| Viewer       | Potree Viewer (WebGL)               |
| Storage      | Local filesystem only               |
| Database     | None                                |

---

## Project Structure

```
point-cloud-viewer/
├── src/
│   ├── app/
│   │   ├── page.tsx                       # Home page
│   │   ├── layout.tsx                     # Root layout + nav
│   │   ├── globals.css
│   │   ├── upload/page.tsx                # Upload Page
│   │   ├── datasets/page.tsx              # Dataset List Page
│   │   ├── viewer/[id]/page.tsx           # Dataset Viewer Page
│   │   └── api/v1/
│   │       ├── upload/route.ts            # POST /api/v1/upload
│   │       ├── datasets/route.ts          # GET /api/v1/datasets
│   │       ├── datasets/[id]/route.ts     # GET, DELETE /api/v1/datasets/[id]
│   │       └── storage/converted/[...path]/route.ts  # serves Potree assets
│   ├── components/
│   │   ├── NavBar.tsx
│   │   ├── FileDropZone.tsx
│   │   ├── StatusBadge.tsx
│   │   └── PotreeViewer.tsx               # Potree Viewer React wrapper
│   └── lib/
│       ├── config/index.ts                # centralized env config
│       ├── types/index.ts                 # shared TypeScript types
│       ├── services/
│       │   ├── process-runner.ts          # reusable child_process spawn wrapper
│       │   ├── pdal.service.ts            # PDAL conversion service
│       │   ├── potree.service.ts          # PotreeConverter service
│       │   └── dataset.service.ts         # pipeline orchestration
│       └── utils/
│           ├── fs.ts                      # filesystem helpers
│           ├── slug.ts                    # dataset naming rules
│           ├── logger.ts                  # structured JSONL logger
│           ├── validation.ts              # upload validation
│           └── script-loader.ts           # Potree script/style injector
├── public/
│   └── potree/                            # vendored Potree library (see setup)
├── storage/
│   ├── uploads/                           # original uploaded files
│   ├── normalized/                        # PDAL output (.laz)
│   ├── converted/{datasetId}/             # Potree datasets + record.json
│   ├── temp/                              # scratch space
│   └── logs/{datasetId}.log               # structured JSONL logs
├── scripts/
│   ├── verify-storage.js                  # postinstall: ensures storage/ exists
│   └── check-tools.js                     # diagnostics for PDAL/PotreeConverter
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

---

## Prerequisites

- **Windows 10/11** (primary supported OS per project scope)
- **Node.js ≥ 20** — https://nodejs.org
- **PDAL** (CLI) — for E57/PLY/PTS/XYZ conversion
- **PotreeConverter** (CLI) — for generating the Potree octree
- 8 GB RAM minimum
- Chrome or Edge (WebGL2 required for Potree Viewer)

---

## Windows Setup — PDAL

PDAL does not ship a simple Windows installer; the most reliable route is
via **conda** (Miniconda/Anaconda) using the `conda-forge` channel.

1. Install Miniconda for Windows: https://docs.conda.io/en/latest/miniconda.html
2. Open **"Anaconda Prompt"** from the Start Menu and run:

   ```powershell
   conda create -n pdal-env -c conda-forge pdal python=3.11
   conda activate pdal-env
   pdal --version
   ```

3. Locate the PDAL executable. It is typically at:

   ```
   C:\Users\<you>\miniconda3\envs\pdal-env\Library\bin\pdal.exe
   ```

4. Point this project at it via `.env.local`:

   ```
   PDAL_BIN=C:\Users\<you>\miniconda3\envs\pdal-env\Library\bin\pdal.exe
   ```

   Alternatively, add that `Library\bin` folder to your Windows `PATH`
   environment variable and simply set `PDAL_BIN=pdal`.

**Verify it works** from a plain (non-Anaconda) terminal/PowerShell window,
since that's the environment Next.js's dev server will actually run in:

```powershell
& "C:\Users\<you>\miniconda3\envs\pdal-env\Library\bin\pdal.exe" --version
```

---

## Windows Setup — PotreeConverter

1. Download the latest Windows release from:
   https://github.com/potree/PotreeConverter/releases
   (look for an asset like `PotreeConverter_x.x_windows_x64.zip`)
2. Extract it to a permanent location, e.g. `C:\Tools\PotreeConverter\`
3. The extracted folder contains `PotreeConverter.exe` plus a `resources\`
   directory — keep them together; `PotreeConverter.exe` depends on files
   in `resources\`.
4. Point this project at it via `.env.local`:

   ```
   POTREE_CONVERTER_BIN=C:\Tools\PotreeConverter\PotreeConverter.exe
   ```

5. Test it directly from PowerShell:

   ```powershell
   & "C:\Tools\PotreeConverter\PotreeConverter.exe" --help
   ```

---

## Potree Viewer Library Setup

The browser-side viewer (`Potree.js` + CSS + its bundled dependencies)
must be placed under `public/potree/`. Full instructions, including the
exact expected folder layout, are in
[`public/potree/README.md`](./public/potree/README.md).

Quick version:

```bash
git clone https://github.com/potree/potree.git
cd potree
npm install
npm run build
```

Then copy the resulting `build/` and `libs/` folders into
`public/potree/build/` and `public/potree/libs/` in this project.

---

## Installation

```bash
git clone <this-repository-url>
cd point-cloud-viewer
npm install
```

`npm install` automatically runs `scripts/verify-storage.js`, which
creates the `storage/uploads`, `storage/normalized`, `storage/converted`,
`storage/temp`, and `storage/logs` directories if they don't exist.

Then copy the environment template and adjust paths for your machine:

```bash
copy .env.example .env.local
```

(on macOS/Linux: `cp .env.example .env.local`)

Edit `.env.local` and set `PDAL_BIN` and `POTREE_CONVERTER_BIN` to the
full paths from the Windows setup steps above.

Verify both tools are reachable:

```bash
npm run check-tools
```

You should see `[OK]` for both PDAL and PotreeConverter before continuing.

---

## Environment Configuration

All configuration lives in `.env.local` (see `.env.example` for the full,
documented list). Key variables:

| Variable                  | Default            | Description |
|----------------------------|--------------------|--------------|
| `PDAL_BIN`                 | `pdal`             | Path to the PDAL executable |
| `POTREE_CONVERTER_BIN`     | `PotreeConverter`  | Path to the PotreeConverter executable |
| `STORAGE_ROOT`             | `./storage`        | Root folder for all filesystem storage |
| `MAX_UPLOAD_SIZE_BYTES`    | `2147483648` (2 GB)| Maximum accepted upload size |
| `PROCESS_TIMEOUT_MS`       | `1800000` (30 min) | Max runtime per PDAL/PotreeConverter invocation |
| `LOG_LEVEL`                | `info`             | `debug` \| `info` \| `warn` \| `error` |

---

## Running the App

```bash
npm run dev
```

Open **http://localhost:3000** in Chrome or Edge.

For a production-style run:

```bash
npm run build
npm run start
```

---

## Example Dataset Workflow

This walks through converting a sample E57 scan end-to-end.

1. Go to **http://localhost:3000/upload**.
2. Drag in `campus_scan.e57` (or click to browse).
3. Click **Upload & Convert**. The page shows:
   - `Uploading file` → `Validating & converting (PDAL → PotreeConverter)`
4. Behind the scenes:
   - File is saved to `storage/uploads/campus_scan.e57`
   - PDAL runs: `pdal translate storage/uploads/campus_scan.e57 storage/normalized/campus-scan.laz`
   - PotreeConverter runs: `PotreeConverter storage/normalized/campus-scan.laz -o storage/converted/campus-scan`
   - A structured log is written to `storage/logs/campus-scan.log`
5. On success, the page shows **"Dataset `campus-scan` is ready to view"**
   with an **Open in Viewer** button.
6. Click it (or go to **/datasets** and click **View**) to open
   **http://localhost:3000/viewer/campus-scan**, where Potree Viewer loads
   `metadata.json`, automatically fits the camera to the point cloud, and
   lets you orbit, pan, and zoom with the mouse.
7. To remove the dataset later, go to **/datasets** and click **Delete** —
   this removes the uploaded source, the normalized LAZ, and the
   converted Potree output from disk.

If PDAL or PotreeConverter fails (e.g. a corrupted input file), the
Upload Page shows the error message returned by the API, and the full
stdout/stderr from the failing tool is recorded in
`storage/logs/{datasetId}.log` for debugging.

---

## API Reference

### `POST /api/v1/upload`

`multipart/form-data` with a single field `file`.

**Success (200):**
```json
{
  "success": true,
  "dataset_id": "campus-scan",
  "status": "ready",
  "metadata_url": "/api/v1/storage/converted/campus-scan/metadata.json"
}
```

**Failure (4xx/5xx):**
```json
{ "success": false, "error": "Unsupported file format: \".obj\". Supported formats: las, laz, e57, ply, pts, xyz" }
```

### `GET /api/v1/datasets`

Returns an array of all known datasets:
```json
[
  {
    "dataset_id": "campus-scan",
    "status": "ready",
    "original_file_name": "campus_scan.e57",
    "created_at": "2026-06-20T04:55:43.309Z",
    "updated_at": "2026-06-20T04:55:43.393Z"
  }
]
```

### `GET /api/v1/datasets/{datasetId}`

```json
{
  "success": true,
  "dataset_id": "campus-scan",
  "status": "ready",
  "metadata_url": "/api/v1/storage/converted/campus-scan/metadata.json",
  "original_file_name": "campus_scan.e57",
  "created_at": "2026-06-20T04:55:43.309Z",
  "updated_at": "2026-06-20T04:55:43.393Z"
}
```

404 if not found:
```json
{ "success": false, "error": "Dataset \"campus-scan\" not found" }
```

### `DELETE /api/v1/datasets/{datasetId}`

```json
{ "success": true }
```

---

## Storage Layout

```
storage/
├── uploads/{datasetId}.{ext}        # original uploaded file
├── normalized/{datasetId}.laz       # PDAL output (skipped for direct LAS/LAZ)
├── converted/{datasetId}/
│   ├── metadata.json
│   ├── octree.bin
│   ├── hierarchy.bin
│   └── record.json                  # dataset status record (this project's "DB")
├── temp/                            # reserved scratch space
└── logs/{datasetId}.log             # JSONL structured logs
```

Because there is no database, `record.json` inside each dataset's
`converted/` folder is the single source of truth for that dataset's
status, timestamps, and any error message. The `/api/v1/datasets*`
endpoints work by scanning this directory and reading those files.

---

## Troubleshooting

**"PDAL conversion failed" / "Potree conversion failed"**
Run `npm run check-tools` to confirm both executables are reachable, then
check `storage/logs/{datasetId}.log` for the exact stderr output from the
failing tool.

**Viewer shows "Failed to load viewer — Failed to load script: ..."**
The Potree library files aren't fully installed under `public/potree/`.
See [Potree Viewer Library Setup](#potree-viewer-library-setup) and
[`public/potree/README.md`](./public/potree/README.md).

**Upload hangs on large files**
Increase `PROCESS_TIMEOUT_MS` in `.env.local` for very large point
clouds, and confirm you have at least 8 GB RAM free.

**"metadata.json not found"**
PotreeConverter ran but didn't produce output — usually an input format
PotreeConverter itself can't parse. Check the corresponding dataset log
in `storage/logs/`.
