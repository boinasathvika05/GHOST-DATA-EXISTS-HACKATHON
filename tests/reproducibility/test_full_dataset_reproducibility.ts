/**
 * GhostTrace AI — Full Dataset Reproducibility & Determinism Test Suite (Phase 6)
 * Validates deterministic execution, file counts, and idempotent output generation.
 */
import fs from 'fs';
import path from 'path';
import { CoreAuditEngine } from '../../src/audit_engine/core_engine';

export function runFullDatasetReproducibilityTest() {
  const repoRoot = process.cwd();
  const datasetDir = path.join(repoRoot, 'dataset');

  console.log('\n======================================================');
  console.log('PHASE 6: FULL DATASET REPRODUCIBILITY & DETERMINISM');
  console.log('======================================================');

  // 1. Audit Run 1
  const engine1 = new CoreAuditEngine(datasetDir);
  engine1.loadDatasets();
  const run1Content = engine1.generateOutputCsvContent();

  // 2. Audit Run 2 (Fresh engine instance)
  const engine2 = new CoreAuditEngine(datasetDir);
  engine2.loadDatasets();
  const run2Content = engine2.generateOutputCsvContent();

  const isIdentical = run1Content === run2Content;
  const run1Lines = run1Content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const dataRowsCount = run1Lines.length - 1;

  console.log(`Run 1 Data Rows Generated:     ${dataRowsCount}`);
  console.log(`Run 2 Data Rows Generated:     ${run2Content.split(/\r?\n/).filter((l) => l.trim().length > 0).length - 1}`);
  console.log(`Deterministic Bit-for-Bit Identical: ${isIdentical ? '✓ TRUE (100% Deterministic)' : '✗ FALSE (Non-deterministic drift detected)'}`);

  // Count dataset files
  const evidenceFiles = fs.readFileSync(path.join(datasetDir, 'evidence_files.csv'), 'utf8').split('\n').filter(Boolean).length - 1;
  const deletionRequests = fs.readFileSync(path.join(datasetDir, 'deletion_requests.csv'), 'utf8').split('\n').filter(Boolean).length - 1;
  const userIdentities = fs.readFileSync(path.join(datasetDir, 'user_identities.csv'), 'utf8').split('\n').filter(Boolean).length - 1;
  const auditLogs = fs.readFileSync(path.join(datasetDir, 'user_audit_log.csv'), 'utf8').split('\n').filter(Boolean).length - 1;
  const systemActivity = fs.readFileSync(path.join(datasetDir, 'system_activity.csv'), 'utf8').split('\n').filter(Boolean).length - 1;

  console.log('\nSupplied Dataset Metrics:');
  console.log(`  - Deletion Requests:         ${deletionRequests}`);
  console.log(`  - Evidence File Manifest:    ${evidenceFiles}`);
  console.log(`  - User Identities:           ${userIdentities}`);
  console.log(`  - Historical Audit Logs:     ${auditLogs}`);
  console.log(`  - System Activity Log Rows:  ${systemActivity}`);

  const passed = isIdentical && dataRowsCount === 518;
  console.log(`\nPhase 6 Result: ${passed ? '✓ PASS' : '✗ FAIL'}\n`);

  return {
    passed,
    isIdentical,
    dataRowsCount,
    evidenceFiles,
    deletionRequests,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFullDatasetReproducibilityTest();
}
