# AI Document Hub — Solution Overview

> 基于 Snowflake Cortex AI 的智能文档处理平台
> Intelligent Document Processing Platform powered by Snowflake Cortex AI

---

## 1. 项目背景 / Background

### 业务场景

企业每天产生大量非结构化文档（合同、发票、报告、会议记录、医疗报告等）。传统方式下，这些文档的信息提取、搜索和管理依赖人工操作，效率低、易出错。

### 解决方案

AI Document Hub 是一个端到端的智能文档处理应用，完全运行在 Snowflake 平台上，利用 Cortex AI 内置函数实现：

- **文档解析** — 上传 PDF/图片/Word，AI 自动提取文本
- **结构化提取** — 从非结构化文本中提取指定字段（姓名、金额、日期…）
- **语义搜索** — 基于含义（而非关键词）搜索所有已索引文档
- **文档管理** — 浏览、下载、删除已索引的文档

### 核心价值

| 传统方式 | AI Document Hub |
|---------|----------------|
| 人工阅读文档提取信息 | AI_EXTRACT 自动提取结构化字段 |
| 关键词搜索，容易遗漏 | Cortex Search 语义搜索，理解含义 |
| 数据散落在不同系统 | 统一存储在 Snowflake，数据不出平台 |
| 需要第三方 OCR 服务 | AI_PARSE_DOCUMENT 内置 OCR |
| 搭建 RAG 需要多个组件 | Snowflake 一站式：存储 + AI + 搜索 + 应用 |

---

## 2. 技术架构 / Architecture

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     用户 (浏览器)                              │
│                         │                                    │
│                    HTTPS 访问                                 │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Snowflake App Runtime (SPCS)               │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │              Next.js Application                 │  │   │
│  │  │                                                  │  │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │   │
│  │  │  │ React UI │  │ API Routes│  │ Snowflake SDK│  │  │   │
│  │  │  │ (前端)    │  │ (后端逻辑) │  │ (数据库连接)  │  │  │   │
│  │  │  └──────────┘  └──────────┘  └──────────────┘  │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          │ SQL / Cortex AI 调用               │
│                          ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Snowflake Platform                     │   │
│  │                                                       │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │ Cortex AI   │  │ Cortex Search│  │ Internal    │  │   │
│  │  │ Functions   │  │ Service      │  │ Stage       │  │   │
│  │  │             │  │              │  │             │  │   │
│  │  │• AI_PARSE   │  │• 语义索引     │  │• 文件存储    │  │   │
│  │  │• AI_EXTRACT │  │• arctic-embed │  │• Presigned  │  │   │
│  │  │             │  │• 自动刷新     │  │  URL 下载   │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │           Snowflake Tables (数据存储)              │ │   │
│  │  │                                                   │ │   │
│  │  │  RAG_DOCUMENTS          RAG_CHUNKS                │ │   │
│  │  │  (文档元数据)            (文本分块，供搜索索引)       │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 部署架构

```
开发者 (本地)                         Snowflake (云端)
┌─────────────┐   snow app deploy   ┌──────────────────────┐
│ Next.js 代码 │ ──────────────────▶ │ APPLICATION SERVICE  │
│ + Snow CLI  │                     │ (SPCS 容器)           │
└─────────────┘                     │ • npm ci + next build │
                                    │ • node server.js      │
                                    │ • 自动 HTTPS           │
                                    └──────────────────────┘
```

- **部署方式**: Snow CLI 一键部署 (`snow app deploy`)
- **运行环境**: Snowflake App Runtime (Snowpark Container Services)
- **无需外部基础设施**: 不需要 AWS/GCP/Azure 账号，不需要配置网络、SSL、负载均衡

---

## 3. 核心 Cortex AI 功能 / Core Cortex AI Functions

### 3.1 AI_PARSE_DOCUMENT — 文档解析

**功能**: 将 PDF、图片、Word 等文件转换为纯文本

**语法**:
```sql
SELECT AI_PARSE_DOCUMENT(
  TO_FILE('@STAGE_NAME', 'file_path'),
  {'mode': 'OCR'}
) AS result
```

**支持格式**: PDF, PNG, JPG, JPEG, TIFF, TXT, DOCX, DOC, PPTX, GIF, BMP, WEBP

**关键细节**:
- 第二个参数必须是 JSON 对象 `{'mode': 'OCR'}`，不能传字符串 `'OCR'`
- 文件必须先上传到 Snowflake Internal Stage
- 返回包含 `content` 字段的 JSON 对象

