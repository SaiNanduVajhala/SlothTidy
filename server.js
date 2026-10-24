const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Sentry Agent Tracing & Observability
let Sentry = null;
try {
  Sentry = require('@sentry/node');
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      environment: process.env.NODE_ENV || 'development'
    });
    console.log('[Sentry] Agent tracing enabled');
  } else {
    console.log('[Sentry] SENTRY_DSN not set; running in local telemetry emulation mode');
  }
} catch (e) {
  console.warn('[Sentry] @sentry/node not initialized:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Default sandbox directory path
const DEFAULT_SANDBOX_DIR = path.join(__dirname, 'sample_downloads');

// Ensure default sandbox dir exists
if (!fs.existsSync(DEFAULT_SANDBOX_DIR)) {
  fs.mkdirSync(DEFAULT_SANDBOX_DIR, { recursive: true });
}

// Helper: safe read snippet
function getFileSnippet(filePath, maxChars = 400) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const binaryExts = ['.exe', '.dll', '.zip', '.tar', '.gz', '.7z', '.iso', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mp3'];
    if (binaryExts.includes(ext)) {
      const stats = fs.statSync(filePath);
      return `[Binary/Media File: ${ext}, Size: ${(stats.size / 1024).toFixed(1)} KB]`;
    }
    const buffer = Buffer.alloc(maxChars);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, maxChars, 0);
    fs.closeSync(fd);
    return buffer.toString('utf8', 0, bytesRead).replace(/\0/g, '').trim();
  } catch (err) {
    return `[Unable to read preview: ${err.message}]`;
  }
}

// 1. Check system & Ollama status
app.get('/api/status', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) throw new Error('Ollama not responding');
    const data = await response.json();
    const models = (data.models || []).map(m => m.name);
    
    // Check if sandbox has files
    const sandboxFiles = fs.existsSync(DEFAULT_SANDBOX_DIR) ? fs.readdirSync(DEFAULT_SANDBOX_DIR) : [];
    const hasUndo = fs.existsSync(path.join(DEFAULT_SANDBOX_DIR, '.sloth_undo.json'));

    res.json({
      status: 'online',
      ollamaHost: OLLAMA_HOST,
      models: models,
      defaultSandbox: DEFAULT_SANDBOX_DIR,
      sandboxFileCount: sandboxFiles.filter(f => !f.startsWith('.')).length,
      hasUndo: hasUndo
    });
  } catch (err) {
    res.json({
      status: 'offline',
      ollamaHost: OLLAMA_HOST,
      models: [],
      error: err.message,
      defaultSandbox: DEFAULT_SANDBOX_DIR
    });
  }
});

