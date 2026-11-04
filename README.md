# Clarity AI — Document Research Chatbot & Intelligence Engine

> A full-stack, enterprise-grade AI research assistant powered by **Google Gemini** (via Google AI Studio) with **verifiable document citations**, **multi-document comparison**, **chunk-level indexing**, and native **LAN multi-device access**.

---

## 📋 Table of Contents
1. [Overview & Highlights](#-overview--highlights)
2. [Technology Stack](#-technology-stack)
3. [Design System & Palette](#-design-system--palette)
4. [Security & Isolation Guarantee](#-security--isolation-guarantee)
5. [Windows Quickstart](#-windows-quickstart)
6. [Localhost vs. LAN Mode](#-localhost-vs-lan-mode)
7. [Windows Firewall Setup](#-windows-firewall-setup)
8. [Document Processing & Citations](#-document-processing--citations)
9. [REST API Documentation](#-rest-api-documentation)
10. [Automated & Live Test Results](#-automated--live-test-results)
11. [Troubleshooting Guide](#-troubleshooting-guide)

---

## 🚀 Overview & Highlights

Clarity AI transforms complex documents into verifiable, interactive intelligence:
- **Format Support**: Ingests **PDF**, **DOCX**, **TXT**, and **Markdown (.md)** files up to 25 MB.
- **Strict Document Grounding**: Prompt engineering ensures the model answers exclusively using verified passages without fabricating citations or hallucinating.
- **Verifiable Citations**: Every factual statement links to a specific page or section reference (`[[Doc: <Filename>, Page: <#>]]`) with clickable passage inspection.
- **Multi-Document Comparison**: Run side-by-side comparative matrices contrasting methodologies, numbers, and agreements across different papers.
- **Executive Summaries**: One-click structured briefings detailing Executive Summaries, Key Findings, Core Definitions, Numerical Data Tables, and Strategic Conclusions.
- **Conversational Context**: Full multi-turn conversation memory with dynamic topic naming and SQLite persistence.
- **Streaming Responses**: Server-Sent Events (SSE) stream tokens directly from Gemini with interactive typing shimmers.
- **LAN & Multi-Device Access**: Broadcast mode enables smartphones, tablets, or secondary laptops on the same Wi-Fi network to use the assistant without sharing the host computer's API key.

---

## 🛠 Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript + Vite | Tailwind CSS, Lucide Icons, React-Markdown, Remark-GFM |
| **Backend** | Node.js (v22+) + TypeScript + Express | Modular router & service architecture |
| **AI SDK** | `@google/genai` (v2.32.0) | Official unified Google Gen AI SDK for Gemini models |
| **Model** | `gemini-3-flash-preview` / `gemini-3.8-flash` | Configurable with automatic fallback resiliency |
| **Database** | SQLite via built-in `node:sqlite` | Persistent conversations, messages, documents & chunks |
| **Document Parsers** | `pdf-parse`, `mammoth`, native text parsers | Page-by-page PDF extraction, structured DOCX headings |
| **Testing** | Vitest + Supertest | Unit tests, SQLite integrity tests, and live Gemini E2E |

---

## 🎨 Design System & Palette

Clarity AI is styled in a serene, distraction-free **Premium Light** aesthetic:

| Token | Hex Value | Role |
| :--- | :--- | :--- |
| **Background** | `#FAF9F6` | Primary app and page background |
| **Cards & Panels** | `#FFFFFF` | Elevated cards, sidebar, and modals |
| **Main Text** | `#292B29` | High-contrast, readable typography |
| **Secondary Text** | `#777973` | Subtitles, metadata, and timestamps |
| **Borders** | `#E9E8E2` | Thin, refined borders |
| **Accent** | `#879783` | Sage green buttons, active states, badges |
| **Subtle Accent** | `#F0F3ED` | Button hovers, citation pills, active row highlight |

---

## 🔒 Security & Isolation Guarantee

1. **Backend Isolation**: `GEMINI_API_KEY` is loaded **exclusively on the backend** (`server/.env`).
2. **Zero Client Leakage**: Vite client code, browser storage, and network payloads never receive the API key.
3. **Secret Masking**: Backend logs and health checks mask keys (e.g., `AQ.Ab8...fiMQ`).
4. **Git Protection**: `.gitignore` strictly prohibits committing `.env` files and SQLite databases.
5. **LAN Safety**: Clients connecting over Wi-Fi interact solely with the Express REST API; no secrets are ever exposed.

---

## 💻 Windows Quickstart

### 1. Prerequisites
- **Windows 10 or 11**
- **Node.js v22+** (includes built-in `node:sqlite`)
- **npm v10+**
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

### 2. Configure Environment
A `.env.example` is provided. The backend loads configuration from `server/.env`:

```bash
# In clarity-ai/server/.env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3-flash-preview
PORT=3000
HOST=localhost
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Run in Localhost Mode
To run on your local computer:

```bash
npm run dev:local
```
Or simply:
```bash
npm run dev
```

Open your browser to:
👉 **`http://localhost:5173`**

---

## 📱 Localhost vs. LAN Mode

| Feature | Localhost Mode (`npm run dev:local`) | LAN Mode (`npm run dev:lan`) |
| :--- | :--- | :--- |
| **Frontend Binding** | `localhost:5173` | `0.0.0.0:5173` |
| **Backend Binding** | `localhost:3000` | `0.0.0.0:3000` |
| **Access Scope** | Host PC only | Host PC + Any device on the same Wi-Fi |
| **Device Examples** | Host browser | iPhone, Android phone, iPad, laptop |
| **URL Example** | `http://localhost:5173` | `http://192.168.1.41:5173` |

### Starting LAN Mode
Run from PowerShell or Command Prompt:

```bash
npm run dev:lan
```

The terminal will automatically detect your host computer's private Wi-Fi IP and display:
```
════════════════════════════════════════════════════════════════════════
  🌟 CLARITY AI — DOCUMENT RESEARCH ASSISTANT [LAN BROADCAST MODE]
════════════════════════════════════════════════════════════════════════
  📱 Local Network URL:    http://192.168.1.41:5173
  💻 Host Localhost URL:   http://localhost:5173
  ⚡ Backend Health Check: http://192.168.1.41:3000/api/health
  🔒 Security:             Gemini API key is isolated on host PC
════════════════════════════════════════════════════════════════════════
```

---

## 🛡 Windows Firewall Setup

If other devices on your Wi-Fi cannot connect to the LAN URL:

1. **Verify Network Profile**:
   - Go to Windows **Settings** > **Network & internet** > **Wi-Fi** > click your connected network.
   - Set **Network profile type** to **Private network** (Windows Firewall blocks local connections on "Public" profiles).

2. **Allow Ports Through Windows Defender Firewall**:
   Open **PowerShell as Administrator** and execute:
   ```powershell
   New-NetFirewallRule -DisplayName "Clarity AI Dev Ports" -Direction Inbound -LocalPort 3000,5173 -Protocol TCP -Action Allow -Profile Private
   ```

3. **Verify Host IP Address**:
   Run in Command Prompt:
   ```cmd
   ipconfig
   ```
   Look for **IPv4 Address** under your active **Wireless LAN adapter Wi-Fi** (e.g. `192.168.1.41`).

---

## 📄 Document Processing & Citations

1. **Multi-Format Extraction**:
   - **PDF**: Page-by-page extraction extracting exact page numbers.
   - **DOCX**: Extracts structured paragraphs and headings.
   - **Markdown / Text**: Segmented by `#` headings into semantic sections.

2. **Chunking & Hybrid Scoring**:
   - Chunks documents into ~400 word segments with 60-word overlap.
   - TF-IDF and BM25-style lexical scoring combined with title and filename boosting.
   - Multi-document comparison balances representative chunks equally across all selected files.

3. **Citation Verification**:
   - Responses contain verifiable markers: `[[Doc: Filename.pdf, Page: 3]]`.
   - The UI parses markers into interactive citation cards. Clicking a citation highlights the source text and page reference in the Insights Drawer.

---

## 📡 REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health diagnostics, model status, and uptime |
| `GET` | `/api/lan/info` | Network adapters, primary IP, and firewall guides |
| `GET` | `/api/conversations` | List all saved research sessions |
| `POST` | `/api/conversations` | Create a new research session |
| `GET` | `/api/conversations/:id`| Retrieve session messages and documents |
| `PATCH`| `/api/conversations/:id`| Rename a conversation |
| `DELETE`| `/api/conversations/:id`| Delete conversation and cleanup associated files |
| `POST` | `/api/documents/upload` | Upload PDF, DOCX, TXT, or MD with parsing & chunking |
| `GET` | `/api/documents` | List documents (supports `?conversationId=`) |
| `DELETE`| `/api/documents/:id` | Delete document and disk storage |
| `POST` | `/api/documents/:id/summarize` | Generate structured executive summary & metrics |
| `POST` | `/api/documents/compare` | Compare 2+ documents with side-by-side matrix |
| `POST` | `/api/chat` | Non-streaming grounded research Q&A |
| `POST` | `/api/chat/stream` | Server-Sent Events (SSE) streaming Q&A |

---

## 🧪 Automated & Live Test Results

### 1. Unit & Database Tests (Vitest)
```bash
npm test
```
- `tests/retrieval.test.ts`: **3/3 passed** (Chunking, scoring, multi-doc balancing)
- `tests/database.test.ts`: **3/3 passed** (Conversations, citations, cascade delete)
- `tests/parser.test.ts`: **4/4 passed** (Markdown, text, empty file validation, format checking)
- `tests/api.test.ts`: **3/3 passed** (Health diagnostics, LAN info, conversation lifecycle)
- **Total: 13/13 passed (100%)**

### 2. Live Gemini End-to-End Workflow Test
```bash
npm run test:e2e
```
Executes a real workflow with live Google Gemini AI calls:
- [x] Step 1: Health endpoint and secret isolation check.
- [x] Step 2: Create research conversation in SQLite.
- [x] Step 3: Upload and chunk Document 1 (Helios).
- [x] Step 4: Upload and chunk Document 2 (Valkyrie).
- [x] Step 5: Ask complex question and receive real Gemini response with verified citations.
- [x] Step 6: Ask follow-up question utilizing conversational context.
- [x] Step 7: Verify SQLite persistence by reopening conversation.
- [x] Step 8: Generate structured Document Executive Summary (3,500+ characters).
- [x] Step 9: Generate Multi-Document Comparison Matrix.
- [x] Step 10: Validate rejection of unsupported and corrupt files.
- [x] Step 11: Verify API key was never transmitted in response bodies.
- **Result: All 11 E2E steps passed successfully.**

---

## ❓ Troubleshooting Guide

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **Port 3000 or 5173 already in use** | Another dev server or process is running | Stop the conflicting process or set `PORT=3001` in `.env`. |
| **LAN client cannot connect on phone** | Windows Firewall or "Public" Wi-Fi profile | Set Wi-Fi to "Private" in Windows Settings and run the PowerShell firewall rule. |
| **Scanned PDF has no text** | PDF contains images without OCR | Clarity AI requires text-based PDFs. Export with searchable text or convert to TXT/MD. |
| **Model returns 404** | Deprecated model identifier | Use `gemini-3-flash-preview` or `gemini-3.8-flash` in `server/.env`. |
| **Uploads fail with 400** | Unsupported format or file > 25MB | Supported: `.pdf`, `.docx`, `.txt`, `.md` under 25 MB. |

---

*Built to make document research and learning simpler with AI.*
