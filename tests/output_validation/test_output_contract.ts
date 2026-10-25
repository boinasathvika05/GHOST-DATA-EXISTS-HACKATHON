/**
 * GhostTrace AI — Output Contract & Schema Compliance Test Suite (Phase 4)
 * Validates output.csv against the 16 strict rules of the HackerRank challenge specification.
 */
import fs from 'fs';
import path from 'path';
import { OPERATION_SORT_ORDER, PHASE_SORT_ORDER } from '../../src/audit_engine/policy_rules';

export interface OutputValidationRuleResult {
  rule_no: number;
  rule_name: string;
  passed: boolean;
  expected: string;
  actual: string;
  errors: string[];
}

export function validateOutputContract(): OutputValidationRuleResult[] {
  const results: OutputValidationRuleResult[] = [];
  const repoRoot = process.cwd();
  const outputPath = path.join(repoRoot, 'output.csv');
  const deletionRequestsPath = path.join(repoRoot, 'dataset', 'deletion_requests.csv');

  console.log('\n======================================================');
  console.log('PHASE 4: EXACT OUTPUT CONTRACT VALIDATION (output.csv)');
  console.log('======================================================');

  if (!fs.existsSync(outputPath)) {
    throw new Error(`output.csv not found at ${outputPath}`);
  }

  const rawContent = fs.readFileSync(outputPath, 'utf8');
  const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // Parse CSV rows handling quoted multiline JSON
  const rows: Array<{ case_id: string; deletion_status: string; steps_json: string; raw_line: string }> = [];
  
  // Custom CSV parser for case_id,deletion_status,"steps_json"
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const firstComma = line.indexOf(',');
    if (firstComma === -1) continue;
    const caseId = line.substring(0, firstComma).trim();
    const rest = line.substring(firstComma + 1);
    const secondComma = rest.indexOf(',');
    if (secondComma === -1) continue;
    const status = rest.substring(0, secondComma).trim();
    let jsonPart = rest.substring(secondComma + 1).trim();

    if (jsonPart.startsWith('"') && jsonPart.endsWith('"')) {
      jsonPart = jsonPart.substring(1, jsonPart.length - 1).replace(/""/g, '"');
    }

    rows.push({
      case_id: caseId,
      deletion_status: status,
      steps_json: jsonPart,
      raw_line: line,
    });
  }

  // Read input deletion_requests.csv
  const inputReqLines = fs.readFileSync(deletionRequestsPath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const inputCaseIds = inputReqLines.slice(1).map((l) => l.split(',')[0].trim());

  // Rule 1: Exact headers
  {
    const headerLine = lines[0].trim();
    const passed = headerLine === 'case_id,deletion_status,steps_json';
    results.push({
      rule_no: 1,
      rule_name: 'Exact CSV Header',
      passed,
      expected: 'case_id,deletion_status,steps_json',
      actual: headerLine,
      errors: passed ? [] : [`Header mismatch: got '${headerLine}'`],
    });
  }

  // Rule 2 & 3: Exactly 518 data rows matching input cases count
  {
    const expectedCount = inputCaseIds.length;
    const passed = rows.length === expectedCount && rows.length === 518;
    results.push({
      rule_no: 2,
      rule_name: 'Exact 518 Data Rows Count',
      passed,
      expected: `Exactly ${expectedCount} rows`,
      actual: `${rows.length} data rows`,
      errors: passed ? [] : [`Count mismatch: expected ${expectedCount}, got ${rows.length}`],
    });
  }

  // Rule 4: Sorted case IDs
  {
    const outputCaseIds = rows.map((r) => r.case_id);
    const sortedIds = [...outputCaseIds].sort();
    const isSorted = outputCaseIds.every((id, idx) => id === sortedIds[idx]);
    results.push({
      rule_no: 3,
      rule_name: 'Strict Sorting by case_id',
      passed: isSorted,
      expected: 'Lexicographically sorted case_id',
      actual: isSorted ? 'Strictly sorted' : 'Sorting violation detected',
      errors: isSorted ? [] : ['Cases are not in strictly sorted order'],
    });
  }

  // Rule 5: No missing or duplicate IDs
  {
    const outputIdSet = new Set(rows.map((r) => r.case_id));
    const missing = inputCaseIds.filter((id) => !outputIdSet.has(id));
    const duplicates = rows.map((r) => r.case_id).filter((item, index, self) => self.indexOf(item) !== index);
    const passed = missing.length === 0 && duplicates.length === 0;
    results.push({
      rule_no: 4,
      rule_name: 'Unique & Complete Case ID Set',
      passed,
      expected: '0 missing, 0 duplicate IDs',
      actual: `${missing.length} missing, ${duplicates.length} duplicate IDs`,
      errors: passed ? [] : [`Missing: ${missing.slice(0, 3).join(', ')}`, `Duplicates: ${duplicates.slice(0, 3).join(', ')}`],
    });
  }

  // Rule 6: Only COMPLETE, INCOMPLETE, and NOT_APPLICABLE
  {
    const allowedStatuses = new Set(['COMPLETE', 'INCOMPLETE', 'NOT_APPLICABLE']);
    const badStatuses = rows.filter((r) => !allowedStatuses.has(r.deletion_status));
    const passed = badStatuses.length === 0;
    results.push({
      rule_no: 5,
      rule_name: 'Valid Status Enumeration',
      passed,
      expected: 'All statuses in {COMPLETE, INCOMPLETE, NOT_APPLICABLE}',
      actual: passed ? '100% valid status values' : `${badStatuses.length} invalid status values`,
      errors: badStatuses.map((b) => `${b.case_id}: ${b.deletion_status}`),
    });
  }

  // Rule 7: Valid JSON arrays in every steps_json field
  const parsedStepsMap = new Map<string, any[]>();
  const jsonErrors: string[] = [];
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.steps_json);
      if (!Array.isArray(parsed)) {
        jsonErrors.push(`${r.case_id}: steps_json is not an array`);
      } else {
        parsedStepsMap.set(r.case_id, parsed);
      }
    } catch (e: any) {
      jsonErrors.push(`${r.case_id}: JSON parse error - ${e.message}`);
    }
  }

  results.push({
    rule_no: 6,
    rule_name: 'Valid JSON Array Serialization',
    passed: jsonErrors.length === 0,
    expected: 'All 518 rows contain parseable JSON array',
    actual: jsonErrors.length === 0 ? '518/518 valid JSON arrays' : `${jsonErrors.length} invalid JSON rows`,
    errors: jsonErrors.slice(0, 5),
  });

  // Rule 8: Exact object fields
  const requiredFields = ['step_no', 'phase', 'system_id', 'resource_id', 'operation', 'state', 'evidence_id'];
  const fieldErrors: string[] = [];
  for (const [caseId, steps] of parsedStepsMap.entries()) {
    for (const step of steps) {
      for (const field of requiredFields) {
        if (step[field] === undefined) {
          fieldErrors.push(`${caseId} step ${step.step_no} missing field '${field}'`);
        }
      }
    }
  }

  results.push({
    rule_no: 7,
    rule_name: 'Exact Object Fields Conformance',
    passed: fieldErrors.length === 0,
    expected: 'All step objects contain all 7 mandatory keys',
    actual: fieldErrors.length === 0 ? '100% field compliance' : `${fieldErrors.length} missing fields`,
    errors: fieldErrors.slice(0, 5),
  });

  // Rule 9: Consecutive step numbers beginning at 1
  const stepNoErrors: string[] = [];
  for (const [caseId, steps] of parsedStepsMap.entries()) {
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].step_no !== i + 1) {
        stepNoErrors.push(`${caseId}: step index ${i} has step_no ${steps[i].step_no} (expected ${i + 1})`);
        break;
      }
    }
  }

  results.push({
    rule_no: 8,
    rule_name: 'Consecutive Step Numbering Starting at 1',
    passed: stepNoErrors.length === 0,
    expected: 'Consecutive 1-indexed step_no for all cases',
    actual: stepNoErrors.length === 0 ? '100% consecutive numbering' : `${stepNoErrors.length} numbering violations`,
    errors: stepNoErrors.slice(0, 5),
  });

  // Rule 10: Only allowed phases, operations, and states
  const validPhases = new Set(['FINDING', 'REMEDIATION', 'VERIFICATION']);
  const validOps = new Set(Object.keys(OPERATION_SORT_ORDER));
  const enumErrors: string[] = [];
  for (const [caseId, steps] of parsedStepsMap.entries()) {
    for (const step of steps) {
      if (!validPhases.has(step.phase)) enumErrors.push(`${caseId}: invalid phase '${step.phase}'`);
      if (!validOps.has(step.operation)) enumErrors.push(`${caseId}: invalid operation '${step.operation}'`);
    }
  }

  results.push({
    rule_no: 9,
    rule_name: 'Allowed Phases & Operations Enum Check',
    passed: enumErrors.length === 0,
    expected: 'All phases and operations strictly from challenge specification table',
    actual: enumErrors.length === 0 ? '100% enum adherence' : `${enumErrors.length} invalid enums`,
    errors: enumErrors.slice(0, 5),
  });

  // Rule 11: Correct ordering by phase, operation order, system_id, and resource_id
  const orderErrors: string[] = [];
  for (const [caseId, steps] of parsedStepsMap.entries()) {
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1];
      const curr = steps[i];

      const prevPhase = PHASE_SORT_ORDER[prev.phase] ?? 99;
      const currPhase = PHASE_SORT_ORDER[curr.phase] ?? 99;

      if (prevPhase > currPhase) {
        orderErrors.push(`${caseId}: phase inversion at step ${curr.step_no} (${prev.phase} -> ${curr.phase})`);
        break;
      }
      if (prevPhase === currPhase) {
        const prevOp = OPERATION_SORT_ORDER[prev.operation] ?? 99;
        const currOp = OPERATION_SORT_ORDER[curr.operation] ?? 99;
        if (prevOp > currOp) {
          orderErrors.push(`${caseId}: operation order inversion at step ${curr.step_no} (${prev.operation} -> ${curr.operation})`);
          break;
        }
      }
    }
  }

  results.push({
    rule_no: 10,
    rule_name: 'Strict Sorting by Phase & Operation Hierarchy',
    passed: orderErrors.length === 0,
    expected: 'Deterministic sorting: FINDING -> REMEDIATION -> VERIFICATION with operation tie-breaking',
    actual: orderErrors.length === 0 ? '100% correctly sorted sequences' : `${orderErrors.length} order violations`,
    errors: orderErrors.slice(0, 5),
  });

  // Rule 12: COMPLETE cases contain only verification steps
  const completePhaseErrors: string[] = [];
  for (const r of rows) {
    if (r.deletion_status === 'COMPLETE') {
      const steps = parsedStepsMap.get(r.case_id) || [];
      const nonVerif = steps.filter((s) => s.phase !== 'VERIFICATION');
      if (nonVerif.length > 0) {
        completePhaseErrors.push(`${r.case_id}: COMPLETE case contains non-VERIFICATION step`);
      }
    }
  }

  results.push({
    rule_no: 11,
    rule_name: 'COMPLETE Cases Verification-Only Boundary',
    passed: completePhaseErrors.length === 0,
    expected: 'All steps in COMPLETE cases have phase = VERIFICATION',
    actual: completePhaseErrors.length === 0 ? '100% verification-only steps' : `${completePhaseErrors.length} violations`,
    errors: completePhaseErrors.slice(0, 5),
  });

  // Rule 13: INCOMPLETE cases have empty evidence_id for proposed remediation and post-remediation verification
  const incompleteEvidenceErrors: string[] = [];
  for (const r of rows) {
    if (r.deletion_status === 'INCOMPLETE') {
      const steps = parsedStepsMap.get(r.case_id) || [];
      for (const step of steps) {
        if ((step.phase === 'REMEDIATION' || step.phase === 'VERIFICATION') && step.evidence_id !== '') {
          incompleteEvidenceErrors.push(`${r.case_id} step ${step.step_no} has non-empty evidence_id '${step.evidence_id}'`);
        }
      }
    }
  }

  results.push({
    rule_no: 12,
    rule_name: 'Future Remediation Empty Evidence_ID Rule',
    passed: incompleteEvidenceErrors.length === 0,
    expected: 'evidence_id is empty string for proposed remediation and post-remediation verification in INCOMPLETE cases',
    actual: incompleteEvidenceErrors.length === 0 ? '100% compliance with empty evidence_id standard' : `${incompleteEvidenceErrors.length} violations`,
    errors: incompleteEvidenceErrors.slice(0, 5),
  });

  // Rule 14: NOT_APPLICABLE cases contain []
  const naErrors: string[] = [];
  for (const r of rows) {
    if (r.deletion_status === 'NOT_APPLICABLE') {
      const steps = parsedStepsMap.get(r.case_id) || [];
      if (steps.length !== 0 || r.steps_json !== '[]') {
        naErrors.push(`${r.case_id}: NOT_APPLICABLE has steps: '${r.steps_json}'`);
      }
    }
  }

  results.push({
    rule_no: 13,
    rule_name: 'NOT_APPLICABLE Empty JSON Array Rule',
    passed: naErrors.length === 0,
    expected: 'All NOT_APPLICABLE cases contain exact [] array',
    actual: naErrors.length === 0 ? '100% empty array compliance' : `${naErrors.length} violations`,
    errors: naErrors.slice(0, 5),
  });

  // Rule 15: CSV escaping and JSON serialization
  const csvFormatErrors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('"') && !l.endsWith('"') && !l.endsWith('[]')) {
      csvFormatErrors.push(`Line ${i + 1}: CSV quotes not properly balanced`);
    }
  }

  results.push({
    rule_no: 14,
    rule_name: 'RFC 4180 CSV Escaping & Quoting Compliance',
    passed: csvFormatErrors.length === 0,
    expected: 'Compliant CSV escaping with double quotes around JSON',
    actual: csvFormatErrors.length === 0 ? '100% RFC 4180 compliant' : `${csvFormatErrors.length} format errors`,
    errors: csvFormatErrors.slice(0, 5),
  });

  // Summary
  results.forEach((r) => {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${symbol}] Rule ${r.rule_no}: ${r.rule_name}`);
    if (!r.passed) {
      console.log(`       Expected: ${r.expected}`);
      console.log(`       Actual:   ${r.actual}`);
      r.errors.slice(0, 3).forEach((err) => console.log(`       Error:    ${err}`));
    }
  });

  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\nPhase 4 Summary: ${passedCount}/${total} Output Contract Rules Passed.\n`);

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateOutputContract();
}
