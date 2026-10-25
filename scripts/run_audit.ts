/**
 * Audit Runner Script
 * Executes the CoreAuditEngine, writes root output.csv, and runs evaluation.
 */
import fs from 'fs';
import path from 'path';
import { CoreAuditEngine } from '../src/audit_engine/core_engine';
import { AuditEvaluator } from '../src/audit_engine/evaluator';

async function main() {
  const repoRoot = process.cwd();
  const datasetDir = path.join(repoRoot, 'dataset');

  console.log('=== GHOSTTRACE AI AUDIT ENGINE ===');
  console.log('Dataset root:', datasetDir);

  const engine = new CoreAuditEngine(datasetDir);
  engine.loadDatasets();

  console.log('\n--- Generating Official output.csv (518 Cases) ---');
  const csvContent = engine.generateOutputCsvContent();
  const outputPath = path.join(repoRoot, 'output.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf8');

  const rows = csvContent.trim().split('\n');
  console.log(`Generated output.csv with ${rows.length} lines (${rows.length - 1} data rows).`);

  if (rows.length - 1 !== 518) {
    console.error(`WARNING: Expected exactly 518 data rows, but got ${rows.length - 1}`);
  } else {
    console.log('SUCCESS: Exactly 518 data rows generated.');
  }

  console.log('\n--- Running Evaluation Lab ---');
  const evaluator = new AuditEvaluator(engine, repoRoot);
  const evalResults = evaluator.runEvaluation();

  console.log('\n=== EVALUATION RESULTS ===');
  console.log(`Case Status Accuracy: ${evalResults.status_accuracy}%`);
  console.log(`Exact Sequence Accuracy: ${evalResults.exact_sequence_accuracy}%`);
  console.log(`Step Precision: ${evalResults.step_precision}`);
  console.log(`Step Recall: ${evalResults.step_recall}`);
  console.log(`Step F1 Score: ${evalResults.step_f1}`);
  console.log(`Field Accuracy: ${evalResults.field_accuracy}%`);
  console.log(`Evidence Validity: ${evalResults.evidence_reference_validity}%`);
  console.log(`Schema Validity: ${evalResults.schema_validity}`);
  console.log(`Synthetic Test Cases Passed: ${evalResults.custom_cases.filter(c => c.passed).length}/${evalResults.custom_cases.length}`);
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
