/**
 * GhostTrace AI — UI API Regression & Endpoint Verification (Phase 8)
 * Tests all backend routes powering the frontend UI tabs, metrics, filters, and downloads.
 */

async function testUIEndpoints() {
  const baseUrl = 'http://localhost:3000';
  console.log('\n======================================================');
  console.log('PHASE 8: UI REGRESSION & ENDPOINT VERIFICATION');
  console.log('======================================================');

  const tests = [
    { name: 'Overview Metrics API', path: '/api/overview', method: 'GET', expectJson: true },
    { name: 'Cases List API (All 518)', path: '/api/cases', method: 'GET', expectJson: true, checkCount: 518 },
    { name: 'Filtered Cases (INCOMPLETE)', path: '/api/cases?status=INCOMPLETE', method: 'GET', expectJson: true },
    { name: 'Evidence Manifest API (94 files)', path: '/api/evidence', method: 'GET', expectJson: true, checkCount: 94 },
    { name: 'Identity & Resource Graph API', path: '/api/graph', method: 'GET', expectJson: true },
    { name: 'Evaluation Lab Results API', path: '/api/evaluation', method: 'GET', expectJson: true },
    { name: 'Token Usage & Cost Accounting API', path: '/api/usage', method: 'GET', expectJson: true },
    { name: 'Deletion Policy Rules API', path: '/api/policy', method: 'GET', expectJson: true },
    { name: 'Download output.csv', path: '/api/download/output.csv', method: 'GET', expectFile: true },
    { name: 'Download evaluation_report.md', path: '/api/download/evaluation_report.md', method: 'GET', expectFile: true },
    { name: 'Download usage_report.md', path: '/api/download/usage_report.md', method: 'GET', expectFile: true },
    { name: 'Download code.zip Archive', path: '/api/download/code.zip', method: 'GET', expectFile: true },
  ];

  let passed = 0;

  for (const t of tests) {
    try {
      const res = await fetch(`${baseUrl}${t.path}`);
      if (!res.ok) {
        console.log(`[✗ FAIL] ${t.name}: HTTP ${res.status}`);
        continue;
      }

      if (t.expectJson) {
        const data = await res.json();
        if (t.checkCount !== undefined) {
          const count = Array.isArray(data) ? data.length : data.total || data.cases?.length || data.manifest?.length;
          if (count !== t.checkCount) {
            console.log(`[✗ FAIL] ${t.name}: expected count ${t.checkCount}, got ${count}`);
            continue;
          }
        }
      } else if (t.expectFile) {
        const blob = await res.arrayBuffer();
        if (blob.byteLength === 0) {
          console.log(`[✗ FAIL] ${t.name}: empty file payload`);
          continue;
        }
      }

      console.log(`[✓ PASS] ${t.name} (${t.path})`);
      passed++;
    } catch (e: any) {
      console.log(`[✗ FAIL] ${t.name}: ${e.message}`);
    }
  }

  console.log(`\nPhase 8 Summary: ${passed}/${tests.length} UI & API Endpoints Verified.\n`);
  return passed === tests.length;
}

testUIEndpoints().then((success) => {
  if (!success) process.exit(1);
});