**应用中的实现** (`/api/parse`):
1. 用户上传文件 → 服务端写入 `/tmp/`
2. `PUT file:///tmp/xxx @STAGE/_parse_temp/` 上传到 stage
3. `AI_PARSE_DOCUMENT(TO_FILE(@STAGE, path), {'mode': 'OCR'})` 解析
4. 返回提取的文本内容

### 3.2 AI_EXTRACT — 结构化字段提取

**功能**: 从非结构化文本中提取指定的结构化字段

**语法**:
```sql
SELECT AI_EXTRACT(
  '这是一段文本...',
  ['field_name_1', 'field_name_2', 'field_name_3']
) AS result
```

**关键细节**:
- 字段名必须唯一，不能有重复（否则报 "duplicate feature name" 错误）
- 字段名应为短英文标识符（如 `contract_number`、`total_amount`）
- 返回 JSON 对象，key 为字段名，value 为提取的值

**应用中的实现** (`/api/extract`):
- 自动去重: `[...new Set(fields)]`
- SQL 注入防护: 字段名用 `replace(/'/g, "''")`
- 文本通过 bind parameter 传递（安全）

**示例**:

输入文本（合同）:
```
技术服务合同
甲方: ABC科技有限公司
乙方: XYZ数据服务有限公司
合同金额: 人民币叁佰捌拾万元整 (¥3,800,000.00)
服务期限: 2026年9月15日起至2027年9月14日止
```

提取字段: `contract_number, party_a, party_b, amount, service_period`

输出:
```json
{
  "contract_number": null,
  "party_a": "ABC科技有限公司",
  "party_b": "XYZ数据服务有限公司",
  "amount": "3800000",
  "service_period": "2026年9月15日至2027年9月14日"
}
```

### 3.3 Cortex Search (SEARCH_PREVIEW) — 语义搜索

**功能**: 基于语义理解搜索文档内容，而非简单的关键词匹配

**Cortex Search Service 创建**:
```sql
CREATE CORTEX SEARCH SERVICE AI_DOC_HUB.RAG_CORTEX.TEST
  ON CHUNK_TEXT
  ATTRIBUTES FILE_NAME, PAGE_NUMBER, CHUNK_ID
  WAREHOUSE = AI_DOC_WH
  TARGET_LAG = '1 hour'
  EMBEDDING_MODEL = 'arctic-embed-l-v2.0'
  AS (SELECT * FROM AI_DOC_HUB.RAG_CORTEX.RAG_CHUNKS);
```

**搜索调用**:
```sql
SELECT PARSE_JSON(
  SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
    'AI_DOC_HUB.RAG_CORTEX.TEST',
    '{"query": "搜索内容", "columns": ["CHUNK_TEXT","FILE_NAME","PAGE_NUMBER","CHUNK_ID"], "limit": 10}'
  )
) AS result
```

**关键概念**:
- **Embedding Model**: `arctic-embed-l-v2.0` — Snowflake 自研的文本向量化模型
- **TARGET_LAG**: `1 hour` — 搜索索引每小时自动刷新一次
- **语义搜索 vs 关键词搜索**: 搜"员工报销"也能匹配到"费用申请"、"expense report"
- **返回相似度分数**: cosine similarity + text match scores

---

## 4. RAG 管线 / RAG Pipeline

### 什么是 RAG？

**RAG (Retrieval-Augmented Generation)** — 检索增强生成，是目前企业 AI 应用的主流架构：
1. 把文档切分成小块 (chunks)
2. 对每个 chunk 生成向量嵌入 (embedding)
3. 用户提问时，先检索相关 chunk
4. 把检索到的 chunk 作为上下文提供给 LLM 生成答案

### 本应用的 RAG 管线

```
        文档上传                    文本提取               文本分块
   ┌──────────────┐         ┌──────────────┐      ┌──────────────┐
   │  PDF / 图片   │  PUT    │ AI_PARSE_    │      │  chunkText() │
   │  / Word 文件  │ ──────▶ │ DOCUMENT     │ ───▶ │              │
   │              │  @STAGE  │ (OCR mode)   │      │ ~1000 chars  │
   └──────────────┘         └──────────────┘      │ 100 overlap  │
                                                   └──────┬───────┘
                                                          │
                   语义搜索             自动索引            │ INSERT
              ┌──────────────┐    ┌──────────────┐    ┌───▼──────────┐
   用户查询 ──▶│ Cortex Search│◀───│ arctic-embed │◀───│ RAG_CHUNKS   │
              │ SEARCH_      │    │ -l-v2.0      │    │ 表           │
              │ PREVIEW      │    │ (向量化)      │    │              │
              └──────────────┘    └──────────────┘    └──────────────┘
```

