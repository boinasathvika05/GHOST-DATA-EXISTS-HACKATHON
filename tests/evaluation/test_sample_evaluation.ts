/**
 * GhostTrace AI — Sample Dataset Benchmark Evaluator (Phase 5)
 * Runs ground-truth evaluation against dataset/sample_output.csv across 32 sample cases.
 */
import path from 'path';
import { CoreAuditEngine } from '../../src/audit_engine/core_engine';
import { AuditEvaluator } from '../../src/audit_engine/evaluator';

export function runSampleEvaluation() {
  const repoRoot = process.cwd();
  const datasetDir = path.join(repoRoot, 'dataset');
  const engine = new CoreAuditEngine(datasetDir);
  engine.loadDatasets();

  const evaluator = new AuditEvaluator(engine, repoRoot);

  console.log('\n======================================================');
  console.log('PHASE 5: SAMPLE GROUND-TRUTH EVALUATION (sample_output.csv)');
  console.log('======================================================');

  const result = evaluator.runEvaluation();

  console.log(`Evaluated Sample Cases:        ${result.total_sample_cases}`);
  console.log(`Status Matches:                ${result.matched_cases} / ${result.total_sample_cases}`);
  console.log(`Status Accuracy:               ${result.status_accuracy}%`);
  console.log(`Exact Sequence Accuracy:       ${result.exact_sequence_accuracy}%`);
  console.log(`Step Precision:                ${result.step_precision}`);
  console.log(`Step Recall:                   ${result.step_recall}`);
  console.log(`Step F1 Score:                 ${result.step_f1}`);
  console.log(`Field-Level Accuracy:          ${result.field_accuracy}%`);
  console.log(`Evidence Citation Validity:    ${result.evidence_reference_validity}%`);
  console.log(`JSON Schema Validity:          ${result.schema_validity ? '100% Valid' : 'Invalid'}`);
  console.log(`Missing Sample Cases:          ${result.missing_cases}`);
  console.log(`Duplicate Sample Cases:        ${result.duplicate_cases}`);
  console.log(`\nSynthetic Test Vectors Passed: ${result.custom_cases.filter((c) => c.passed).length} / ${result.custom_cases.length}`);

  if (result.failures.length > 0) {
    console.log('\nTop Discrepancies / Discrepancy Samples:');
    result.failures.slice(0, 5).forEach((f, idx) => console.log(`  [${idx + 1}] ${f}`));
  }

  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSampleEvaluation();
}
