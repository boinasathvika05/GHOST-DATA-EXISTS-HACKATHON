/**
 * GhostTrace AI — Full-Stack Server
 * Express application mounting Vite middlewares in development.
 * Provides REST APIs for case audits, dataset & evidence uploads, run management,
 * evaluation laboratory, and direct file downloads (output.csv, reports, code.zip).
 */
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import { CoreAuditEngine } from './src/audit_engine/core_engine';
import { AuditEvaluator } from './src/audit_engine/evaluator';
import { DELETION_RULES } from './src/audit_engine/policy_rules';
import { AuditRunManager } from './src/audit_engine/run_manager';
import { DatasetManager } from './src/audit_engine/dataset_manager';

export const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const repoRoot = process.cwd();
const datasetDir = path.join(repoRoot, 'dataset');

// Support larger payloads for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Managers
export const datasetManager = new DatasetManager(repoRoot);
export const runManager = new AuditRunManager(repoRoot);
export const auditEngine = new CoreAuditEngine(datasetDir);
auditEngine.loadDatasets(datasetManager);

export const evaluator = new AuditEvaluator(auditEngine, repoRoot);

// Ensure initial run of evaluation and official output.csv if missing
try {
  const rootOutput = path.join(repoRoot, 'output.csv');
  if (!fs.existsSync(rootOutput)) {
    console.log('Generating initial output.csv...');
    const results = auditEngine.runAuditOnAllCases();
    const csvContent = auditEngine.generateOutputCsvContent();
    const metrics = auditEngine.getOverviewMetrics();
    const initialRun = runManager.startNewRun('dataset/deletion_requests.csv', {}, results.length);
    runManager.completeRunSuccess(initialRun.run_id, csvContent, results, metrics);
  }
  evaluator.runEvaluation();
} catch (e: any) {
  console.warn('Initial setup warning:', e.message);
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Overview Metrics (Authoritative latest run metrics)
app.get('/api/overview', (req: Request, res: Response) => {
  try {
    const latestSuccessful = runManager.getLatestSuccessfulRun();
    if (latestSuccessful && latestSuccessful.metrics) {
      return res.json({
        ...latestSuccessful.metrics,
        latest_run_id: latestSuccessful.run_id,
        latest_run_timestamp: latestSuccessful.completed_at,
        validation_status: latestSuccessful.validation_status,
        output_filename: latestSuccessful.output_filename,
        output_bytes: latestSuccessful.output_bytes,
      });
    }
    const metrics = auditEngine.getOverviewMetrics();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Cases List (with filtering and pagination)
app.get('/api/cases', (req: Request, res: Response) => {
  try {
    const { status, search, limit = '50', offset = '0', sampleOnly } = req.query;
    const isSample = sampleOnly === 'true';
    const allCases = isSample ? auditEngine.runAuditOnSampleCases() : auditEngine.runAuditOnAllCases();

    let filtered = allCases;

    if (status && status !== 'ALL') {
      filtered = filtered.filter((c) => c.deletion_status === status);
    }

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.request_text.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const l = parseInt(String(limit), 10);
    const o = parseInt(String(offset), 10);
    const pageItems = filtered.slice(o, o + l);

    const latestSuccessful = runManager.getLatestSuccessfulRun();

    res.json({
      total,
      limit: l,
      offset: o,
      cases: pageItems,
      latest_run_id: latestSuccessful?.run_id || null,
      latest_run_timestamp: latestSuccessful?.completed_at || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Single Case Details
app.get('/api/cases/:id', (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const caseResult = auditEngine.getCaseById(caseId);
    if (!caseResult) {
      return res.status(404).json({ error: `Case ${caseId} not found` });
    }
    res.json(caseResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Evidence Manifest & Explorer
app.get('/api/evidence', (req: Request, res: Response) => {
  try {
    const manifest = auditEngine.getEvidenceManifest();
    const records = datasetManager.getEvidenceRecords();
    res.json({
      manifest,
      evidence_records: records,
      total_count: manifest.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/evidence/:fileId/content', (req: Request, res: Response) => {
  try {
    const fileId = req.params.fileId;
    const manifest = auditEngine.getEvidenceManifest().find((m) => m.file_id === fileId);
    if (!manifest) {
      return res.status(404).json({ error: 'Evidence file not found' });
    }
    const fullPath = path.join(datasetDir, manifest.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Evidence file missing on disk' });
    }

    if (fullPath.endsWith('.pdf')) {
      return res.json({ type: 'pdf', note: 'PDF document artifact', path: manifest.file_path });
    }
    if (fullPath.endsWith('.png')) {
      return res.json({ type: 'image', note: 'UI console screenshot', path: manifest.file_path });
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({
      file_id: fileId,
      path: manifest.file_path,
      origin: manifest.origin,
      captured_at: manifest.captured_at,
      content: content.slice(0, 100000),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Identity & Evidence Graph Data
app.get('/api/graph', (req: Request, res: Response) => {
  try {
    const cases = auditEngine.runAuditOnAllCases().slice(0, 30);
    const nodes: any[] = [];
    const nodeSet = new Set<string>();

    const addNode = (node: any) => {
      if (!nodeSet.has(node.id)) {
        nodeSet.add(node.id);
        nodes.push(node);
      }
    };
    const edgeMap = new Map<string, { id: string; source: string; target: string; label: string; risk?: boolean }>();
    const addEdge = (edge: { id: string; source: string; target: string; label: string; risk?: boolean }) => {
      const existing = edgeMap.get(edge.id);
      if (existing) {
        if (edge.risk) existing.risk = true;
      } else {
        edgeMap.set(edge.id, edge);
      }
    };

    const systems = [
      { id: 'sys:account_service', label: 'Account Service', type: 'system' },
      { id: 'sys:search_service', label: 'Search Cluster', type: 'system' },
      { id: 'sys:analytics_platform', label: 'Analytics Platform', type: 'system' },
      { id: 'sys:backup_service', label: 'Disaster Recovery Backups', type: 'system' },
      { id: 'sys:integration_service', label: 'Connector Gateway', type: 'system' },
      { id: 'sys:support_platform', label: 'Support Service', type: 'system' },
      { id: 'sys:security_service', label: 'Security & Audit Archive', type: 'system' },
    ];
    systems.forEach(addNode);

    for (const c of cases) {
      const uNodeId = `usr:${c.case_id}`;
      addNode({
        id: uNodeId,
        label: c.email,
        type: 'identity',
        status: c.deletion_status,
      });

      for (const step of c.steps) {
        const rNodeId = `res:${step.resource_id}`;
        addNode({
          id: rNodeId,
          label: step.resource_id,
          type: step.resource_id.startsWith('data_flow_')
            ? 'data_flow'
            : step.resource_id.startsWith('backup_')
            ? 'backup'
            : 'resource',
          system_id: step.system_id,
          status: step.state,
        });

        addEdge({
          id: `e:${uNodeId}-${rNodeId}`,
          source: uNodeId,
          target: rNodeId,
          label: step.operation,
          risk: step.phase === 'FINDING',
        });

        const sysId = `sys:${step.system_id}`;
        if (nodeSet.has(sysId)) {
          addEdge({
            id: `e:${rNodeId}-${sysId}`,
            source: rNodeId,
            target: sysId,
            label: 'hosted_in',
          });
        }
      }
    }

    const edges = Array.from(edgeMap.values());
    res.json({ nodes, edges });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Evaluation Lab Results (with detailed metrics & failure explorer)
app.get('/api/evaluation', (req: Request, res: Response) => {
  try {
    const results = evaluator.runEvaluation();
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/evaluation/run', (req: Request, res: Response) => {
  try {
    const { sampleReqPath, sampleTruthPath } = req.body || {};
    const results = evaluator.runEvaluation(sampleReqPath, sampleTruthPath);
    res.json({
      success: true,
      status: 'ok',
      results,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, status: 'error', error: err.message });
  }
});

// 7. Token Usage & Cost
app.get('/api/usage', (req: Request, res: Response) => {
  try {
    const usage = evaluator.getUsageReportData();
    const models = usage.per_model_breakdown.map((m) => ({
      model_name: m.model,
      calls: m.calls,
      prompt_tokens: m.input_tokens,
      completion_tokens: m.output_tokens,
      total_tokens: m.total_tokens,
      cost_usd: m.cost_usd,
    }));

    const callsBreakdown = [
      {
        task: 'Final 518-Case Production Run (code/main.py)',
        target: 'Deterministic SQLite, ReportLab CMap PDF, Log & Graph Engine (0 live LLM calls)',
        prompt_tokens: 0,
        completion_tokens: 0,
        latency_ms: 2600,
        cost_usd: 0,
      },
      {
        task: 'Cached UI Screenshot Fixtures (11 files)',
        target: 'dataset/evidence/extracted_images/*.json (offline pre-extracted cache; 0 runtime calls)',
        prompt_tokens: 0,
        completion_tokens: 0,
        latency_ms: 0,
        cost_usd: 0,
      },
    ];

    const fullUsage = {
      ...usage,
      total_cost_usd: usage.estimated_cost_usd,
      total_tokens: usage.total_tokens,
      total_prompt_tokens: usage.input_tokens,
      total_completion_tokens: usage.output_tokens,
      total_calls: usage.model_calls,
      models,
      calls_breakdown: callsBreakdown,
    };

    res.json(fullUsage);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Policy Rules
app.get('/api/policy', (req: Request, res: Response) => {
  res.json(DELETION_RULES);
});

// 9. Execute Audit (Priority 1: Real Regeneration & Artifact Management)
app.post('/api/audit/run', (req: Request, res: Response) => {
  try {
    console.log('Initiating forensic audit run with active dataset manifest...');
    const activeManifest = datasetManager.getActiveManifest();

    if (!activeManifest.is_valid_for_audit) {
      return res.status(400).json({
        success: false,
        status: 'error',
        error: `Active dataset is not valid for audit: ${activeManifest.validation_errors.join('; ')}`,
      });
    }

    // Hash active input files
    const hashes: Record<string, string> = {};
    for (const [fname, finfo] of Object.entries(activeManifest.required_files)) {
      if (finfo.status === 'Validated') {
        hashes[fname] = finfo.file_hash;
      }
    }

    // Force reload datasets in auditEngine from active dataset
    auditEngine.loadDatasets(datasetManager, true);

    const cases = auditEngine.getCases();
    if (cases.length === 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        error: 'No deletion requests found in active dataset.',
      });
    }

    // Start tracking run
    const runRecord = runManager.startNewRun(activeManifest.name, hashes, cases.length);

    try {
      // Execute audit across cases
      const results = auditEngine.runAuditOnAllCases();
      const csvContent = auditEngine.generateOutputCsvContent();
      const metrics = auditEngine.getOverviewMetrics();

      // Complete run and write artifact
      const completedRun = runManager.completeRunSuccess(runRecord.run_id, csvContent, results, metrics);

      if (completedRun.status === 'FAILED') {
        return res.status(422).json({
          success: false,
          status: 'error',
          error: completedRun.error_message,
          run: completedRun,
        });
      }

      // Run evaluation grader
      const evalResult = evaluator.runEvaluation();

      res.json({
        success: true,
        status: 'ok',
        message: `Audit executed successfully. Processed ${results.length} cases. Created artifact ${completedRun.output_filename}.`,
        run_id: completedRun.run_id,
        run: completedRun,
        metrics,
        evalResult,
        total_cases: results.length,
      });
    } catch (runErr: any) {
      const failed = runManager.completeRunFailure(runRecord.run_id, runErr.message);
      return res.status(500).json({
        success: false,
        status: 'error',
        error: `Audit execution failed: ${runErr.message}`,
        run: failed,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, status: 'error', error: err.message });
  }
});

// 10. Run Manager Info & History
app.get('/api/runs/latest', (req: Request, res: Response) => {
  try {
    const latest = runManager.getLatestRun();
    const latestSuccess = runManager.getLatestSuccessfulRun();
    const activeManifest = datasetManager.getActiveManifest();
    res.json({
      latest_run: latest,
      latest_successful_run: latestSuccess,
      active_dataset: activeManifest,
      total_runs: runManager.getRunHistory().length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/runs/history', (req: Request, res: Response) => {
  res.json({ runs: runManager.getRunHistory() });
});

// 11. Dataset & Evidence Management (Priority 2)
app.get('/api/dataset/manifest', (req: Request, res: Response) => {
  try {
    const manifest = datasetManager.getActiveManifest();
    res.json(manifest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dataset/upload', (req: Request, res: Response) => {
  try {
    const { fileName, content, sizeBytes } = req.body;
    if (!fileName || content === undefined) {
      return res.status(400).json({ error: 'Missing fileName or content' });
    }

    const fileInfo = datasetManager.handleFileUpload(fileName, content, sizeBytes || content.length);
    const activeManifest = datasetManager.getActiveManifest();

    res.json({
      success: true,
      file: fileInfo,
      manifest: activeManifest,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dataset/activate', (req: Request, res: Response) => {
  try {
    const { manifestName } = req.body || {};
    const manifest = datasetManager.activateDataset(manifestName);

    // Reload audit engine with new manifest
    auditEngine.loadDatasets(datasetManager, true);

    res.json({
      success: true,
      manifest,
      message: `Active dataset switched to '${manifest.name}' with ${manifest.total_cases_count} cases.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dataset/preview/:fileName', (req: Request, res: Response) => {
  try {
    const fileName = req.params.fileName;
    const manifest = datasetManager.getActiveManifest();
    const fileInfo = manifest.required_files[fileName];
    if (!fileInfo) {
      return res.status(404).json({ error: `File ${fileName} not found in manifest` });
    }
    res.json(fileInfo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. File Downloads (Priority 1: Serves official output.csv as text/csv attachment)
app.get(
  ['/output.csv', '/output.csv.html', '/download/output.csv', '/api/download/output', '/api/download/output.csv'],
  (req: Request, res: Response) => {
    // 1. Check for real output.csv on disk in repoRoot
    const rootPath = path.join(repoRoot, 'output.csv');
    if (fs.existsSync(rootPath)) {
      res.setHeader('Content-Disposition', 'attachment; filename="output.csv"');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.sendFile(rootPath);
    }

    // 2. Fallback to latest verified run artifact
    const artifact = runManager.getArtifactContent();
    if (artifact && artifact.content) {
      res.setHeader('Content-Disposition', 'attachment; filename="output.csv"');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('X-Run-ID', artifact.run.run_id);
      res.setHeader('X-Completed-At', artifact.run.completed_at || '');
      return res.send(artifact.content);
    }

    return res.status(404).type('text/plain').send('output.csv not found. Run python3 code/main.py or execute an audit first.');
  }
);

app.get('/api/download/artifacts/:runId', (req: Request, res: Response) => {
  const runId = req.params.runId;
  const artifact = runManager.getArtifactContent(runId);
  if (!artifact) {
    return res.status(404).json({ error: `Artifact for run ${runId} not found` });
  }
  res.setHeader('Content-Disposition', `attachment; filename="${artifact.run.output_filename}"`);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('X-Run-ID', artifact.run.run_id);
  res.send(artifact.content);
});

app.get(['/api/download/evaluation-report', '/api/download/evaluation_report.md'], (req: Request, res: Response) => {
  const filePath = path.join(repoRoot, 'evaluation', 'evaluation_report.md');
  if (!fs.existsSync(filePath)) {
    evaluator.runEvaluation();
  }
  res.setHeader('Content-Disposition', 'attachment; filename="evaluation_report.md"');
  res.setHeader('Content-Type', 'text/markdown');
  res.sendFile(filePath);
});

app.get(['/api/download/usage-report', '/api/download/usage_report.md'], (req: Request, res: Response) => {
  const filePath = path.join(repoRoot, 'evaluation', 'usage_report.md');
  if (!fs.existsSync(filePath)) {
    evaluator.runEvaluation();
  }
  res.setHeader('Content-Disposition', 'attachment; filename="usage_report.md"');
  res.setHeader('Content-Type', 'text/markdown');
  res.sendFile(filePath);
});

// 13. Complete Codebase ZIP Download (code.zip)
app.get(['/api/download/code-zip', '/api/download/code.zip'], async (req: Request, res: Response) => {
  try {
    console.log('Generating code.zip archive...');
    const zip = new JSZip();

    const addDirToZip = (dirPath: string, zipFolder: JSZip) => {
      if (!fs.existsSync(dirPath)) return;
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        if (
          item === 'node_modules' ||
          item === 'dist' ||
          item === '.git' ||
          item === '__pycache__' ||
          item === '.venv' ||
          item.endsWith('.pyc') ||
          item.endsWith('.DS_Store') ||
          item.endsWith('.zip')
        ) {
          continue;
        }
        const full = path.join(dirPath, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          const sub = zipFolder.folder(item);
          if (sub) addDirToZip(full, sub);
        } else {
          zipFolder.file(item, fs.readFileSync(full));
        }
      }
    };

    addDirToZip(path.join(repoRoot, 'code'), zip.folder('code')!);
    addDirToZip(path.join(repoRoot, 'src'), zip.folder('src')!);
    addDirToZip(path.join(repoRoot, 'evaluation'), zip.folder('evaluation')!);
    addDirToZip(path.join(repoRoot, 'prompts'), zip.folder('prompts')!);
    addDirToZip(path.join(repoRoot, 'scripts'), zip.folder('scripts')!);
    addDirToZip(path.join(repoRoot, 'tests'), zip.folder('tests')!);

    const rootFiles = ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'README.md', 'metadata.json', 'server.ts'];
    for (const rf of rootFiles) {
      const p = path.join(repoRoot, rf);
      if (fs.existsSync(p)) {
        zip.file(rf, fs.readFileSync(p));
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(path.join(repoRoot, 'code.zip'), zipBuffer);
    res.setHeader('Content-Disposition', 'attachment; filename="code.zip"');
    res.setHeader('Content-Type', 'application/zip');
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Error generating code.zip:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// VITE DEV SERVER INTEGRATION & STANDALONE START
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(repoRoot, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GhostTrace AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);

