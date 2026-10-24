# GitHub Copilot Instructions for SlothTidy

## Project Overview
SlothTidy is a privacy-first, offline AI file organizer designed for the DEV "Slow and Steady" Hackathon challenge. It uses local open-weight models (Qwen 2.5 / Qwen 3 via Ollama) to inspect messy download directories, determine semantic categorization, recommend clean naming conventions, and provide single-click undoable file restructuring.

## Key Architecture & Coding Guidelines
1. **Zero External Data Leakage**: SlothTidy must remain strictly local and private. Never send file contents or personal filenames to external cloud LLM endpoints.
2. **Resilient JSON Output**: Open-weight SLMs (0.6B - 1.7B) require explicit JSON schema guidance and robust JSON extraction fallbacks with regex regex-cleaning.
3. **Safety & Non-Destructive Operations**:
   - Always preview operations before moving files.
   - Every file batch move must record an undo log (`.sloth_undo.json`) mapping target paths back to source paths.
   - Prevent path traversal attacks by validating resolved paths against `targetDir`.
4. **Agent Observability**:
   - All AI inference invocations are instrumented with Sentry agent traces, recording model latency, token counts, and categorization confidence.
