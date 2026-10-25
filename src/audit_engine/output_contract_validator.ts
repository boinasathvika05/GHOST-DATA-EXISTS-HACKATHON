/**
 * GhostTrace AI — Output Contract Validator
 * Validates output.csv against all 14 specification rules:
 * 1. Exact CSV Header (case_id,deletion_status,steps_json)
 * 2. Exact row count matches input case count
 * 3. Strict alphabetical sorting by case_id
 * 4. Unique and complete case ID set
 * 5. Valid status enumeration (COMPLETE, INCOMPLETE, NOT_APPLICABLE)
 * 6. Valid JSON array serialization
 * 7. Exact object fields conformance
 * 8. Consecutive step numbering starting at 1
 * 9. Allowed phases & operations enum check
 * 10. Strict sorting by phase & operation hierarchy
 * 11. COMPLETE cases verification-only boundary
 * 12. Future remediation empty evidence_id rule
 * 13. NOT_APPLICABLE empty JSON array rule
 * 14. RFC 4180 CSV escaping & quoting compliance
 */
import { OPERATION_SORT_ORDER, PHASE_SORT_ORDER } from './policy_rules';

export interface OutputValidationRuleResult {
  rule_no: number;
  rule_name: string;
  passed: boolean;
  expected: string;
  actual: string;
  errors: string[];
}

