-- =============================================================================
-- AI Document Hub - one-time Snowflake setup
-- Run as ACCOUNTADMIN (or a role with CREATE DATABASE / WAREHOUSE privileges).
-- Every statement is idempotent (IF NOT EXISTS) and safe to re-run.
--
-- The app code expects these exact names:
--   RAG_DEMO.RAG_CORTEX.RAG_PDF_STAGE / RAG_DOCUMENTS / RAG_CHUNKS / TEST
-- =============================================================================

-- 1. Warehouse used by the app and by Cortex Search refreshes
CREATE WAREHOUSE IF NOT EXISTS AI_DOC_HUB_WH
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE
  INITIALLY_SUSPENDED = TRUE;

-- 2. Database that hosts the APPLICATION SERVICE.
--    Must NOT be a personal database (USER$...), otherwise the app cannot be shared.
CREATE DATABASE IF NOT EXISTS SNOWFLAKE_APPS;

-- 3. Data objects used by the app
CREATE DATABASE IF NOT EXISTS RAG_DEMO;
CREATE SCHEMA IF NOT EXISTS RAG_DEMO.RAG_CORTEX;

-- Internal stage holding original files. Server-side encryption is required for
-- AI_PARSE_DOCUMENT / GET_PRESIGNED_URL. The directory table lets Snowsight list files;
-- the app refreshes it after every upload/delete.
CREATE STAGE IF NOT EXISTS RAG_DEMO.RAG_CORTEX.RAG_PDF_STAGE
  ENCRYPTION = (TYPE = 'SNOWFLAKE_SSE')
  DIRECTORY = (ENABLE = TRUE);

CREATE TABLE IF NOT EXISTS RAG_DEMO.RAG_CORTEX.RAG_DOCUMENTS (
  DOCUMENT_ID     VARCHAR PRIMARY KEY,
  FILE_NAME       VARCHAR,
  FILE_HASH       VARCHAR UNIQUE,
  FILE_SIZE       NUMBER,
  TOTAL_PAGES     NUMBER,
  SOURCE          VARCHAR DEFAULT 'app_upload',
  STAGE_FILE_PATH VARCHAR,
  STAGE_FILE_URL  VARCHAR,
  CREATED_AT      TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  UPDATED_AT      TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS RAG_DEMO.RAG_CORTEX.RAG_CHUNKS (
  CHUNK_ID      VARCHAR PRIMARY KEY,
  DOCUMENT_ID   VARCHAR,
  FILE_NAME     VARCHAR,
  CHUNK_INDEX   NUMBER,
  PAGE_NUMBER   NUMBER,
  CHUNK_TEXT    VARCHAR,
  CHUNK_LENGTH  NUMBER,
  CREATED_AT    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- 4. Cortex Search Service over the chunks (hybrid vector + keyword search)
CREATE CORTEX SEARCH SERVICE IF NOT EXISTS RAG_DEMO.RAG_CORTEX.TEST
  ON CHUNK_TEXT
  ATTRIBUTES FILE_NAME, PAGE_NUMBER, CHUNK_ID
  WAREHOUSE = AI_DOC_HUB_WH
  TARGET_LAG = '1 minute'
  EMBEDDING_MODEL = 'snowflake-arctic-embed-l-v2.0'
  AS (
    SELECT CHUNK_TEXT, FILE_NAME, PAGE_NUMBER, CHUNK_ID, DOCUMENT_ID
    FROM RAG_DEMO.RAG_CORTEX.RAG_CHUNKS
  );

-- 5. (Optional) Allow other roles to open the app after deploy:
-- GRANT USAGE ON DATABASE SNOWFLAKE_APPS TO ROLE <ROLE>;
-- GRANT USAGE ON SCHEMA SNOWFLAKE_APPS.PUBLIC TO ROLE <ROLE>;
-- GRANT USAGE ON APPLICATION SERVICE SNOWFLAKE_APPS.PUBLIC.AI_DOC_HUB TO ROLE <ROLE>;
