# AI Document Hub

A Snowflake App Runtime (SAR) application that showcases Cortex AI capabilities for document intelligence. Built with Next.js and deployed as an APPLICATION SERVICE on Snowflake SPCS.


## Features

| Feature | Cortex AI Function | Description |
|---------|-------------------|-------------|
| **Semantic Search** | `SEARCH_PREVIEW` (Cortex Search) | Search indexed documents by meaning, not just keywords |
| **Live Document Parse** | `AI_PARSE_DOCUMENT` (OCR mode) | Upload PDF/image/docx → extract text content |
| **AI Extract** | `AI_EXTRACT` | Extract structured fields (name, amount, date…) from text |
| **Document Library** | `GET_PRESIGNED_URL` | Browse, download, and delete indexed documents |
| **RAG Ingestion** | Text chunking → INSERT | Parse → chunk → save to Snowflake for Cortex Search indexing |

### Parse → Extract Pipeline

```
Upload file → PUT @STAGE → AI_PARSE_DOCUMENT(OCR) → AI_EXTRACT([fields])
                                    ↓
                          Save to Snowflake (RAG_DOCUMENTS + RAG_CHUNKS)
                                    ↓
                          Cortex Search indexes new chunks
```

## Quick Start (Customer Deployment)

Deploy into your own Snowflake account in 4 steps (about 10 minutes). No local build is
needed. Snowflake builds and runs the app for you.

### Prerequisites

