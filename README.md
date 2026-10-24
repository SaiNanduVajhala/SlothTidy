<p align="center">
  <img src="public/assets/sloth_mascot.jpg" alt="SlothTidy" width="200" style="border-radius: 16px;">
</p>

<h1 align="center">SlothTidy</h1>

<p align="center">
  <strong>Offline AI-powered file organizer that does the work so you don't have to.</strong><br>
  Built with open-weight models running locally via Ollama. 100% private. Zero cost. No internet required.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-Qwen3_(Open_Weights)-blue?style=flat-square" alt="Qwen3">
  <img src="https://img.shields.io/badge/Runtime-Ollama_(Local)-green?style=flat-square" alt="Ollama">
  <img src="https://img.shields.io/badge/Privacy-100%25_Offline-brightgreen?style=flat-square" alt="Privacy">
  <img src="https://img.shields.io/badge/Cost-%240%2Fforever-orange?style=flat-square" alt="Cost">
  <img src="https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square" alt="MIT">
</p>

---

## What is SlothTidy?

SlothTidy is a local-first, privacy-respecting file organizer powered by open-weight AI models. It scans a messy directory (like your Downloads folder), reads file names and content snippets, classifies each file into clean categories, proposes descriptive renames, and moves everything into organized subfolders — all with a single click.

