/**
 * GhostTrace AI — Policy & Edge Case Test Suite (E01 - E20)
 * Evaluates deletion policy logic, state machines, temporal cutoffs,
 * identity correlation, and remediation ordering.
 */
import path from 'path';
import { CoreAuditEngine } from '../../src/audit_engine/core_engine';
import { POLICY_EDGE_FIXTURES } from '../fixtures/policy_fixtures';
import { PHASE_SORT_ORDER, OPERATION_SORT_ORDER } from '../../src/audit_engine/policy_rules';

export interface PolicyTestResult {
  test_id: string;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export function runPolicyEdgeTests(): PolicyTestResult[] {
  const results: PolicyTestResult[] = [];
  const repoRoot = process.cwd();
  const datasetDir = path.join(repoRoot, 'dataset');
  const engine = new CoreAuditEngine(datasetDir);
  engine.loadDatasets();

  console.log('\n======================================================');
  console.log('PHASE 3: DELETION POLICY & EDGE CASE TEST SUITE (E01 - E20)');
  console.log('======================================================');

  // Helper to verify ordering
  const isStrictlyOrdered = (steps: any[]) => {
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1];
      const curr = steps[i];

      const prevPhase = PHASE_SORT_ORDER[prev.phase] ?? 99;
      const currPhase = PHASE_SORT_ORDER[curr.phase] ?? 99;

      if (prevPhase > currPhase) return false;
      if (prevPhase === currPhase) {
        const prevOp = OPERATION_SORT_ORDER[prev.operation] ?? 99;
        const currOp = OPERATION_SORT_ORDER[curr.operation] ?? 99;
        if (prevOp > currOp) return false;
      }
    }
    return true;
  };

  // Run E01 to E20
  for (const [key, fixture] of Object.entries(POLICY_EDGE_FIXTURES)) {
    const testId = key.split('_')[0]; // e.g. E01, E02...
    const auditRes = engine.auditCase(fixture.request);

    let passed = true;
    const failures: string[] = [];

    // 1. Status Check
    if (auditRes.deletion_status !== fixture.expected_status) {
      passed = false;
      failures.push(`Status mismatch: expected '${fixture.expected_status}', got '${auditRes.deletion_status}'`);
    }

    // 2. Exact step count check (e.g. for NOT_APPLICABLE)
    if (fixture.expected_step_count_exact !== undefined) {
      if (auditRes.steps.length !== fixture.expected_step_count_exact) {
        passed = false;
        failures.push(`Expected exactly ${fixture.expected_step_count_exact} steps, got ${auditRes.steps.length}`);
      }
    }

    // 3. Minimum step count check
    if (fixture.expected_step_count_min !== undefined) {
      if (auditRes.steps.length < fixture.expected_step_count_min) {
        passed = false;
        failures.push(`Expected at least ${fixture.expected_step_count_min} steps, got ${auditRes.steps.length}`);
      }
    }

    // 4. Consecutive numbering starting at 1
    if (auditRes.steps.length > 0) {
      for (let i = 0; i < auditRes.steps.length; i++) {
        if (auditRes.steps[i].step_no !== i + 1) {
          passed = false;
          failures.push(`Step number not consecutive: index ${i} has step_no ${auditRes.steps[i].step_no}`);
          break;
        }
      }
    }

    // 5. Remediation & Verification Phase checks
    if (fixture.expected_status === 'INCOMPLETE') {
      const hasFinding = auditRes.steps.some((s) => s.phase === 'FINDING');
      const hasRemediation = auditRes.steps.some((s) => s.phase === 'REMEDIATION');
      const hasVerification = auditRes.steps.some((s) => s.phase === 'VERIFICATION');
      if (!hasFinding || !hasRemediation || !hasVerification) {
        passed = false;
        failures.push(`Incomplete case missing three-phase completeness (F:${hasFinding}, R:${hasRemediation}, V:${hasVerification})`);
      }

      // Check empty evidence_id for proposed remediation and post-remediation verification
      const badEvidence = auditRes.steps.some(
        (s) => (s.phase === 'REMEDIATION' || s.phase === 'VERIFICATION') && s.evidence_id !== ''
      );
      if (badEvidence) {
        passed = false;
        failures.push('Future remediation or verification steps in INCOMPLETE case contain non-empty evidence_id');
      }
    }

    // 6. Ordering check
    if (!isStrictlyOrdered(auditRes.steps)) {
      passed = false;
      failures.push('Steps violated strict phase -> operation sort ordering');
    }

    results.push({
      test_id: testId,
      name: fixture.name,
      category: 'Policy & Edge Cases',
      passed,
      expected: `Status: ${fixture.expected_status}`,
      actual: `Status: ${auditRes.deletion_status} (${auditRes.steps.length} steps)`,
      details: failures.length > 0 ? failures.join('; ') : fixture.description,
    });
  }

  // Print results summary
  results.forEach((r) => {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${symbol}] ${r.test_id}: ${r.name}`);
    if (!r.passed) {
      console.log(`       Details:  ${r.details}`);
      console.log(`       Expected: ${r.expected}`);
      console.log(`       Actual:   ${r.actual}`);
    }
  });

  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\nPhase 3 Summary: ${passedCount}/${total} Deletion Policy & Edge Case Tests Passed.\n`);

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPolicyEdgeTests();
}