| Requirement | Notes |
|---|---|
| Snowflake account with Snowflake App Runtime and Cortex AI enabled | Tested on `cn-northwest-1`; works in any region with `AI_PARSE_DOCUMENT`, `AI_EXTRACT`, Cortex Search |
| Role `ACCOUNTADMIN` (or a role that can create databases, warehouses, and application services) | Used for setup and deploy |
| [Snowflake CLI](https://docs.snowflake.com/en/developer-guide/snowflake-cli/installation/installation) (`snow`) with the `snow app` command | Check with `snow app --help` |
| git | To clone this repo |

> Node.js is **not** required. `npm ci` and `next build` run inside Snowflake.

### Step 1: Clone

```bash
git clone https://github.com/sallychensnow/ai-doc-hub.git
cd ai-doc-hub
```

### Step 2: Configure a CLI connection

Add to `~/.snowflake/connections.toml` (or run `snow connection add`):

```toml
[my-connection]
account   = "<org>-<account>"        # e.g. myorg-myaccount (China: myorg-myaccount.cn-northwest-1)
user      = "<user>"
authenticator = "externalbrowser"     # or "snowflake" + password, or key-pair
role      = "ACCOUNTADMIN"
warehouse = "AI_DOC_WH"
```

Test it: `snow connection test --connection my-connection`

### Step 3: Create Snowflake objects

```bash
snow sql -f setup.sql --connection my-connection
```

[`setup.sql`](setup.sql) is idempotent (`IF NOT EXISTS`). Re-running it never drops data. It creates:

| Object | Purpose |
|---|---|
| `AI_DOC_WH` (XS, auto-suspend 60s) | Query warehouse for the app and Cortex Search |
| `SNOWFLAKE_APPS` database | Hosts the app. A **standard** database, so the app can be shared with other roles (personal `USER$` databases cannot) |
| `AI_DOC_HUB.RAG_CORTEX.RAG_PDF_STAGE` | Internal stage (SSE encryption + directory table) for original files |
| `AI_DOC_HUB.RAG_CORTEX.RAG_DOCUMENTS` / `RAG_CHUNKS` | Document metadata and text chunks |
| `AI_DOC_HUB.RAG_CORTEX.TEST` | Cortex Search Service over `RAG_CHUNKS.CHUNK_TEXT` (`snowflake-arctic-embed-l-v2.0`) |

> The app code references these exact names. Keep them unchanged unless you also update the SQL in `app/api/*/route.ts` and `lib/config.ts` (`DATA_SCHEMA`).

### Step 4: Deploy

**4a. Check `snowflake.yml`**

If you ran `setup.sql` unchanged, **no edits are needed**. Otherwise update the fields below
(they are also marked `[CHANGE IF NEEDED]` in [`snowflake.yml`](snowflake.yml)):

| Field | Default | Change when |
|---|---|---|
| `identifier.name` | `AI_DOC_HUB` | You want a different app name, or deploy a second copy |
| `identifier.database` | `SNOWFLAKE_APPS` | You host apps in another database. It must already exist and must **not** be a personal `USER$` database (those can't be shared) |
| `identifier.schema` | `PUBLIC` | You use another schema in that database |
| `query_warehouse` | `AI_DOC_WH` | You want an existing warehouse instead. The deploy role needs `USAGE` on it |
| `code_workspace` | `SNOWFLAKE_APPS.PUBLIC.SNOWFLAKE_APPS` | Always keep `<database>.<schema>` the same as `identifier` (the last part is the workspace name, created automatically) |

> **Data location is separate.** `snowflake.yml` controls where the *app* runs. The app's *data*
> (stage, tables, Cortex Search) lives in `AI_DOC_HUB.RAG_CORTEX`. To move the data, change
> `DATA_SCHEMA` in [`lib/config.ts`](lib/config.ts) **and** every `AI_DOC_HUB.RAG_CORTEX` in `setup.sql`.
> If you change the warehouse name, also update `CREATE WAREHOUSE` and `WAREHOUSE =` in `setup.sql`.

Example: deploying to an existing `ANALYTICS_APPS.DEMO` schema with warehouse `COMPUTE_WH`:

```yaml
    identifier:
      name: AI_DOC_HUB
      database: ANALYTICS_APPS
      schema: DEMO
    query_warehouse: COMPUTE_WH
    code_workspace: ANALYTICS_APPS.DEMO.SNOWFLAKE_APPS
```

**4b. Run deploy**

```bash
snow app deploy --connection my-connection
```

Deploy uploads the source, builds it remotely, and creates the APPLICATION SERVICE
`SNOWFLAKE_APPS.PUBLIC.AI_DOC_HUB`. It takes about 3–5 minutes and finishes with:

```
App ready at https://<id>.snowflake-app.<domain>
```

Open the URL and sign in with your Snowflake user. To redeploy after code changes, run the same command again (in-place upgrade).

### Step 5 (optional): Share with other users

The app runs with **owner's rights**: queries execute as the role that deployed it, so viewers
don't need privileges on `AI_DOC_HUB`. They only need access to the app:

```sql
GRANT USAGE ON DATABASE SNOWFLAKE_APPS TO ROLE <ROLE>;
GRANT USAGE ON SCHEMA SNOWFLAKE_APPS.PUBLIC TO ROLE <ROLE>;
GRANT USAGE ON APPLICATION SERVICE SNOWFLAKE_APPS.PUBLIC.AI_DOC_HUB TO ROLE <ROLE>;
```

### Try it

1. **Live Parse**: upload a file from [`samples/`](samples), for example `invoice_sample.txt` or `inventory_report_sep2026.pdf`.
2. Click a preset (Invoice / Inventory / …) → **Extract** → **Save to Knowledge Base**.
3. **Search**: query the content you just saved. Cortex Search picks up new chunks within ~1 minute (`TARGET_LAG`).
4. **Documents**: download / delete. **Clean up unsaved files** removes files parsed more than 60 min ago that were never saved.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot grant privileges on application service ... personal database` | The app was deployed to `USER$...`. Keep `database: SNOWFLAKE_APPS` in `snowflake.yml` and redeploy |
| `Database 'SNOWFLAKE_APPS' does not exist` during deploy | Run Step 3 first, with the **same** connection |
| `invalid value ... for property 'EMBEDDING_MODEL'` | The model isn't available in your region. Change it in `setup.sql` (e.g. `snowflake-arctic-embed-m-v1.5`) |
| Uploaded files not visible in Snowsight stage browser | Snowsight reads the directory table. The app refreshes it automatically; for manual PUTs run `ALTER STAGE AI_DOC_HUB.RAG_CORTEX.RAG_PDF_STAGE REFRESH;` |
| Search returns nothing right after saving | Wait for the Cortex Search refresh (`TARGET_LAG = '1 minute'`) |
| App logs | `SELECT SYSTEM$GET_APPLICATION_SERVICE_LOGS('SNOWFLAKE_APPS.PUBLIC.AI_DOC_HUB');` (requires MONITOR) |

### Uninstall

```sql
DROP APPLICATION SERVICE IF EXISTS SNOWFLAKE_APPS.PUBLIC.AI_DOC_HUB;
DROP DATABASE IF EXISTS AI_DOC_HUB;        -- deletes all documents and the stage
DROP WAREHOUSE IF EXISTS AI_DOC_WH;
```

## Project Structure

```
ai-doc-hub/
├── app/
│   ├── page.tsx              # Home — feature cards
│   ├── search/page.tsx       # Semantic search (Cortex Search)
│   ├── documents/page.tsx    # Document library with download/delete
│   ├── extract/page.tsx      # AI Extract playground
│   ├── parse/page.tsx        # Live Parse → Extract → Save pipeline
│   └── api/
│       ├── overview/route.ts # KPI stats
│       ├── search/route.ts   # SEARCH_PREVIEW wrapper
│       ├── documents/route.ts# Document listing with presigned URLs
│       ├── extract/route.ts  # AI_EXTRACT wrapper
│       ├── parse/route.ts    # File upload → AI_PARSE_DOCUMENT
│       ├── ingest/route.ts   # Chunk text → INSERT into RAG tables
│       ├── download/route.ts # Proxy download with original filename
│       ├── delete/route.ts   # Delete doc + chunks + stage file
│       └── cleanup/route.ts  # Preview/remove unsaved _parse_temp files
├── components/
│   ├── app-header.tsx        # Navigation bar
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── snowflake.ts          # Snowflake Node.js SDK wrapper
│   ├── stage.ts              # Stage helpers: safe paths, REMOVE, directory REFRESH
│   └── constants.ts          # App title and branding
├── samples/                  # Sample files for testing parse
├── setup.sql                 # One-time Snowflake object setup
├── app.yml                   # SAR build/run manifest
├── snowflake.yml             # Deployment target config
└── package.json
```

## Supported File Types

For `AI_PARSE_DOCUMENT` (Live Parse):
- PDF, PNG, JPG/JPEG, TIFF, TXT, DOCX, DOC, PPTX, GIF, BMP, WEBP

## Key Implementation Notes

- **Stage layout**: Live Parse uploads go to `_parse_temp/<id>_<original name>.<ext>` (original name kept, CJK allowed). Legacy pre-loaded docs are `<FILE_HASH>.pdf`. `RAG_DOCUMENTS.STAGE_FILE_PATH` records the real location; download and delete use it.
- **Directory table**: The app runs `ALTER STAGE ... REFRESH` after every PUT/REMOVE so Snowsight and `DIRECTORY()` stay in sync.
- **Unsaved files**: Parsed-but-not-saved files stay on the stage until **Clean up unsaved files** (or `POST /api/cleanup`) removes those older than 60 minutes and not referenced by `RAG_DOCUMENTS`.
- **AI_PARSE_DOCUMENT syntax**: Must use `{'mode': 'OCR'}` (JSON object), not `'OCR'` (string).
- **AI_EXTRACT field names**: Must be unique — the API deduplicates automatically.
- **Text chunking**: ~1000 chars with 100 char overlap, breaking at paragraph/sentence boundaries (supports Chinese `。` sentence endings).
- **Presigned URLs**: Generated via `GET_PRESIGNED_URL(@STAGE, relative_path, expiry_seconds)`.

## China Region Notes

This app was built and tested on `cn-northwest-1`. The following Cortex functions are available:
- `AI_EXTRACT` — works
- `AI_PARSE_DOCUMENT` (OCR mode) — works
- `Cortex Search` (SEARCH_PREVIEW) — works
- `AI_PARSE_DOCUMENT` (LAYOUT mode) — not available
- `CORTEX.COMPLETE` — not available

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API routes, Snowflake Node.js SDK
- **AI**: Snowflake Cortex AI (AI_EXTRACT, AI_PARSE_DOCUMENT, Cortex Search)
- **Deployment**: Snowflake App Runtime (SPCS), Snow CLI
