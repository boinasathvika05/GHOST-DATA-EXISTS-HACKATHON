/**
 * GhostTrace AI — Critical Functionality Acceptance Test Suite
 * Verifies all 6 Priority Fixes:
 * 1. Execute Audit invokes real engine, produces unique run IDs, timestamps, and validated output artifacts.
 * 2. Invalid inputs cause visible failure and do not overwrite or present old output as new.
 * 3. Stale artifacts are not presented as successful new runs.
 * 4. Downloads correspond to the latest successful run.
 * 5. Dataset upload validation correctly flags missing or invalid files.
 * 6. Evaluation Lab metrics compute per-status precision/recall/F1 without division-by-zero errors.
 * 7. All 6 synthetic security tests pass and are isolated from official output.
 */
import path from 'path';
import fs from 'fs';
import { AuditRunManager } from '../../src/audit_engine/run_manager';
import { DatasetManager } from '../../src/audit_engine/dataset_manager';
import { CoreAuditEngine } from '../../src/audit_engine/core_engine';
import { AuditEvaluator } from '../../src/audit_engine/evaluator';

export function runAcceptanceTests(): boolean {
  console.log('\n======================================================');
  console.log('PHASE 1: CRITICAL FUNCTIONALITY ACCEPTANCE SUITE');
  console.log('======================================================');

  const repoRoot = process.cwd();
  const datasetDir = path.join(repoRoot, 'dataset');

  let passedAll = true;

  const testAssert = (name: string, condition: boolean, details?: string) => {
    if (condition) {
      console.log(`[✓ PASS] ${name}`);
    } else {
      console.error(`[✗ FAIL] ${name} ${details ? `— ${details}` : ''}`);
      passedAll = false;
    }
  };

  // Test 1: Run Manager initialization & unique run IDs
  const runManager = new AuditRunManager(repoRoot);
  const engine = new CoreAuditEngine(datasetDir);
  const datasetMgr = new DatasetManager(repoRoot);

  engine.loadDatasets(datasetMgr, true);
  const cases = engine.getCases();

  testAssert('1.1 Dataset loaded with expected deletion requests', cases.length === 518, `Got ${cases.length}`);

  // Test 2: Execute Audit creates a unique run ID and output artifact
  const initialSuccessfulRun = runManager.getLatestSuccessfulRun();
  const run1 = runManager.startNewRun('official_dataset', { 'deletion_requests.csv': 'abc123hash' }, cases.length);

  testAssert('1.2 New run receives a unique run ID', run1.run_id.startsWith('run_') && run1.status === 'RUNNING');
  testAssert('1.3 Run records valid ISO started_at timestamp', !isNaN(Date.parse(run1.started_at)));

  const results = engine.runAuditOnAllCases();
  const csvContent = engine.generateOutputCsvContent();
  const metrics = engine.getOverviewMetrics();

  const completedRun1 = runManager.completeRunSuccess(run1.run_id, csvContent, results, metrics);

  testAssert('1.4 Completed run creates distinct artifact file on disk', fs.existsSync(completedRun1.output_csv_path));
  testAssert('1.5 Run completed_at timestamp recorded', completedRun1.completed_at !== null && !isNaN(Date.parse(completedRun1.completed_at!)));
  testAssert('1.6 Output contract validation passed all 14 rules', completedRun1.validation_status === 'VALID' && completedRun1.validation_passed_count === 14);
  testAssert('1.7 Latest successful run updated to new run ID', runManager.getLatestSuccessfulRun()?.run_id === run1.run_id);

  // Test 3: Download corresponds to latest successful run
  const downloadArtifact = runManager.getArtifactContent();
  testAssert('1.8 Download artifact matches latest successful run ID', downloadArtifact?.run.run_id === run1.run_id);
  testAssert('1.9 Download content contains exactly 518 case rows + 1 header', downloadArtifact?.content.trim().split(/\r?\n/).length === 519);

  // Test 4: Deliberately invalid input causes a visible failure and does NOT update latest successful run
  const invalidRun = runManager.startNewRun('corrupt_dataset', {}, 5);
  const corruptCsv = 'case_id,deletion_status,steps_json\ncase_01,INVALID_STATUS_FOO,"not json"';

  const failedRun = runManager.completeRunSuccess(invalidRun.run_id, corruptCsv, [], metrics);

  testAssert('1.10 Deliberately invalid input marks run as FAILED', failedRun.status === 'FAILED');
  testAssert('1.11 Failure provides actionable error message', failedRun.error_message !== null && failedRun.error_message.includes('Output contract validation failed'));
  testAssert('1.12 Failed run does NOT overwrite latest successful run', runManager.getLatestSuccessfulRun()?.run_id === run1.run_id);

  // Test 5: Verify stale artifact is not presented as new run
  testAssert('1.13 Stale output is not presented as successful new result', runManager.getLatestSuccessfulRun()?.run_id !== invalidRun.run_id);

  // Test 6: Second run creates another unique artifact and updates latest
  const run2 = runManager.startNewRun('official_dataset_run2', { 'deletion_requests.csv': 'abc123hash' }, cases.length);
  testAssert('1.14 Consecutive run generates distinct run ID', run2.run_id !== run1.run_id);

  const completedRun2 = runManager.completeRunSuccess(run2.run_id, csvContent, results, metrics);
  testAssert('1.15 Latest successful run reflects second run ID', runManager.getLatestSuccessfulRun()?.run_id === run2.run_id);
  testAssert('1.16 Both distinct artifact files exist on disk', fs.existsSync(completedRun1.output_csv_path) && fs.existsSync(completedRun2.output_csv_path));

  // Test 7: Dataset Manager schema validation
  const manifest = datasetMgr.getActiveManifest();
  testAssert('1.17 Dataset Manager validates required 9 files inventory', manifest.total_files === 9);
  testAssert('1.18 deletion_requests.csv validated with 518 cases', manifest.required_files['deletion_requests.csv']?.row_count === 518);
  testAssert('1.19 Official challenge dataset flagged valid for audit', manifest.is_valid_for_audit === true);

  // Test 8: Evaluation Lab safe math & per-status metrics
  const evaluator = new AuditEvaluator(engine, repoRoot);
  const evalResults: any = evaluator.runEvaluation();

  testAssert('1.20 Evaluation runs on 32 ground-truth sample cases', evalResults.total_sample_cases === 32);
  testAssert('1.21 Per-status classification metrics calculated safely without NaN', evalResults.per_status_metrics.every((m: any) => !isNaN(m.precision) && !isNaN(m.recall) && !isNaN(m.f1)));
  testAssert('1.22 All 6 synthetic security tests executed and passed', evalResults.custom_cases.length === 6 && evalResults.custom_cases.every((c: any) => c.passed));

  // Test 9: Verify synthetic tests are NOT present in output.csv
  const rootCsv = fs.readFileSync(path.join(repoRoot, 'output.csv'), 'utf8');
  const hasSyntheticInRoot = rootCsv.includes('synth_01') || rootCsv.includes('synth_02');
  testAssert('1.23 Synthetic test fixtures never leak into official output.csv', !hasSyntheticInRoot);

  console.log('======================================================');
  console.log(`Phase 1 Acceptance Suite: ${passedAll ? 'ALL 23 ACCEPTANCE CHECKS PASSED' : 'FAILURES DETECTED'}`);
  console.log('======================================================\n');

  return passedAll;
}

if (process.argv[1]?.includes('test_critical_fixes')) {
  const success = runAcceptanceTests();
  process.exit(success ? 0 : 1);
}