**The key constraint:** every byte of data stays on your machine. The AI model (Qwen3) runs locally through [Ollama](https://ollama.com). No API keys, no cloud endpoints, no telemetry, no subscriptions.

### The "Slow and Steady" Angle

This project was built for the **DEV Hacktoberfest Week 3 Challenge: Slow and Steady** (International Sloth Day edition). The theme: *build something with open-source AI that rewards laziness.* SlothTidy channels your inner sloth — it does the tedious sorting, renaming, and organizing that you've been putting off for months.

---

## Why Open-Source AI?

This isn't a wrapper around a cloud API with a sloth skin. The open-source stack is the entire point.

### 1. Privacy by Architecture

Your Downloads folder is intimate. Bank statements, tax returns, medical PDFs, salary stubs, resumes, private photos, internal company code. Cloud-based file analyzers require uploading this data to third-party servers governed by someone else's privacy policy.

With SlothTidy, Qwen3 runs in your local RAM via Ollama. File contents are read from disk, passed to the model over localhost (`127.0.0.1:11434`), and the response stays in-process. **Zero network egress. Zero data leakage.**

### 2. Works Completely Offline

Organize your laptop on a plane, a train, in a cabin, or during an ISP outage. There's no API endpoint to go down, no rate limit to hit, no OAuth token to expire. If your machine boots, SlothTidy works.

### 3. Zero Ongoing Cost

Closed APIs charge per-token and throttle batch requests. Organizing 100 files through GPT-4o would cost real money and require careful prompt budgeting. SlothTidy processes unlimited files at zero cost, forever. The model is already on your disk.

### 4. Model Freedom

Don't like Qwen3? Swap it. The model name is a dropdown in the UI and a single parameter in the API. Drop in Llama 3, Mistral, Phi-3, Gemma, or any GGUF model Ollama supports. No code changes, no vendor lock-in, no migration. You own the inference stack.

---

## Features

| Feature | Description |
|---|---|
| **AI-Powered Classification** | Qwen3 reads file names + content snippets and assigns categories (Finance, Work, Code, Notes, Logs, Media, Archives) |
| **Smart Renaming** | Proposes clean, descriptive file names based on actual content |
| **One-Click Organization** | Moves files into categorized subfolders automatically |
| **Full Undo** | Every operation is reversible — one click restores original state |
| **Sandbox Mode** | Generates realistic sample messy files (bank statements, meeting notes, code, invoices) for safe testing |
| **Model Switching** | Switch between Qwen3:1.7B and Qwen3:0.6B (or any Ollama model) from the UI |
| **Editable Plan** | Review and modify every proposed rename before applying |
| **Time-Saved Tracking** | Shows estimated manual sorting time saved per session |
| **Windows Explorer Integration** | Open organized folders directly from the UI |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Browser UI                      │
│         (index.html + style.css + app.js)         │
│                                                    │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ Sidebar │  │  Config   │  │   File Table     │  │
│  │ Mascot  │  │  Panel    │  │   + AI Plan      │  │
│  │ Stats   │  │  Model    │  │   + Undo Banner  │  │
│  └─────────┘  └──────────┘  └─────────────────┘  │
└───────────────────────┬──────────────────────────┘
                        │ HTTP (localhost:3000)
┌───────────────────────▼──────────────────────────┐
│               Express.js Server                   │
│                  (server.js)                       │
│                                                    │
│  /api/status      → Check Ollama + sandbox state  │
│  /api/init-sample → Generate sample messy files   │
│  /api/scan        → Read directory contents       │
│  /api/analyze-batch → Send files to local model   │
│  /api/apply       → Move + rename files           │
│  /api/undo        → Restore from undo manifest    │
│  /api/open-folder → Launch Windows Explorer       │
└───────────────────────┬──────────────────────────┘
                        │ HTTP (localhost:11434)
┌───────────────────────▼──────────────────────────┐
│              Ollama (Local Runtime)                │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ qwen3:1.7b   │  │ qwen3:0.6b   │  ← Open      │
│  │ (2B params)  │  │ (750M params)│    Weights    │
│  │ Q4_K_M GGUF  │  │ Q4_K_M GGUF  │               │
│  └──────────────┘  └──────────────┘               │
│                                                    │
│  Runs on CPU or GPU. No internet required.        │
└──────────────────────────────────────────────────┘
```

### Data Flow

1. **Scan** — Server reads the target directory using `fs.readdirSync`, collects file names, sizes, extensions, and content snippets (first 350 chars of text files; binary files get a size-only placeholder).

2. **Analyze** — Each file's metadata is sent to Ollama's `/api/generate` endpoint with a structured prompt requesting JSON output. The model returns a category, proposed clean name, confidence score, reasoning, and estimated time savings.

3. **Apply** — Server creates category subfolders and uses `fs.renameSync` to move files. A `.sloth_undo.json` manifest records every operation for rollback.

4. **Undo** — Reads the manifest, reverses all moves, and cleans up empty category folders.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **AI Model** | [Qwen3](https://huggingface.co/Qwen) (1.7B / 0.6B, Q4_K_M GGUF) | Open-weight, Apache 2.0 licensed, strong at structured JSON output, runs on consumer hardware |
| **Model Runtime** | [Ollama](https://ollama.com) | Open-source local inference server, dead-simple model management, exposes clean REST API |
| **Backend** | [Node.js](https://nodejs.org) + [Express](https://expressjs.com) | Lightweight, single-file server, native `fs` for file operations |
| **Frontend** | Vanilla HTML/CSS/JS | Zero build step, no framework overhead, instant load |
| **Font** | [Inter](https://rsms.me/inter/) + [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | Clean, professional typography |

**Total dependencies:** 2 (`express`, `cors`). That's it.

---

## Prerequisites

- **Node.js** 18+ — [Download](https://nodejs.org)
- **Ollama** — [Download](https://ollama.com/download)
- **A Qwen3 model** pulled into Ollama

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/slothtidy.git
cd slothtidy
```

### 2. Install dependencies

```bash
npm install
```

### 3. Pull a model (if you haven't already)

```bash
# Recommended: good balance of speed and accuracy
ollama pull qwen3:1.7b

# Alternative: ultra-fast, lower accuracy, minimal RAM
ollama pull qwen3:0.6b
```

### 4. Make sure Ollama is running

```bash
ollama serve
```

### 5. Start SlothTidy

```bash
npm start
```

### 6. Open in browser

```
http://localhost:3000
```

---

## Usage

### Sandbox Mode (Recommended First Run)

1. Click **"Load samples"** — generates 8 realistic messy files (bank statement, invoice, meeting notes, Python script, crash log, resume, grocery list, photo metadata) inside a `sample_downloads/` folder.
2. Click **"Analyze 8 files"** — Qwen3 reads each file and produces a classification plan.
3. Review the plan — edit proposed names, toggle files on/off.
4. Click **"Apply changes"** — files are moved into categorized subfolders.
5. Click **"Undo"** at any time to revert.

### Your Own Directory

1. Paste or type a directory path into the **Target directory** input.
2. Click **"Scan folder"** to discover files.
3. Proceed with Analyze → Review → Apply as above.

> **Safety note:** SlothTidy uses `fs.renameSync` (move, not copy). The undo manifest ensures reversibility, but always test with the sandbox first if you're cautious.

---

## API Reference

All endpoints are served from `http://localhost:3000`.

### `GET /api/status`

Check Ollama connectivity and sandbox state.

**Response:**
```json
{
  "status": "online",
  "ollamaHost": "http://127.0.0.1:11434",
  "models": ["qwen3:1.7b", "qwen3:0.6b"],
  "defaultSandbox": "/path/to/sample_downloads",
  "sandboxFileCount": 8,
  "hasUndo": false
}
```

### `POST /api/init-sample`

Reset and populate the sandbox with sample messy files.

### `POST /api/scan`

Scan a directory and return file metadata.

**Body:**
```json
{ "directory": "/path/to/folder" }
```

### `POST /api/analyze-batch`

Send files to the local Ollama model for AI classification.

**Body:**
```json
{
  "files": [ { "name": "...", "extension": "...", "sizeFormatted": "...", "snippet": "..." } ],
  "model": "qwen3:1.7b"
}
```

**Response:**
```json
{
  "modelUsed": "qwen3:1.7b",
  "totalFiles": 8,
  "totalMinutesSaved": 22,
  "results": [
    {
      "fileName": "statement_oct2026_chase.txt",
      "category": "01_Finances_&_Invoices",
      "proposedName": "chase_checking_statement_oct_2026.txt",
      "confidence": 0.95,
      "minutesSaved": 3,
      "reason": "Contains bank account balance and transaction summary."
    }
  ]
}
```

### `POST /api/apply`

Execute the organization plan (move + rename).

**Body:**
```json
{
  "targetDir": "/path/to/folder",
  "plan": [ { "fileName": "...", "category": "...", "proposedName": "...", "enabled": true } ],
  "renameFiles": true
}
```

### `POST /api/undo`

Revert the last organization operation.

**Body:**
```json
{ "directory": "/path/to/folder" }
```

### `POST /api/open-folder`

Open the target directory in Windows Explorer.

---

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama API endpoint |

Example:

```bash
PORT=8080 OLLAMA_HOST=http://192.168.1.50:11434 npm start
```

---

## Project Structure

```
slothtidy/
├── server.js              # Express backend — file ops, Ollama integration, undo logic
├── package.json           # Project metadata and dependencies
├── .gitignore
├── LICENSE                # MIT
├── README.md
├── public/
│   ├── index.html         # Single-page UI
│   ├── style.css          # Design system (dark theme, Inter font)
│   ├── app.js             # Client-side logic
│   └── assets/
│       └── sloth_mascot.jpg
└── sample_downloads/      # Generated sandbox (gitignored)
```

---

## Model Comparison

Both models are open-weight (Apache 2.0) and run locally via Ollama.

| | Qwen3:1.7B | Qwen3:0.6B |
|---|---|---|
| **Parameters** | 2 billion | 750 million |
| **Disk size** | ~1.4 GB | ~522 MB |
| **RAM usage** | ~2 GB | ~1 GB |
| **Speed** | ~30–60 tok/s (CPU) | ~80–120 tok/s (CPU) |
| **Accuracy** | Higher — better nuanced classification | Lower — occasional miscategorization |
| **Best for** | Mixed/ambiguous files | Quick scans, low-end hardware |

You can swap to **any** model Ollama supports (Llama 3, Mistral, Phi-3, Gemma, etc.) by pulling it and selecting it from the UI dropdown.

---

## How It Compares to Cloud AI

| | SlothTidy (Local) | Cloud API Wrapper |
|---|---|---|
| **Privacy** | Files never leave your machine | Files uploaded to third-party servers |
| **Offline** | Works without internet | Requires stable connection |
| **Cost** | $0 forever | $0.01–0.06 per 1K tokens, ongoing |
| **Latency** | ~2–5s per file (CPU) | ~1–3s per file + network RTT |
| **Vendor lock-in** | None — swap models freely | Tied to provider's API, pricing, TOS |
| **Rate limits** | None | TPM/RPM quotas |
| **Data retention** | You control it | Provider's retention policy |

---

## Troubleshooting

**Ollama shows "offline" in the UI**
- Make sure Ollama is running: `ollama serve`
- Check the endpoint: `curl http://127.0.0.1:11434/api/tags`

**Model not appearing in dropdown**
- Pull the model first: `ollama pull qwen3:1.7b`

**Analysis returns fallback results**
- The server has a rule-based fallback if Ollama errors. Check server logs for the specific error.
- Ensure the model isn't still loading (first inference after boot is slower).

**Port 3000 already in use**
- Use a different port: `PORT=8080 npm start`

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-change`)
3. Commit your changes (`git commit -m "Add feature"`)
4. Push to the branch (`git push origin feature/my-change`)
5. Open a Pull Request

---

## License

[MIT](LICENSE) — use it however you want.

---

<p align="center">
  <em>Built for the DEV Hacktoberfest 2026 Week 3 Challenge: Slow and Steady.</em><br>
  <em>Channeling the sloth philosophy: move at your own pace, let the machine do the work.</em>
</p>