### 文本分块算法 (Text Chunking)

```
原始文本 (2500 chars):
┌──────────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████████████ │
│ 第一条 服务内容...                                        │
│ ████████████████████████████████████████████████████████ │
│ 第二条 服务期限...                                        │
│ ████████████████████████████████████████████████████████ │
│ 第三条 合同金额...                                        │
└──────────────────────────────────────────────────────────┘

分块后:
┌─── chunk 0 (0~980) ───┐
│ 第一条 服务内容...       │
│ ...在段落边界处断开。     │
└──────────┬─────────────┘
     overlap│(100 chars)
┌──────────▼─────────────┐
│ chunk 1 (880~1940)     │
│ ...第二条 服务期限...     │
│ ...在句号处断开。         │
└──────────┬─────────────┘
     overlap│(100 chars)
┌──────────▼─────────────┐
│ chunk 2 (1840~2500)    │
│ ...第三条 合同金额...     │
│ ...文档结尾               │
└────────────────────────┘
```

**参数**:
- `CHUNK_SIZE = 1000` — 每个 chunk 目标 1000 字符
- `CHUNK_OVERLAP = 100` — 相邻 chunk 重叠 100 字符
- **智能断句**: 优先在 `\n\n` (段落)、`。` (中文句号)、`. ` (英文句号) 处断开
- **中英文支持**: 同时处理中文和英文的句子边界

---

## 5. 数据模型 / Data Model

### RAG_DOCUMENTS 表 — 文档元数据