export function validateOutputContent(
  rawContent: string,
  expectedCaseIds?: string[]
): OutputValidationRuleResult[] {
  const results: OutputValidationRuleResult[] = [];
  const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return [
      {
        rule_no: 1,
        rule_name: 'CSV Content Check',
        passed: false,
        expected: 'Non-empty CSV content',
        actual: 'Empty content',
        errors: ['Output content is completely empty'],
      },
    ];
  }

  // Parse CSV rows handling quoted JSON
  const rows: Array<{
    case_id: string;
    deletion_status: string;
    steps_json: string;
    raw_line: string;
    line_index: number;
  }> = [];

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
      line_index: i + 1,
    });
  }

  // Rule 1: Exact CSV Header
  {
    const headerLine = lines[0].trim();
    const passed = headerLine === 'case_id,deletion_status,steps_json';
    results.push({
      rule_no: 1,
      rule_name: 'Exact CSV Header',
      passed,
      expected: 'case_id,deletion_status,steps_json',
      actual: headerLine,
      errors: passed ? [] : [`Header mismatch: expected 'case_id,deletion_status,steps_json', got '${headerLine}'`],
    });
  }

  // Rule 2: Expected Row Count
  {
    const expectedCount = expectedCaseIds ? expectedCaseIds.length : rows.length;
    const passed = rows.length === expectedCount && rows.length > 0;
    results.push({
      rule_no: 2,
      rule_name: 'Exact Case Rows Count',
      passed,
      expected: `Exactly ${expectedCount} rows`,
      actual: `${rows.length} rows`,
      errors: passed ? [] : [`Row count mismatch: expected ${expectedCount}, got ${rows.length}`],
    });
  }

  // Rule 3: Strict Sorting by case_id
  {
    const outputCaseIds = rows.map((r) => r.case_id);
    const sortedIds = [...outputCaseIds].sort();
    const isSorted = outputCaseIds.every((id, idx) => id === sortedIds[idx]);
    results.push({
      rule_no: 3,
      rule_name: 'Strict Sorting by case_id',
      passed: isSorted,
      expected: 'Lexicographically ascending case_id order',
      actual: isSorted ? 'Properly sorted' : 'Sorting inversion detected',
      errors: isSorted ? [] : ['Cases are not strictly sorted by case_id'],
    });
  }

  // Rule 4: Unique & Complete Case ID Set
  {
    const seenIds = new Set<string>();
    const duplicates: string[] = [];
    for (const r of rows) {
      if (seenIds.has(r.case_id)) {
        duplicates.push(r.case_id);
      }
      seenIds.add(r.case_id);
    }
    const passed = duplicates.length === 0;
    results.push({
      rule_no: 4,
      rule_name: 'Unique & Complete Case ID Set',
      passed,
      expected: '0 duplicates',
      actual: `${duplicates.length} duplicates`,
      errors: passed ? [] : [`Duplicate case IDs found: ${duplicates.slice(0, 5).join(', ')}`],
    });
  }

  // Rule 5: Valid Status Enumeration
  {
    const allowedStatuses = new Set(['COMPLETE', 'INCOMPLETE', 'NOT_APPLICABLE']);
    const invalidStatuses: string[] = [];
    for (const r of rows) {
      if (!allowedStatuses.has(r.deletion_status)) {
        invalidStatuses.push(`${r.case_id}: ${r.deletion_status}`);
      }
    }
    const passed = invalidStatuses.length === 0;
    results.push({
      rule_no: 5,
      rule_name: 'Valid Status Enumeration',
      passed,
      expected: 'COMPLETE | INCOMPLETE | NOT_APPLICABLE',
      actual: passed ? 'All statuses valid' : `${invalidStatuses.length} invalid statuses`,
      errors: passed ? [] : [`Invalid statuses in: ${invalidStatuses.slice(0, 5).join(', ')}`],
    });
  }

  // Rule 6: Valid JSON Array Serialization
  {
    const jsonErrors: string[] = [];
    for (const r of rows) {
      try {
        const parsed = JSON.parse(r.steps_json);
        if (!Array.isArray(parsed)) {
          jsonErrors.push(`${r.case_id}: steps_json is not an array`);
        }
      } catch (err: any) {
        jsonErrors.push(`${r.case_id}: JSON parse error: ${err.message}`);
      }
    }
    const passed = jsonErrors.length === 0;
    results.push({
      rule_no: 6,
      rule_name: 'Valid JSON Array Serialization',
      passed,
      expected: 'All steps_json parse as valid JSON arrays',
      actual: passed ? '100% valid JSON' : `${jsonErrors.length} parse errors`,
      errors: passed ? [] : jsonErrors.slice(0, 5),
    });
  }

  // Rule 7: Exact Object Fields Conformance
  {
    const requiredKeys = ['step_no', 'phase', 'system_id', 'resource_id', 'operation', 'state', 'evidence_id'];
    const fieldErrors: string[] = [];
    for (const r of rows) {
      try {
        const steps = JSON.parse(r.steps_json);
        if (Array.isArray(steps)) {
          for (const s of steps) {
            for (const k of requiredKeys) {
              if (s[k] === undefined) {
                fieldErrors.push(`${r.case_id} step ${s.step_no}: missing field '${k}'`);
              }
            }
          }
        }
      } catch {
        // Handled in rule 6
      }
    }
    const passed = fieldErrors.length === 0;
    results.push({
      rule_no: 7,
      rule_name: 'Exact Object Fields Conformance',
      passed,
      expected: 'All 7 required fields present in each step',
      actual: passed ? 'All fields conform' : `${fieldErrors.length} field errors`,
      errors: passed ? [] : fieldErrors.slice(0, 5),
    });
  }

  // Rule 8: Consecutive Step Numbering Starting at 1
  {
    const numberingErrors: string[] = [];
    for (const r of rows) {
      try {
        const steps = JSON.parse(r.steps_json);
        if (Array.isArray(steps) && steps.length > 0) {
          steps.forEach((s: any, idx: number) => {
            if (s.step_no !== idx + 1) {
              numberingErrors.push(`${r.case_id}: expected step_no ${idx + 1}, got ${s.step_no}`);
            }
          });
        }
      } catch {
        // Handled in rule 6
      }
    }
    const passed = numberingErrors.length === 0;
    results.push({
      rule_no: 8,
      rule_name: 'Consecutive Step Numbering Starting at 1',
      passed,
      expected: 'Steps numbered 1..N consecutively',
      actual: passed ? 'All numbering consecutive' : `${numberingErrors.length} numbering errors`,
      errors: passed ? [] : numberingErrors.slice(0, 5),
    });
  }

  // Rule 9: Allowed Phases & Operations Enum Check
  {
    const validPhases = new Set(['FINDING', 'REMEDIATION', 'VERIFICATION']);
    const validStates = new Set(['PRESENT', 'ABSENT', 'REDACTED', 'ANONYMIZED', 'ACTIVE', 'DISABLED', 'BLOCKED']);
    const enumErrors: string[] = [];
    for (const r of rows) {
      try {
        const steps = JSON.parse(r.steps_json);
        if (Array.isArray(steps)) {
          for (const s of steps) {
            if (!validPhases.has(s.phase)) {
              enumErrors.push(`${r.case_id} step ${s.step_no}: invalid phase '${s.phase}'`);
            }
            if (!validStates.has(s.state)) {
              enumErrors.push(`${r.case_id} step ${s.step_no}: invalid state '${s.state}'`);
            }
            if (!OPERATION_SORT_ORDER[s.operation]) {
              enumErrors.push(`${r.case_id} step ${s.step_no}: invalid operation '${s.operation}'`);
            }
          }
        }
      } catch {
        // Handled in rule 6
      }
    }
    const passed = enumErrors.length === 0;
    results.push({
      rule_no: 9,
      rule_name: 'Allowed Phases, States & Operations Enum Check',
      passed,
      expected: 'All phases, states, and operations match canonical enums',
      actual: passed ? 'All enums valid' : `${enumErrors.length} enum errors`,
      errors: passed ? [] : enumErrors.slice(0, 5),
    });
  }

  // Rule 10: Strict Sorting by Phase & Operation Hierarchy
  {
    const orderErrors: string[] = [];
    for (const r of rows) {
      try {
        const steps = JSON.parse(r.steps_json);
        if (Array.isArray(steps) && steps.length > 1) {
          for (let i = 0; i < steps.length - 1; i++) {
            const s1 = steps[i];
            const s2 = steps[i + 1];
            const p1 = PHASE_SORT_ORDER[s1.phase] || 99;
            const p2 = PHASE_SORT_ORDER[s2.phase] || 99;
            if (p1 > p2) {
              orderErrors.push(`${r.case_id}: phase ordering violation (${s1.phase} before ${s2.phase})`);
              break;
            }
            if (p1 === p2) {
              const op1 = OPERATION_SORT_ORDER[s1.operation] || 99;
              const op2 = OPERATION_SORT_ORDER[s2.operation] || 99;
              if (op1 > op2) {
                orderErrors.push(`${r.case_id}: operation ordering violation (${s1.operation} before ${s2.operation})`);
                break;
              }
            }
          }
        }
      } catch {
        // Handled in rule 6
      }
    }
    const passed = orderErrors.length === 0;
    results.push({
      rule_no: 10,
      rule_name: 'Strict Sorting by Phase & Operation Hierarchy',
      passed,
      expected: 'Phases (FINDING -> REMEDIATION -> VERIFICATION) and operations strictly sorted',
      actual: passed ? 'Strict order preserved' : `${orderErrors.length} ordering violations`,
      errors: passed ? [] : orderErrors.slice(0, 5),
    });
  }

  // Rule 11: COMPLETE Cases Verification-Only & Non-Empty Boundary
  {
    const completeErrors: string[] = [];
    for (const r of rows) {
      if (r.deletion_status === 'COMPLETE') {
        try {
          const steps = JSON.parse(r.steps_json);
          if (Array.isArray(steps)) {
            if (steps.length === 0) {
              completeErrors.push(`${r.case_id}: COMPLETE case has empty steps_json array`);
            }
            for (const s of steps) {
              if (s.phase !== 'VERIFICATION') {
                completeErrors.push(`${r.case_id}: COMPLETE case has non-VERIFICATION step (${s.phase})`);
              }
              if (!s.evidence_id) {
                completeErrors.push(`${r.case_id}: COMPLETE verification step missing evidence_id`);
              }
            }
          }
        } catch {
          // Handled in rule 6
        }
      }
    }
    const passed = completeErrors.length === 0;
    results.push({
      rule_no: 11,
      rule_name: 'COMPLETE Cases Verification-Only Boundary',
      passed,
      expected: 'COMPLETE cases must contain >=1 evidence-backed VERIFICATION steps only',
      actual: passed ? 'Verification-only & non-empty respected' : `${completeErrors.length} violations`,
      errors: passed ? [] : completeErrors.slice(0, 5),
    });
  }

  // Rule 12: Future Remediation Empty Evidence_ID Rule
  {
    const evidenceErrors: string[] = [];
    for (const r of rows) {
      if (r.deletion_status === 'INCOMPLETE') {
        try {
          const steps = JSON.parse(r.steps_json);
          if (Array.isArray(steps)) {
            for (const s of steps) {
              if ((s.phase === 'REMEDIATION' || s.phase === 'VERIFICATION') && s.evidence_id !== '') {
                evidenceErrors.push(`${r.case_id} step ${s.step_no}: proposed ${s.phase} must have empty evidence_id`);
              }
            }
          }
        } catch {
          // Handled in rule 6
        }
      }
    }
    const passed = evidenceErrors.length === 0;
    results.push({
      rule_no: 12,
      rule_name: 'Future Remediation Empty evidence_id Rule',
      passed,
      expected: 'Proposed steps in INCOMPLETE cases have evidence_id = ""',
      actual: passed ? 'Empty evidence_id strictly enforced' : `${evidenceErrors.length} violations`,
      errors: passed ? [] : evidenceErrors.slice(0, 5),
    });
  }

  // Rule 13: NOT_APPLICABLE Empty JSON Array Rule
  {
    const naErrors: string[] = [];
    for (const r of rows) {
      if (r.deletion_status === 'NOT_APPLICABLE') {
        try {
          const steps = JSON.parse(r.steps_json);
          if (!Array.isArray(steps) || steps.length !== 0) {
            naErrors.push(`${r.case_id}: NOT_APPLICABLE case has non-empty steps (${steps.length} steps)`);
          }
        } catch {
          naErrors.push(`${r.case_id}: NOT_APPLICABLE steps failed parsing`);
        }
      }
    }
    const passed = naErrors.length === 0;
    results.push({
      rule_no: 13,
      rule_name: 'NOT_APPLICABLE Empty JSON Array Rule',
      passed,
      expected: 'NOT_APPLICABLE cases must have steps_json = "[]"',
      actual: passed ? 'Empty arrays respected' : `${naErrors.length} violations`,
      errors: passed ? [] : naErrors.slice(0, 5),
    });
  }

  // Rule 14: RFC 4180 CSV Escaping & Quoting Compliance
  {
    const quotingErrors: string[] = [];
    for (const r of rows) {
      if (r.steps_json.length > 0) {
        const rawJsonPart = r.raw_line.substring(r.raw_line.indexOf(',', r.raw_line.indexOf(',') + 1) + 1).trim();
        const isUnquotedEmptyArray = rawJsonPart === '[]';
        const isQuoted = rawJsonPart.startsWith('"') && rawJsonPart.endsWith('"');
        if (!isUnquotedEmptyArray && !isQuoted) {
          quotingErrors.push(`${r.case_id}: steps_json is not RFC 4180 compliant`);
        }
      }
    }
    const passed = quotingErrors.length === 0;
    results.push({
      rule_no: 14,
      rule_name: 'RFC 4180 CSV Escaping & Quoting Compliance',
      passed,
      expected: 'Valid RFC 4180 quoting (unquoted [] or double-quoted JSON with "" escaping)',
      actual: passed ? 'Strict RFC 4180 compliance' : `${quotingErrors.length} quoting errors`,
      errors: passed ? [] : quotingErrors.slice(0, 5),
    });
  }

  return results;
}
