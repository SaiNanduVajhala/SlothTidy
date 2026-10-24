*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)*

## What I Built
Sloths have life figured out: move at your own pace, conserve energy, and never do today what can be delegated forever.

Yet every developer's machine harbors a digital landfill: the `~/Downloads` folder. Mine had accumulated over 300 files—`statement_final_v2(1).pdf`, cryptic crash logs, messy `.csv` exports, and random scripts downloaded for a one-off task eight months ago. Cleaning it manually is agonizing, repetitive friction. But sending personal tax documents, bank statements, and proprietary code snippets to closed cloud AI APIs feels like an unforgivable privacy violation.

I built **SlothTidy**—an autonomous, 100% offline file organizer powered by local open-weight models (Qwen 3 via Ollama). 

With one click, SlothTidy inspects messy directories, semantically categorizes each file, proposes clean and human-readable filenames, and organizes them into structured folders—all while calculating your exact **"Laziness Score"** and minutes of life saved. And because sloths hate stress, every batch run includes an instant, atomic **Undo** button that guarantees zero accidental file loss.

---

## Demo
Here is SlothTidy in action, taking a messy download folder and organizing it in seconds with live streaming SSE updates:

![SlothTidy Interface](https://raw.githubusercontent.com/nagendra-prasad/slothtidy/master/public/assets/sloth_mascot.jpg)

### Key Features
- **Zero-Cloud Local AI**: Runs entirely on your CPU/GPU using Ollama.
- **Real-Time Streaming**: Watch files get analyzed live with Server-Sent Events (SSE) instead of staring at a frozen spinner.
- **Single-Click Undo**: Maintains `.sloth_undo.json` so you can revert any operation instantly.
- **Model Switcher**: Toggle seamlessly between ultra-fast **qwen3:0.6b** (1-2s per file) and highly nuanced **qwen3:1.7b**.

---

## Code
The full source code, documentation, and configuration files are available on GitHub:

{% github https://github.com/nagendra-prasad/slothtidy %}

*(Or clone directly via `git clone https://github.com/nagendra-prasad/slothtidy.git`)*

---

## How I Built It
SlothTidy was built with a lightweight, high-performance stack prioritizing zero dependencies and air-gapped privacy:

- **Local Inference Engine**: Powered by **Ollama** running **Qwen 3 (1.7B and 0.6B)**. The backend prompts the model using a strict JSON schema that outputs the target category, sanitized filename, laziness rating, and reasoning.
- **Non-Destructive File Inspection**: Safe file header and text-snippet sampling (first 400 characters) prevents multi-gigabyte binary files (videos, ISOs, `.exe`) from blowing up model context or RAM.
- **Streaming Backend (Node.js & Express)**: Analysis progress is streamed to the frontend via Server-Sent Events (SSE), providing real-time visual progress per file.
- **Atomic Undo Journal**: Every file movement writes source and destination paths to an atomic `.sloth_undo.json` state log, allowing lossless rollbacks.
- **Glassmorphic Frontend**: Built with pure Vanilla HTML5, modern CSS custom properties, and responsive micro-interactions (no heavy framework bundles or bloated build steps).

---

## Why Does Open Innovation Matter?
This project could **only** be built with open innovation:

1. **Air-Gapped Privacy by Default**: Download folders hold payroll summaries, bank receipts, resume revisions, and private keys. Running inference locally with open weights ensures not a single packet containing your personal file names or contents ever touches an external third-party server.
2. **True $0.00 Running Cost**: Running cloud LLM calls across thousands of messy files would rack up API fees fast. Open-weight SLMs cost exactly $0.00 to run for the rest of your life.
3. **Hardware Freedom & Swappability**: Open weights give users full sovereignty over their hardware. On a battery-saving laptop on a train, switch to `qwen3:0.6b`. On a beefy workstation, switch to `qwen3:1.7b` or `llama3.2`.
4. **Offline Resilience**: Works without an internet connection—on flights, rural trains, or behind corporate firewalls where external LLM APIs are blocked.

---

## The Lazy Payoff
SlothTidy is built specifically to reward laziness. In benchmarking across a chaotic folder of 8 representative files (bank statements, crash logs, invoices, meeting agendas, and code snippets):

- **Manual Human Effort**: ~6 minutes of tedious drag-and-drop, creating folders, and renaming ugly files.
- **SlothTidy Effort**: **1 click (12 seconds)**.
- **Time Saved**: 5.8 minutes per cleanup session (or roughly ~3 hours saved each month for chronic download hoarders).
- **Calories Consumed**: **0**. Just sit back and let open-source AI do the chores.

---

## Prize Categories

### 1. Best Use of Render ($200)
SlothTidy includes a turnkey [`render.yaml`](https://github.com/nagendra-prasad/slothtidy/blob/master/render.yaml) Blueprint configuration. You can deploy the SlothTidy web interface and backend directly to Render with a single click, providing a centralized self-hosted file management portal.

### 2. Best Use of Sentry Agent Tracing ($100)
SlothTidy's AI reasoning workflow is instrumented with `@sentry/node` OpenTelemetry agent spans:
- **Trace Spans**: Every file classification is wrapped in a dedicated `agent.classify` span.
- **Token & Cost Metrics**: Traces capture `gen_ai.prompt.tokens` (~88 tokens), `gen_ai.response.completion_tokens` (~42 tokens), and records `gen_ai.usage.cost_usd: 0.00` to reflect open-weight cost efficiency.
- **Latency Diagnostics**: Pinpointed initial model memory allocation cold-start (~2,400ms) versus sustained warm-cache inference (~350ms-600ms per file).

### 3. Best Use of GitHub Copilot ($100)
- Defined tailored agent instructions in [`.github/copilot-instructions.md`](https://github.com/nagendra-prasad/slothtidy/blob/master/.github/copilot-instructions.md) to steer GitHub Copilot on local path traversal security, regex JSON sanitization for SLMs, and atomic state recovery.
- Automated CI and PR code reviews via [`.github/workflows/ci.yml`](https://github.com/nagendra-prasad/slothtidy/blob/master/.github/workflows/ci.yml) to ensure zero cloud token leakage and consistent test coverage.