```sql
CREATE TABLE RAG_DOCUMENTS (
  DOCUMENT_ID     VARCHAR PRIMARY KEY,    -- 'doc_' + MD5(content)
  FILE_NAME       VARCHAR,                -- 原始文件名 (含中文)
  FILE_HASH       VARCHAR UNIQUE,         -- MD5(content) 用于去重
  FILE_SIZE       NUMBER,                 -- 文件大小 (bytes)
  TOTAL_PAGES     NUMBER,                 -- chunk 数量
  SOURCE          VARCHAR DEFAULT 'app_upload',
  STAGE_FILE_PATH VARCHAR,                -- stage 上的完整路径
  CREATED_AT      TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

### RAG_CHUNKS 表 — 文本分块

```sql
CREATE TABLE RAG_CHUNKS (
  CHUNK_ID      VARCHAR PRIMARY KEY,      -- 'doc_xxx_chunk_0001'
  DOCUMENT_ID   VARCHAR,                  -- 关联 RAG_DOCUMENTS
  FILE_NAME     VARCHAR,                  -- 冗余存储便于搜索返回
  CHUNK_INDEX   NUMBER,                   -- 第几个 chunk (0-based)
  PAGE_NUMBER   NUMBER,                   -- 页码
  CHUNK_TEXT    VARCHAR,                   -- chunk 文本内容
  CHUNK_LENGTH  NUMBER,                   -- 字符长度
  CREATED_AT    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

### Cortex Search Service

```sql
CREATE CORTEX SEARCH SERVICE TEST
  ON CHUNK_TEXT                            -- 搜索的文本列
  ATTRIBUTES FILE_NAME, PAGE_NUMBER, CHUNK_ID  -- 附带返回的属性列
  WAREHOUSE = AI_DOC_WH
  TARGET_LAG = '1 hour'                   -- 索引刷新频率
  EMBEDDING_MODEL = 'arctic-embed-l-v2.0' -- Snowflake 向量化模型
  AS (SELECT * FROM RAG_CHUNKS);          -- 数据源
```

### Internal Stage — 文件存储

```sql
CREATE STAGE RAG_PDF_STAGE ENCRYPTION = (TYPE = 'SNOWFLAKE_SSE');
```

- 原有文件存储为 `<FILE_HASH>.pdf`
- App 上传的文件存储为 `_parse_temp/parse_<uuid>.<ext>`
- 通过 `GET_PRESIGNED_URL()` 生成临时下载链接

---

## 6. 应用功能页面 / Application Pages

### 6.1 首页 (Home)

**功能**: Dashboard 总览
- KPI 卡片: 文档总数、Chunk 总数、已索引文档数
- 快速搜索入口
- 功能导航: 4 个功能卡片入口
- 最近上传的 5 个文档列表

### 6.2 语义搜索 (Semantic Search)

**功能**: 基于 Cortex Search 的全文语义搜索
- 输入搜索词 → 返回最相关的文档 chunks
- 显示相似度分数 (cosine similarity + text match)
- 显示来源文件名和页码
- URL 同步搜索参数

### 6.3 文档库 (Documents)

**功能**: 已索引文档的管理
- 文档列表: 文件名、大小、页数、chunk 数、上传时间
- **下载**: 通过 presigned URL 代理下载，保留原始文件名（含中文）
- **删除**: 删除文档记录 + chunks + stage 文件，React Query 缓存自动刷新

### 6.4 AI 提取 (AI Extract)

**功能**: AI_EXTRACT 函数的交互式 Playground
- 左侧: 输入文本 + 字段名 tag 管理
- 右侧: 提取结果表格 + 原始 JSON
- 预设模板: Invoice、Contract (中文)、Email、Medical Record

### 6.5 实时解析 (Live Parse)

**功能**: 完整的 Parse → Extract → Save 管线
- **上传**: 拖拽或点击上传（支持 PDF、图片、Word 等 12+ 格式）
- **解析**: AI_PARSE_DOCUMENT (OCR) 提取文本
- **提取**: 自动检测文档类型 → 匹配 preset 字段 → AI_EXTRACT 提取
- **保存**: 文本分块 → INSERT 到 RAG_DOCUMENTS + RAG_CHUNKS → Cortex Search 自动索引
- **复制**: 一键复制解析内容

---

## 7. API 路由总览 / API Routes

| 路由 | 方法 | Cortex AI 函数 | 说明 |
|------|------|---------------|------|
| `/api/search` | GET | `SEARCH_PREVIEW` | 语义搜索 |
| `/api/extract` | POST | `AI_EXTRACT` | 结构化字段提取 |
| `/api/parse` | POST | `AI_PARSE_DOCUMENT` | 文件上传 + OCR 解析 |
| `/api/ingest` | POST | — | 文本分块 + 写入数据库 |
| `/api/documents` | GET | — | 文档列表 + presigned URL |
| `/api/download` | GET | — | 代理下载（保留原始文件名） |
| `/api/delete` | DELETE | — | 删除文档 + chunks + stage 文件 |
| `/api/overview` | GET | — | KPI 统计数据 |

---

## 8. 技术栈 / Tech Stack

### 前端
| 技术 | 用途 |
|------|------|
| **Next.js 16** | React 全栈框架 (App Router) |
| **React 19** | UI 组件库 |
| **Tailwind CSS 4** | 样式系统 |
| **shadcn/ui** | UI 组件 (Button, Card, Badge, Table...) |
| **@tanstack/react-query** | 数据获取和缓存 |
| **Lucide React** | 图标库 |

### 后端
| 技术 | 用途 |
|------|------|
| **Next.js API Routes** | 服务端 API 端点 |
| **snowflake-sdk** | Snowflake Node.js 驱动 |
| **SPCS OAuth** | 容器内自动认证，无需配置密码 |

### Snowflake 平台
| 功能 | 用途 |
|------|------|
| **Cortex AI_PARSE_DOCUMENT** | 文档 OCR 解析 |
| **Cortex AI_EXTRACT** | 结构化信息提取 |
| **Cortex Search** | 语义搜索服务 |
| **Internal Stage** | 文件存储 |
| **GET_PRESIGNED_URL** | 临时下载链接 |
| **App Runtime (SPCS)** | 应用部署和运行 |

### 部署
| 工具 | 用途 |
|------|------|
| **Snow CLI** | `snow app deploy` 一键部署 |
| **snowflake.yml** | 部署目标配置 |
| **app.yml** | 构建和运行配置 |

---

## 9. 部署流程 / Deployment

### 一键部署

```bash
# 1. 安装 Snow CLI
pip install snowflake-cli

# 2. 配置连接
# ~/.snowflake/connections.toml
[my-conn]
account = "your-account"
user = "your-user"
password = "your-password"
role = "ACCOUNTADMIN"
warehouse = "MY_WH"

# 3. 配置应用 (snowflake.yml)
# 修改 database, schema, warehouse 等

# 4. 部署
snow app deploy --connection "my-conn"
```

### 部署过程

```
snow app deploy
    │
    ├── 1. 上传源代码到 Code Workspace
    ├── 2. 在 SPCS 容器中运行:
    │       ├── npm ci --include=dev    (安装依赖)
    │       ├── npm run build           (Next.js 构建)
    │       ├── cp static + public      (复制静态资源)
    │       └── rm -rf node_modules     (清理)
    ├── 3. 启动: node .next/standalone/server.js
    └── 4. 输出: App ready at https://xxx.snowflake-app.cn
```

- **构建时间**: ~2-3 分钟
- **无需 Docker**: Snowflake 自动管理容器
- **自动 HTTPS**: 自动分配域名和 SSL 证书
- **自动认证**: SPCS 容器内通过 OAuth token 连接 Snowflake，无需配置密码

---

## 10. China Region 可用性 / China Region Availability

**测试区域**: `cn-northwest-1` (AWS 中国宁夏)

| Cortex 功能 | 状态 | 说明 |
|------------|------|------|
| AI_EXTRACT | ✅ 可用 | 结构化字段提取 |
| AI_PARSE_DOCUMENT (OCR) | ✅ 可用 | 文档 OCR 解析 |
| Cortex Search (SEARCH_PREVIEW) | ✅ 可用 | 语义搜索 |
| arctic-embed-l-v2.0 | ✅ 可用 | 文本向量化模型 |
| AI_PARSE_DOCUMENT (LAYOUT) | ❌ 不可用 | 布局解析模式 |
| CORTEX.COMPLETE (LLM) | ❌ 不可用 | LLM 文本生成 |
| Snowflake App Runtime | ✅ 可用 | 应用部署和运行 |

---

## 11. 关键实现细节 / Implementation Details

### Presigned URL 与文件哈希

文件上传到 stage 时并不以原始文件名存储，而是以内容哈希命名：

```
@RAG_PDF_STAGE/
├── 046f07b3514b...pdf       ← 预加载文件 (FILE_HASH.pdf)
└── _parse_temp/
    ├── parse_a1b2c3d4.pdf   ← App 上传的文件
    └── parse_e5f6g7h8.docx  ← App 上传的 Word
```

下载时需要通过 `STAGE_FILE_PATH` 找到实际路径：
```sql
GET_PRESIGNED_URL(
  @RAG_PDF_STAGE,
  COALESCE(
    REPLACE(STAGE_FILE_PATH, '@AI_DOC_HUB.RAG_CORTEX.RAG_PDF_STAGE/', ''),
    FILE_HASH || '.pdf'
  ),
  3600  -- 1小时有效
)
```

### 代理下载保留文件名

浏览器直接访问 presigned URL 下载的文件名是哈希值。通过代理下载实现原始文件名：

```
浏览器 → /api/download?id=doc_xxx
         → 服务端查询原始 FILE_NAME
         → 服务端 fetch presigned URL 获取文件内容
         → 设置 Content-Disposition: attachment; filename*=UTF-8''原始文件名.pdf
         → 流式返回给浏览器
```

### AI_EXTRACT 字段输入 UX

为防止用户误把文档内容粘贴到字段名输入框：
1. **自动检测文档类型** → 根据关键词匹配 preset（合同/发票/费用/库存/医疗/会议）
2. **输入验证**: 总长度 >200 字符、单字段 >30 字符、>15 个字段 → 提示错误
3. **值检测**: 输入包含日期、金额、冒号+数字 → 提示"这是值不是字段名"
4. **视觉反馈**: 超过阈值时输入框变红 + 红色提示文字

### React Query 缓存管理

删除文档后，需要刷新文档列表和首页 KPI：
```typescript
const queryClient = useQueryClient()
// 删除成功后
queryClient.invalidateQueries({ queryKey: ["documents"] })
```

---

## 12. 演示场景 / Demo Scenarios

### 场景 1: 合同信息提取

1. 上传中文技术服务合同 PDF
2. AI_PARSE_DOCUMENT 自动 OCR 提取全文
3. 自动识别为"合同"类型 → 填入字段: `contract_number, party_a, party_b, amount, service_period, signing_date`
4. AI_EXTRACT 一键提取结构化信息
5. 保存到 Snowflake → 后续可通过 Cortex Search 搜索

### 场景 2: 跨文档语义搜索

1. 已索引多个文档（合同、发票、会议记录、医疗报告等）
2. 搜索"数据仓库迁移" → 找到技术服务合同中相关段落
3. 搜索"expense over 500" → 找到费用报告中符合条件的内容
4. 搜索"患者用药" → 找到医疗报告中的用药信息

### 场景 3: 库存报告分析

1. 上传 PDF 格式的仓库库存报告（含表格）
2. AI_PARSE_DOCUMENT OCR 提取表格数据
3. 自动识别为"库存"类型 → 提取: `warehouse_name, report_date, manager, total_items, total_value`
4. 保存后可搜索"哪个仓库缺货" 等自然语言问题

### 场景 4: 多格式文档处理

展示 AI_PARSE_DOCUMENT 处理不同格式：
- PDF (含表格) → 提取表格结构
- PNG/JPG (扫描件/截图) → OCR 识别文字
- DOCX (Word 文档) → 提取文本内容
- TXT (纯文本) → 直接读取

---

## 13. 项目文件结构 / Project Structure

```
ai-doc-hub/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 首页 Dashboard
│   ├── search/page.tsx           # 语义搜索页
│   ├── documents/page.tsx        # 文档管理页
│   ├── extract/page.tsx          # AI_EXTRACT 实验室
│   ├── parse/page.tsx            # 实时解析 + 提取管线
│   ├── layout.tsx                # 根布局 (主题/字体/QueryProvider)
│   ├── globals.css               # 全局样式 + CSS 变量
│   └── api/                      # 后端 API 路由
│       ├── search/route.ts       # Cortex Search 搜索
│       ├── extract/route.ts      # AI_EXTRACT 提取
│       ├── parse/route.ts        # AI_PARSE_DOCUMENT 解析
│       ├── ingest/route.ts       # 文本分块 + 入库
│       ├── documents/route.ts    # 文档列表
│       ├── download/route.ts     # 代理下载
│       ├── delete/route.ts       # 删除文档
│       └── overview/route.ts     # KPI 统计
├── components/                   # React 组件
│   ├── app-header.tsx            # 导航栏
│   ├── query-provider.tsx        # React Query Provider
│   ├── theme-provider.tsx        # 暗色模式支持
│   └── ui/                       # shadcn/ui 组件
├── lib/                          # 工具库
│   ├── snowflake.ts              # Snowflake SDK 封装
│   └── constants.ts              # 应用配置
├── samples/                      # 测试样本文件
│   ├── contract_cn_sample.txt    # 中文合同
│   ├── invoice_sample.txt        # 英文发票
│   ├── meeting_notes_sample.txt  # 中文会议记录
│   ├── medical_report_sample.txt # 双语医疗报告
│   ├── sales_report_q3_2026.pdf  # 销售报告 (含表格)
│   ├── expense_report_aug2026.pdf# 费用报告 (含表格)
│   ├── inventory_report_sep2026.pdf # 库存报告 (含15行表格)
│   └── generate_pdfs.py          # PDF 生成脚本
├── snowflake.yml                 # 部署配置
├── app.yml                       # 构建/运行配置
└── package.json                  # Node.js 依赖
```

---

## 14. 总结 / Summary

### Snowflake 平台优势

1. **All-in-One**: 存储 + 计算 + AI + 搜索 + 应用部署，全部在一个平台
2. **数据不出平台**: 文档存储在 Snowflake Stage，处理通过 Cortex AI，搜索通过 Cortex Search — 无需将数据发送到外部 API
3. **零基础设施管理**: 无需配置服务器、容器、网络、SSL — `snow app deploy` 一键搞定
4. **内置 AI 能力**: AI_PARSE_DOCUMENT、AI_EXTRACT、Cortex Search 都是 SQL 函数调用，无需 ML 工程团队
5. **China Region Ready**: 核心功能在中国区域 (cn-northwest-1) 可用

### 与传统 RAG 方案对比

| 维度 | 传统方案 (LangChain + Pinecone + OpenAI) | Snowflake AI Document Hub |
|------|------|------|
| 向量数据库 | Pinecone / Weaviate / Chroma | Cortex Search (内置) |
| OCR 解析 | Tesseract / AWS Textract / 第三方 | AI_PARSE_DOCUMENT (内置) |
| 信息提取 | LLM prompt engineering | AI_EXTRACT (内置) |
| Embedding | OpenAI / Cohere API | arctic-embed-l-v2.0 (内置) |
| 文件存储 | S3 / GCS | Internal Stage (内置) |
| 应用部署 | AWS ECS / Vercel / K8s | App Runtime (内置) |
| 组件数量 | 5-8 个独立服务 | **1 个 Snowflake 账号** |
| 数据安全 | 数据分散在多个系统 | **数据从不离开 Snowflake** |