// 2. Generate / Reset realistic sample messy files
app.post('/api/init-sample', (req, res) => {
  try {
    if (!fs.existsSync(DEFAULT_SANDBOX_DIR)) {
      fs.mkdirSync(DEFAULT_SANDBOX_DIR, { recursive: true });
    }

    // Clean existing inside sandbox except .sloth_undo
    const existing = fs.readdirSync(DEFAULT_SANDBOX_DIR);
    for (const item of existing) {
      const fullPath = path.join(DEFAULT_SANDBOX_DIR, item);
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }

    const sampleFiles = [
      {
        name: 'statement_oct2026_chase_checking_confidential.txt',
        content: `CHASE BANK STATEMENT - PRIVATE & CONFIDENTIAL\nAccount Ending: *4819\nStatement Period: Sep 20 - Oct 20, 2026\nBeginning Balance: $3,420.50\nTotal Deposits: $4,500.00\nTotal Withdrawals: $2,840.12\nEnding Balance: $5,080.38\nIncludes Payroll Direct Deposit and Mortgage payment.`
      },
      {
        name: 'DEV_Hackathon_Week3_Meeting_Notes_raw.txt',
        content: `Team sync - DEV Hacktoberfest Week 3 Challenge: Slow and Steady\nDate: Oct 20, 2026\nAttendees: Alex, Priya, Nagendra\nAgenda:\n- Build local AI with Qwen3\n- Reward laziness! Sloth theme\n- Emphasize privacy: data never leaves local machine\nAction items: Finish prototype by Thursday.`
      },
      {
        name: 'temp_fix_api_auth_script.py',
        content: `#!/usr/bin/env python3\n# Quick temporary scratch script to test token refresh\nimport requests, time\n\ndef check_auth_token():\n    print("Checking auth status for local daemon...")\n    # TODO: replace with persistent secure storage\n    return True\n\nif __name__ == '__main__':\n    check_auth_token()`
      },
      {
        name: 'Invoice_DevRelay_10492_Paid.txt',
        content: `INVOICE #INV-10492\nVendor: DevRelay Systems Inc.\nClient: Open Innovator Lab\nDate of Issue: October 14, 2026\nAmount Due: $0.00 (PAID IN FULL - Promotion Credit applied)\nDescription: Open Source Hackathon API Gateway sponsorship package`
      },
      {
        name: 'messy_grocery_scratchpad_oct.txt',
        content: `Things to buy:\n- Oat milk 2L\n- Sourdough loaf\n- Cold brew coffee\n- Dark chocolate\n- Avocado\n- Dog treats\nRemember coupon for organic market!`
      },
      {
        name: 'app_crash_stacktrace_20261021.log',
        content: `[2026-10-21 04:12:09.112 UTC] ERROR [Worker-Pool-4] ConnectionTimeout: Database connection pool exhausted after 30000ms.\n  at Pool.getConnection (core/db/pool.ts:88:14)\n  at QueryRunner.execute (core/db/runner.ts:42:9)\n  at async handleBackgroundSync (services/sync.ts:140:5)\nStatus: Fatal failure. Restarting daemon.`
      },
      {
        name: 'resume_draft_v3_nagendra_software_engineer.txt',
        content: `NAGENDRA PRASAD - Senior Full Stack & AI Systems Engineer\nEmail: contact@example.com | GitHub: github.com/user\nSummary: Passionate developer specializing in local edge AI, open-weight language models, privacy-preserving client applications, and reactive web architectures.`
      },
      {
        name: 'IMG_20261020_003921_sloth_sanctuary.png.txt',
        content: `[EXIF / Metadata Image File]\nFile: sloth_family_costa_rica.jpg\nCamera: Sony Alpha A7 IV\nDate Taken: 2026:10:20 14:32:05\nLocation: Costa Rica Sloth Sanctuary\nDimensions: 6000x4000\nColor Space: sRGB`
      }
    ];

    for (const f of sampleFiles) {
      fs.writeFileSync(path.join(DEFAULT_SANDBOX_DIR, f.name), f.content, 'utf8');
    }

    res.json({
      success: true,
      message: `Created ${sampleFiles.length} realistic chaotic files in sandbox.`,
      targetDir: DEFAULT_SANDBOX_DIR,
      fileCount: sampleFiles.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Scan a directory (sandbox or user specified)
app.post('/api/scan', (req, res) => {
  try {
    const targetDir = req.body.directory || DEFAULT_SANDBOX_DIR;
    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ error: `Directory not found: ${targetDir}` });
    }

    const items = fs.readdirSync(targetDir);
    const files = [];

    for (const item of items) {
      if (item.startsWith('.')) continue; // skip hidden / undo metadata
      const fullPath = path.join(targetDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isFile()) {
        files.push({
          name: item,
          fullPath: fullPath,
          sizeBytes: stat.size,
          sizeFormatted: (stat.size < 1024) ? `${stat.size} B` : `${(stat.size / 1024).toFixed(1)} KB`,
          modified: stat.mtime.toISOString(),
          extension: path.extname(item).toLowerCase(),
          snippet: getFileSnippet(fullPath, 350)
        });
      }
    }

    const hasUndo = fs.existsSync(path.join(targetDir, '.sloth_undo.json'));

    res.json({
      targetDir,
      fileCount: files.length,
      files,
      hasUndo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Analyze a single file with local Ollama model (Instrumented with Sentry Agent Tracing)
async function analyzeFileWithOllama(file, modelName = 'qwen3:1.7b') {
  const startTime = Date.now();
  const executeAnalysis = async () => {
    const prompt = `You are SlothTidy, a lazy-friendly local file organizer. 
Analyze this file and decide how to organize it cleanly so the user doesn't have to lift a finger.

File Name: "${file.name}"
Extension: "${file.extension}"
Size: "${file.sizeFormatted}"
Content Preview:
"""
${file.snippet}
"""

Choose one category from:
- "01_Finances_&_Invoices"
- "02_Work_&_Projects"
- "03_Code_&_Scripts"
- "04_Notes_&_Lists"
- "05_Logs_&_Diagnostics"
- "06_Media_&_Assets"
- "07_Archives_&_Junk"

Respond ONLY in valid JSON matching this schema:
{
  "category": "category name from list",
  "proposedName": "clean_descriptive_name_with_original_extension",
  "action": "Move & Organize",
  "lazinessScore": 5,
  "minutesSaved": 3,
  "confidence": 0.95,
  "reason": "Short 1-sentence explanation of why it belongs here"
}`;

    try {
      const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          format: 'json',
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 250
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      const promptTokens = data.prompt_eval_count || Math.round(prompt.length / 4);
      const evalTokens = data.eval_count || 50;

      let parsed;
      try {
        parsed = JSON.parse(data.response);
      } catch {
        const match = data.response.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error("Could not parse JSON response from model");
      }

      // Record Sentry AI Agent telemetry span attributes
      if (Sentry && Sentry.getActiveSpan) {
        const activeSpan = Sentry.getActiveSpan();
        if (activeSpan) {
          activeSpan.setAttribute('gen_ai.system', 'ollama');
          activeSpan.setAttribute('gen_ai.request.model', modelName);
          activeSpan.setAttribute('gen_ai.prompt.tokens', promptTokens);
          activeSpan.setAttribute('gen_ai.response.completion_tokens', evalTokens);
          activeSpan.setAttribute('gen_ai.usage.cost_usd', 0.0);
          activeSpan.setAttribute('agent.latency_ms', latencyMs);
          activeSpan.setAttribute('agent.file_name', file.name);
          activeSpan.setAttribute('agent.category', parsed.category || '04_Notes_&_Lists');
        }
      }

      console.log(`[Telemetry] ${file.name} | Model: ${modelName} | Tokens: In=${promptTokens}, Out=${evalTokens} | Latency: ${latencyMs}ms | Cost: $0.00 (Local)`);

      return {
        fileName: file.name,
        category: parsed.category || '04_Notes_&_Lists',
        proposedName: parsed.proposedName || file.name,
        action: parsed.action || 'Move & Organize',
        minutesSaved: Number(parsed.minutesSaved) || 2,
        confidence: Number(parsed.confidence) || 0.9,
        reason: parsed.reason || 'Categorized automatically based on file content.',
        telemetry: {
          latencyMs,
          promptTokens,
          completionTokens: evalTokens,
          costUsd: 0.0
        }
      };
    } catch (err) {
      if (Sentry && Sentry.captureException) {
        Sentry.captureException(err, { extra: { fileName: file.name, model: modelName } });
      }
      throw err;
    }
  };

  try {
    if (Sentry && Sentry.startSpan) {
      return await Sentry.startSpan(
        {
          name: `agent.classify: ${file.name}`,
          op: 'gen_ai.agent.inference',
          attributes: { 'agent.name': 'SlothTidy', 'file.name': file.name }
        },
        async () => await executeAnalysis()
      );
    } else {
      return await executeAnalysis();
    }
  } catch (err) {
    // Graceful rule-based fallback if Ollama call encounters transient error
    let cat = '04_Notes_&_Lists';
    const nameLower = file.name.toLowerCase();
    const ext = file.extension.toLowerCase();
    if (nameLower.includes('statement') || nameLower.includes('invoice') || nameLower.includes('bank')) {
      cat = '01_Finances_&_Invoices';
    } else if (['.py', '.js', '.ts', '.html', '.css', '.json', '.sh'].includes(ext)) {
      cat = '03_Code_&_Scripts';
    } else if (nameLower.includes('meeting') || nameLower.includes('resume') || nameLower.includes('hackathon')) {
      cat = '02_Work_&_Projects';
    } else if (['.log'].includes(ext) || nameLower.includes('crash')) {
      cat = '05_Logs_&_Diagnostics';
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.mp4'].includes(ext)) {
      cat = '06_Media_&_Assets';
    }

    return {
      fileName: file.name,
      category: cat,
      proposedName: file.name,
      action: 'Move & Organize',
      minutesSaved: 2,
      confidence: 0.75,
      reason: `Categorized locally by fallback pattern (${err.message}).`
    };
  }
}

// 5. Batch analyze files (SSE stream for real-time progress)
app.post('/api/analyze-batch', async (req, res) => {
  const { files, model = 'qwen3:1.7b' } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided for analysis' });
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const results = [];
  let totalMinutesSaved = 0;

  for (let i = 0; i < files.length; i++) {
    const analysis = await analyzeFileWithOllama(files[i], model);
    results.push(analysis);
    totalMinutesSaved += analysis.minutesSaved;

    // Send progress event
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      current: i + 1,
      total: files.length,
      result: analysis
    })}\n\n`);
  }

  // Send final complete event
  res.write(`data: ${JSON.stringify({
    type: 'done',
    modelUsed: model,
    totalFiles: results.length,
    totalMinutesSaved,
    results
  })}\n\n`);

  res.end();
});

// 6. Apply organization plan (Move / Rename) with Undo manifest
app.post('/api/apply', (req, res) => {
  try {
    const { targetDir = DEFAULT_SANDBOX_DIR, plan, renameFiles = true } = req.body;

    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ error: `Directory not found: ${targetDir}` });
    }

    if (!plan || !Array.isArray(plan) || plan.length === 0) {
      return res.status(400).json({ error: 'No plan items provided to execute' });
    }

    const undoManifest = {
      timestamp: new Date().toISOString(),
      targetDir: targetDir,
      operations: []
    };

    let movedCount = 0;

    for (const item of plan) {
      if (item.enabled === false) continue;

      const sourcePath = path.join(targetDir, item.fileName);
      if (!fs.existsSync(sourcePath)) continue;

      const categoryFolder = path.join(targetDir, item.category);
      if (!fs.existsSync(categoryFolder)) {
        fs.mkdirSync(categoryFolder, { recursive: true });
      }

      const destFileName = (renameFiles && item.proposedName) ? item.proposedName : item.fileName;
      let finalDestPath = path.join(categoryFolder, destFileName);

      // Handle collision safely
      if (fs.existsSync(finalDestPath) && finalDestPath !== sourcePath) {
        const ext = path.extname(destFileName);
        const base = path.basename(destFileName, ext);
        finalDestPath = path.join(categoryFolder, `${base}_${Date.now()}${ext}`);
      }

      fs.renameSync(sourcePath, finalDestPath);

      undoManifest.operations.push({
        originalPath: sourcePath,
        currentPath: finalDestPath,
        originalName: item.fileName,
        newName: path.basename(finalDestPath),
        category: item.category
      });
      movedCount++;
    }

    // Save undo log
    const undoFile = path.join(targetDir, '.sloth_undo.json');
    fs.writeFileSync(undoFile, JSON.stringify(undoManifest, null, 2), 'utf8');

    res.json({
      success: true,
      movedCount,
      totalMinutesSaved: plan.reduce((acc, p) => acc + (p.minutesSaved || 2), 0),
      undoAvailable: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Undo last organization
app.post('/api/undo', (req, res) => {
  try {
    const targetDir = req.body.directory || DEFAULT_SANDBOX_DIR;
    const undoFile = path.join(targetDir, '.sloth_undo.json');

    if (!fs.existsSync(undoFile)) {
      return res.status(400).json({ error: 'No undo history found in this directory.' });
    }

    const manifest = JSON.parse(fs.readFileSync(undoFile, 'utf8'));
    let restoredCount = 0;

    for (const op of manifest.operations) {
      if (fs.existsSync(op.currentPath)) {
        fs.renameSync(op.currentPath, op.originalPath);
        restoredCount++;
      }
    }

    // Clean up empty category directories if any
    const items = fs.readdirSync(targetDir);
    for (const item of items) {
      const full = path.join(targetDir, item);
      if (fs.statSync(full).isDirectory() && !item.startsWith('.')) {
        const subItems = fs.readdirSync(full);
        if (subItems.length === 0) {
          fs.rmdirSync(full);
        }
      }
    }

    fs.unlinkSync(undoFile);

    res.json({
      success: true,
      restoredCount,
      message: `Restored ${restoredCount} files to original chaos.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Open target folder in Windows Explorer
app.post('/api/open-folder', (req, res) => {
  const targetDir = req.body.directory || DEFAULT_SANDBOX_DIR;
  exec(`explorer.exe "${targetDir}"`, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, opened: targetDir });
  });
});

app.listen(PORT, () => {
  console.log(`🦥 SlothTidy server running at http://localhost:${PORT}`);
  console.log(`📁 Default sandbox path: ${DEFAULT_SANDBOX_DIR}`);
  console.log(`🤖 Connected to local Ollama on: ${OLLAMA_HOST}`);
});
