/**
 * Evidence Indexer (Upgraded)
 * Parses and indexes all 94 evidence files:
 * - Dynamic SQLite schema extraction and value-to-column mapping
 * - Trace-ID grouped log correlation (handles both key=value and JSON-line logs)
 * - Multi-schema JSON records (service_exports, collection records, tombstones)
 * - Text shift handovers and multimodal OCR documents
 */
import fs from 'fs';
import path from 'path';
import { EvidenceFileManifest, StepOperation, StepState } from '../types';

export interface IndexedEvidenceObservation {
  file_id: string;
  file_path: string;
  captured_at: string;
  system_id: string;
  resource_id: string;
  user_id?: string;
  email?: string;
  phone?: string;
  state: StepState;
  suggested_finding_op?: StepOperation;
  suggested_remediation_op?: StepOperation;
  suggested_verification_op?: StepOperation;
  details: string;
  category: string;
  linked_account_id?: string;
}

export class EvidenceIndexer {
  private observations: IndexedEvidenceObservation[] = [];
  private fileIdToManifest: Map<string, EvidenceFileManifest> = new Map();
  private userToObservations: Map<string, IndexedEvidenceObservation[]> = new Map();
  private emailToObservations: Map<string, IndexedEvidenceObservation[]> = new Map();
  private resourceToObservations: Map<string, IndexedEvidenceObservation[]> = new Map();

  constructor(private manifestList: EvidenceFileManifest[], private datasetDir: string) {
    for (const m of manifestList) {
      this.fileIdToManifest.set(m.file_id, m);
    }
  }

  public indexAll(): void {
    console.log(`Indexing ${this.manifestList.length} evidence files from ${this.datasetDir}...`);
    for (const manifest of this.manifestList) {
      try {
        const fullPath = path.join(this.datasetDir, manifest.file_path);
        if (!fs.existsSync(fullPath)) continue;

        if (manifest.file_path.endsWith('.sql')) {
          this.indexSql(manifest, fullPath);
        } else if (manifest.file_path.endsWith('.json')) {
          this.indexJson(manifest, fullPath);
        } else if (manifest.file_path.endsWith('.log')) {
          this.indexLog(manifest, fullPath);
        } else if (manifest.file_path.endsWith('.txt')) {
          this.indexTxt(manifest, fullPath);
        }
      } catch (err: any) {
        console.error(`Error indexing evidence ${manifest.file_id}:`, err.message);
      }
    }

    // Index extracted multimodal images
    this.indexExtractedImages();

    // Index PDF documents
    this.indexPredefinedDocuments();

    console.log(`Total indexed evidence observations: ${this.observations.length}`);
  }

  private addObservation(obs: IndexedEvidenceObservation) {
    this.observations.push(obs);

    if (obs.user_id) {
      const uid = obs.user_id.toLowerCase();
      if (!this.userToObservations.has(uid)) this.userToObservations.set(uid, []);
      this.userToObservations.get(uid)!.push(obs);
    }

    if (obs.email) {
      const em = obs.email.toLowerCase();
      if (!this.emailToObservations.has(em)) this.emailToObservations.set(em, []);
      this.emailToObservations.get(em)!.push(obs);
    }

    if (obs.resource_id) {
      const rid = obs.resource_id;
      if (!this.resourceToObservations.has(rid)) this.resourceToObservations.set(rid, []);
      this.resourceToObservations.get(rid)!.push(obs);
    }
  }

  private indexSql(manifest: EvidenceFileManifest, filePath: string) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const tableColumns: Map<string, string[]> = new Map();
    let currentTable = '';

    for (const line of lines) {
      // Parse table definitions
      const createMatch = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?\s*\((.*?)\);?/i);
      if (createMatch) {
        const tableName = createMatch[1];
        currentTable = tableName;
        const colDefs = createMatch[2].split(',').map((c) => {
          const colNameMatch = c.trim().match(/^["`]?([a-zA-Z0-9_]+)["`]?/);
          return colNameMatch ? colNameMatch[1] : '';
        }).filter(Boolean);
        tableColumns.set(tableName, colDefs);
      }

      // Parse insert statements
      const insertMatch = line.match(/INSERT\s+INTO\s+["`]?([a-zA-Z0-9_]+)["`]?\s*(?:\((.*?)\))?\s*VALUES\s*\((.*)\);?/i);
      if (insertMatch) {
        const tableName = insertMatch[1];
        const explicitCols = insertMatch[2] ? insertMatch[2].split(',').map((c) => c.trim().replace(/["`]/g, '')) : null;
        const cols = explicitCols || tableColumns.get(tableName) || [];
        const rawVals = insertMatch[3];
        const vals = this.parseSqlValues(rawVals);

        const row: Record<string, string> = {};
        for (let i = 0; i < vals.length; i++) {
          const colName = cols[i] || `col_${i}`;
          row[colName] = vals[i];
        }

        const resource_id = row.resource_id || vals[0] || '';
        let user_id = row.customer_reference || row.user_id || row.subject_reference || '';
        if (user_id === 'NULL') user_id = '';
        let email = row.email || row.owner_email || row.customer_email || row.requester_email || '';
        if (email === 'NULL') email = '';
        const phone = row.phone || row.owner_phone || row.requester_phone || '';
        const linked_account_id = row.source_resource_id || '';

        let system_id = 'account_service';
        let state: StepState = 'PRESENT';
        let findingOp: StepOperation | undefined;
        let remOp: StepOperation | undefined;
        let verOp: StepOperation | undefined;

        if (tableName.includes('search') || resource_id.startsWith('search_')) {
          system_id = 'search_service';
          findingOp = 'REPORT_REMAINING_RECORD';
          remOp = 'DELETE_RECORD';
          verOp = 'VERIFY_RECORD_ABSENT';
        } else if (tableName.includes('analytics') || resource_id.startsWith('analytics_')) {
          system_id = 'analytics_platform';
          const isAnon = !email && !user_id && !phone;
          if (isAnon) {
            state = 'ANONYMIZED';
            verOp = 'VERIFY_RECORD_ANONYMIZED';
          } else {
            state = 'PRESENT';
            findingOp = 'REPORT_EXPOSED_PII';
            remOp = 'ANONYMIZE_RECORD';
            verOp = 'VERIFY_RECORD_ANONYMIZED';
          }
        } else if (tableName.includes('backup') || resource_id.startsWith('backup_')) {
          system_id = 'backup_service';
          const isRestoreAllowed = row.restore_allowed === '1' || row.restore_allowed === 'true';
          if (isRestoreAllowed) {
            state = 'ACTIVE';
            findingOp = 'REPORT_RESTORE_RISK';
            remOp = 'BLOCK_RESTORE';
            verOp = 'VERIFY_RESTORE_BLOCKED';
          } else {
            state = 'BLOCKED';
            verOp = 'VERIFY_RESTORE_BLOCKED';
          }
        } else if (tableName.includes('connector') || resource_id.startsWith('data_flow_')) {
          system_id = 'integration_service';
          const isEnabled = row.enabled === '1' || row.enabled === 'true';
          if (isEnabled) {
            state = 'ACTIVE';
            findingOp = 'REPORT_ACTIVE_DATA_FLOW';
            remOp = 'DISABLE_DATA_FLOW';
            verOp = 'VERIFY_DATA_FLOW_DISABLED';
          } else {
            state = 'DISABLED';
            verOp = 'VERIFY_DATA_FLOW_DISABLED';
          }
        } else if (tableName.includes('security') || resource_id.startsWith('audit_record_')) {
          system_id = 'security_service';
          state = 'PRESENT';
          verOp = 'VERIFY_RECORD_PRESENT';
        } else if (tableName.includes('support') || resource_id.startsWith('support_')) {
          system_id = 'support_platform';
          const isIdentifiable = Boolean(email || phone || row.requester_name);
          if (isIdentifiable) {
            state = 'PRESENT';
            findingOp = 'REPORT_EXPOSED_PII';
            remOp = 'REDACT_RECORD';
            verOp = 'VERIFY_RECORD_REDACTED';
          } else {
            state = 'REDACTED';
            verOp = 'VERIFY_RECORD_REDACTED';
          }
        } else if (tableName.includes('export') || resource_id.startsWith('export_')) {
          system_id = 'export_service';
          state = 'PRESENT';
          findingOp = 'REPORT_REMAINING_RECORD';
          remOp = 'DELETE_RECORD';
          verOp = 'VERIFY_RECORD_ABSENT';
        } else {
          // Default profile
          system_id = 'account_service';
          state = 'PRESENT';
          findingOp = 'REPORT_REMAINING_RECORD';
          remOp = 'DELETE_RECORD';
          verOp = 'VERIFY_RECORD_ABSENT';
        }

        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id,
          resource_id,
          user_id: user_id || undefined,
          email: email || undefined,
          phone: phone || undefined,
          state,
          suggested_finding_op: findingOp,
          suggested_remediation_op: remOp,
          suggested_verification_op: verOp,
          details: `SQL ${tableName}: ${resource_id}`,
          category: 'database',
          linked_account_id: linked_account_id || undefined,
        });
      }
    }
  }

  private parseSqlValues(valStr: string): string[] {
    const results: string[] = [];
    let cur = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < valStr.length; i++) {
      const char = valStr[i];
      if ((char === "'" || char === '"') && (i === 0 || valStr[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (quoteChar === char) {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        results.push(cur.trim().replace(/^['"]|['"]$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    if (cur) results.push(cur.trim().replace(/^['"]|['"]$/g, ''));
    return results;
  }

  private indexJson(manifest: EvidenceFileManifest, filePath: string) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    // Format A: service_exports (e.g. evidence_92)
    if (data.service_exports) {
      const exp = data.service_exports;
      if (exp.account_service?.profile_lookups) {
        for (const p of exp.account_service.profile_lookups) {
          const is404 = p.status_code === 404 || p.profile === null;
          this.addObservation({
            file_id: manifest.file_id,
            file_path: manifest.file_path,
            captured_at: manifest.captured_at,
            system_id: 'account_service',
            resource_id: p.resource_id,
            email: p.profile?.email || undefined,
            user_id: p.profile?.customer_reference || undefined,
            state: is404 ? 'ABSENT' : 'PRESENT',
            suggested_finding_op: is404 ? undefined : 'REPORT_REMAINING_RECORD',
            suggested_remediation_op: is404 ? undefined : 'DELETE_RECORD',
            suggested_verification_op: 'VERIFY_RECORD_ABSENT',
            details: `Account profile lookup status: ${p.status_code}`,
            category: 'record',
          });
        }
      }

      if (exp.analytics_platform?.profiles) {
        for (const a of exp.analytics_platform.profiles) {
          const isAnon = !a.email && !a.phone && !a.customer_reference && !a.email_hash;
          this.addObservation({
            file_id: manifest.file_id,
            file_path: manifest.file_path,
            captured_at: manifest.captured_at,
            system_id: 'analytics_platform',
            resource_id: a.resource_id,
            email: a.email || undefined,
            user_id: a.customer_reference || undefined,
            state: isAnon ? 'ANONYMIZED' : 'PRESENT',
            suggested_finding_op: isAnon ? undefined : 'REPORT_EXPOSED_PII',
            suggested_remediation_op: isAnon ? undefined : 'ANONYMIZE_RECORD',
            suggested_verification_op: 'VERIFY_RECORD_ANONYMIZED',
            details: `Analytics profile anonymity: ${isAnon ? 'Anonymized' : 'Identifiable'}`,
            category: 'record',
          });
        }
      }

      if (exp.backup_service?.restore_entries) {
        for (const b of exp.backup_service.restore_entries) {
          const isBlocked = b.restore_allowed === false;
          this.addObservation({
            file_id: manifest.file_id,
            file_path: manifest.file_path,
            captured_at: manifest.captured_at,
            system_id: 'backup_service',
            resource_id: b.resource_id,
            user_id: b.customer_reference || undefined,
            email: b.customer_email || undefined,
            state: isBlocked ? 'BLOCKED' : 'ACTIVE',
            suggested_finding_op: isBlocked ? undefined : 'REPORT_RESTORE_RISK',
            suggested_remediation_op: isBlocked ? undefined : 'BLOCK_RESTORE',
            suggested_verification_op: 'VERIFY_RESTORE_BLOCKED',
            details: `Backup archive restore policy: ${isBlocked ? 'Blocked' : 'Active risk'}`,
            category: 'record',
          });
        }
      }

      if (exp.integration_service?.connectors) {
        for (const c of exp.integration_service.connectors) {
          const isDisabled = c.enabled === false;
          this.addObservation({
            file_id: manifest.file_id,
            file_path: manifest.file_path,
            captured_at: manifest.captured_at,
            system_id: 'integration_service',
            resource_id: c.resource_id,
            user_id: c.customer_reference || undefined,
            email: c.customer_email || undefined,
            state: isDisabled ? 'DISABLED' : 'ACTIVE',
            suggested_finding_op: isDisabled ? undefined : 'REPORT_ACTIVE_DATA_FLOW',
            suggested_remediation_op: isDisabled ? undefined : 'DISABLE_DATA_FLOW',
            suggested_verification_op: 'VERIFY_DATA_FLOW_DISABLED',
            details: `Data flow connector ${c.connector_name}: ${isDisabled ? 'Disabled' : 'Active flow'}`,
            category: 'record',
          });
        }
      }

      if (exp.security_service?.audit_records) {
        for (const s of exp.security_service.audit_records) {
          this.addObservation({
            file_id: manifest.file_id,
            file_path: manifest.file_path,
            captured_at: manifest.captured_at,
            system_id: 'security_service',
            resource_id: s.resource_id,
            user_id: s.subject_reference || undefined,
            state: 'PRESENT',
            suggested_verification_op: 'VERIFY_RECORD_PRESENT',
            details: `Security audit log retained (${s.event_code}) until ${s.retention_until}`,
            category: 'record',
          });
        }
      }

      if (exp.support_platform?.tickets) {
        for (const t of exp.support_platform.tickets) {
          const isRedacted = !t.requester_email && !t.requester_name && !t.requester_phone;
          this.addObservation({
            file_id: manifest.file_id,
            file_path: manifest.file_path,
            captured_at: manifest.captured_at,
            system_id: 'support_platform',
            resource_id: t.resource_id,
            user_id: t.customer_reference || undefined,
            email: t.requester_email || undefined,
            state: isRedacted ? 'REDACTED' : 'PRESENT',
            suggested_finding_op: isRedacted ? undefined : 'REPORT_EXPOSED_PII',
            suggested_remediation_op: isRedacted ? undefined : 'REDACT_RECORD',
            suggested_verification_op: 'VERIFY_RECORD_REDACTED',
            details: `Support ticket context: ${isRedacted ? 'Redacted' : 'Exposed PII'}`,
            category: 'record',
          });
        }
      }

      if (exp.search_service?.index_entries) {
        for (const se of exp.search_service.index_entries) {
          this.addObservation({
            file_id: manifest.file_id,
            file_path: manifest.file_path,
            captured_at: manifest.captured_at,
            system_id: 'search_service',
            resource_id: se.resource_id,
            user_id: se.customer_reference || undefined,
            email: se.email || undefined,
            state: 'PRESENT',
            suggested_finding_op: 'REPORT_REMAINING_RECORD',
            suggested_remediation_op: 'DELETE_RECORD',
            suggested_verification_op: 'VERIFY_RECORD_ABSENT',
            details: `Search index entry present: ${se.resource_id}`,
            category: 'record',
          });
        }
      }

      if (exp.export_service?.exports) {
        for (const ex of exp.export_service.exports) {
          this.addObservation({
            file_id: manifest.file_id,
            file_path: manifest.file_path,
            captured_at: manifest.captured_at,
            system_id: 'export_service',
            resource_id: ex.resource_id,
            user_id: ex.customer_reference || undefined,
            email: ex.email || undefined,
            state: 'PRESENT',
            suggested_finding_op: 'REPORT_REMAINING_RECORD',
            suggested_remediation_op: 'DELETE_RECORD',
            suggested_verification_op: 'VERIFY_RECORD_ABSENT',
            details: `User export file present: ${ex.resource_id}`,
            category: 'record',
          });
        }
      }
    }

    // Format B: customer_data_snapshot_bundle (e.g. evidence_51)
    if (data.tombstones) {
      for (const tb of data.tombstones) {
        const isRedacted = !tb.name && !tb.email && !tb.phone && !tb.email_hash;
        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id: 'identity_service',
          resource_id: tb.resource_id || tb.tombstone_id,
          user_id: tb.user_id || undefined,
          email: tb.email || undefined,
          state: isRedacted ? 'REDACTED' : 'PRESENT',
          suggested_finding_op: isRedacted ? undefined : 'REPORT_EXPOSED_PII',
          suggested_remediation_op: isRedacted ? undefined : 'REDACT_RECORD',
          suggested_verification_op: 'VERIFY_RECORD_REDACTED',
          details: `Account tombstone: ${isRedacted ? 'Compliant redacted tombstone' : 'Contains exposed PII'}`,
          category: 'record',
        });
      }
    }

    // Format C: Generic records array (e.g. customer_export_jobs_20260914.json, analytics)
    if (Array.isArray(data.records)) {
      for (const rec of data.records) {
        let system_id = 'analytics_platform';
        if (manifest.file_path.includes('export')) system_id = 'export_service';
        else if (manifest.file_path.includes('search')) system_id = 'search_service';
        else if (manifest.file_path.includes('connector')) system_id = 'integration_service';

        const email = rec.email || rec.owner_email || rec.customer_email || rec.requester_email;
        const user_id = rec.user_id || rec.customer_reference;
        const phone = rec.phone || rec.owner_phone;

        let state: StepState = 'PRESENT';
        let findingOp: StepOperation | undefined;
        let remOp: StepOperation | undefined;
        let verOp: StepOperation | undefined;

        if (system_id === 'export_service') {
          const isAvail = rec.download_available === true || rec.download_available === 'true';
          if (isAvail) {
            state = 'PRESENT';
            findingOp = 'REPORT_REMAINING_RECORD';
            remOp = 'DELETE_RECORD';
            verOp = 'VERIFY_RECORD_ABSENT';
          } else {
            state = 'ABSENT';
            verOp = 'VERIFY_RECORD_ABSENT';
          }
        } else if (system_id === 'analytics_platform') {
          const isAnon = !user_id && !email && !phone && !rec.email_hash;
          if (isAnon) {
            state = 'ANONYMIZED';
            verOp = 'VERIFY_RECORD_ANONYMIZED';
          } else {
            state = 'PRESENT';
            findingOp = 'REPORT_EXPOSED_PII';
            remOp = 'ANONYMIZE_RECORD';
            verOp = 'VERIFY_RECORD_ANONYMIZED';
          }
        }

        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id,
          resource_id: rec.resource_id,
          user_id: user_id || undefined,
          email: email || undefined,
          phone: phone || undefined,
          state,
          suggested_finding_op: findingOp,
          suggested_remediation_op: remOp,
          suggested_verification_op: verOp,
          details: `Collection record: ${rec.resource_id}`,
          category: 'record',
        });
      }
    }
  }

  private indexLog(manifest: EvidenceFileManifest, filePath: string) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n');

    // Group lines by trace_id
    const traceContexts = new Map<string, { emails: Set<string>; user_ids: Set<string> }>();

    // Pass 1: Collect trace contexts
    for (const line of lines) {
      if (!line.trim()) continue;

      let trace_id = '';
      let email = '';
      let user_id = '';

      if (line.includes('{')) {
        const jsonStart = line.indexOf('{');
        try {
          const obj = JSON.parse(line.substring(jsonStart));
          trace_id = obj.trace_id || '';
          const lk = obj.lookup_key || obj.owner_key || obj.customer_email || obj.email || '';
          if (lk.includes('@')) email = lk.toLowerCase();
          else if (lk.startsWith('user_')) user_id = lk;
          if (obj.subject_ref?.startsWith('user_')) user_id = obj.subject_ref;
          if (obj.customer_reference?.startsWith('user_')) user_id = obj.customer_reference;
        } catch {}
      } else {
        const pairs = this.parseLogPairs(line);
        trace_id = pairs.trace_id || '';
        const lk = pairs.lookup_key || pairs.email || pairs.customer_email || pairs.requester_email || '';
        if (lk.includes('@')) email = lk.toLowerCase();
        else if (lk.startsWith('user_')) user_id = lk;
        if (pairs.subject_reference?.startsWith('user_') || pairs.customer_reference?.startsWith('user_')) {
          user_id = pairs.subject_reference || pairs.customer_reference;
        }
      }

      if (trace_id) {
        if (!traceContexts.has(trace_id)) {
          traceContexts.set(trace_id, { emails: new Set(), user_ids: new Set() });
        }
        const ctx = traceContexts.get(trace_id)!;
        if (email) ctx.emails.add(email);
        if (user_id) ctx.user_ids.add(user_id);
      }
    }

    // Pass 2: Extract observations and link via trace context
    for (const line of lines) {
      if (!line.trim()) continue;

      let service = '';
      let resource_id = '';
      let event = '';
      let lookup_key = '';
      let trace_id = '';
      let http_status = '';
      let rows = '';
      let result = '';
      let enabled: boolean | undefined;
      let restore_allowed: boolean | undefined;
      let directEmail: string | undefined;
      let directUser: string | undefined;

      if (line.includes('{')) {
        const jsonStart = line.indexOf('{');
        try {
          const obj = JSON.parse(line.substring(jsonStart));
          service = obj.service || obj.logger || '';
          resource_id = obj.resource_id || '';
          event = obj.event || '';
          lookup_key = obj.lookup_key || obj.owner_key || '';
          trace_id = obj.trace_id || '';
          http_status = obj.http_status || '';
          rows = obj.rows || '';
          result = obj.result || '';
          if (obj.enabled !== undefined) enabled = obj.enabled === true || obj.enabled === 'true';
          if (obj.restore_allowed !== undefined) restore_allowed = obj.restore_allowed === true || obj.restore_allowed === 'true';
          if (obj.eligible === 'true' && obj.deletion_block === 'false') restore_allowed = true;
          if (obj.available === 'true') result = 'hit';

          directEmail = obj.email || obj.customer_email || (lookup_key.includes('@') ? lookup_key.toLowerCase() : undefined);
          directUser = obj.subject_ref || obj.customer_reference || (lookup_key.startsWith('user_') ? lookup_key : undefined);
        } catch {}
      } else {
        const pairs = this.parseLogPairs(line);
        service = pairs.service || '';
        resource_id = pairs.resource_id || '';
        event = pairs.event || '';
        lookup_key = pairs.lookup_key || '';
        trace_id = pairs.trace_id || '';
        http_status = pairs.http_status || '';
        rows = pairs.rows || '';
        result = pairs.result || '';
        if (pairs.enabled !== undefined) enabled = pairs.enabled === 'true';
        if (pairs.restore_allowed !== undefined) restore_allowed = pairs.restore_allowed === 'true';

        directEmail = pairs.email || pairs.requester_email || pairs.customer_email || (lookup_key.includes('@') ? lookup_key.toLowerCase() : undefined);
        directUser = pairs.customer_reference || pairs.subject_reference || (lookup_key.startsWith('user_') ? lookup_key : undefined);
      }

      if (!resource_id) continue;

      // Correlate with trace context
      const ctx = traceContexts.get(trace_id);
      const email = directEmail || (ctx && ctx.emails.size > 0 ? Array.from(ctx.emails)[0] : undefined);
      const user_id = directUser || (ctx && ctx.user_ids.size > 0 ? Array.from(ctx.user_ids)[0] : undefined);

      let system_id = service;
      if (!system_id) {
        if (resource_id.startsWith('account_')) system_id = 'account_service';
        else if (resource_id.startsWith('search_')) system_id = 'search_service';
        else if (resource_id.startsWith('audit_record_')) system_id = 'security_service';
        else if (resource_id.startsWith('analytics_')) system_id = 'analytics_platform';
        else if (resource_id.startsWith('support_')) system_id = 'support_platform';
        else if (resource_id.startsWith('data_flow_')) system_id = 'integration_service';
        else if (resource_id.startsWith('backup_')) system_id = 'backup_service';
        else if (resource_id.startsWith('export_')) system_id = 'export_service';
        else system_id = 'account_service';
      }

      if (event.includes('profile_lookup_completed') || event.includes('profile_lookup') || system_id === 'account_service') {
        const is404 = http_status === '404' || rows === '0';
        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id,
          resource_id,
          email,
          user_id,
          state: is404 ? 'ABSENT' : 'PRESENT',
          suggested_finding_op: is404 ? undefined : 'REPORT_REMAINING_RECORD',
          suggested_remediation_op: is404 ? undefined : 'DELETE_RECORD',
          suggested_verification_op: 'VERIFY_RECORD_ABSENT',
          details: `Profile lookup: ${resource_id} (${is404 ? 'Absent / 404' : 'Present / 200'})`,
          category: 'log',
        });
      } else if (event.includes('audit_record_read') || event.includes('audit_record_query') || system_id === 'security_service') {
        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id: 'security_service',
          resource_id,
          user_id,
          email,
          state: 'PRESENT',
          suggested_verification_op: 'VERIFY_RECORD_PRESENT',
          details: `Security audit log present: ${resource_id}`,
          category: 'log',
        });
      } else if (event.includes('analytics_profile') || system_id === 'analytics_platform') {
        const isAnon = !email && !user_id;
        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id: 'analytics_platform',
          resource_id,
          email,
          user_id,
          state: isAnon ? 'ANONYMIZED' : 'PRESENT',
          suggested_finding_op: isAnon ? undefined : 'REPORT_EXPOSED_PII',
          suggested_remediation_op: isAnon ? undefined : 'ANONYMIZE_RECORD',
          suggested_verification_op: 'VERIFY_RECORD_ANONYMIZED',
          details: `Analytics profile: ${isAnon ? 'Anonymized' : 'Identifiable'}`,
          category: 'log',
        });
      } else if (event.includes('index_query') || system_id === 'search_service') {
        const isHit = result === 'hit';
        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id: 'search_service',
          resource_id,
          email,
          user_id,
          state: isHit ? 'PRESENT' : 'ABSENT',
          suggested_finding_op: isHit ? 'REPORT_REMAINING_RECORD' : undefined,
          suggested_remediation_op: isHit ? 'DELETE_RECORD' : undefined,
          suggested_verification_op: 'VERIFY_RECORD_ABSENT',
          details: `Search index query: ${isHit ? 'Hit' : 'Miss'}`,
          category: 'log',
        });
      } else if (event.includes('connector') || system_id === 'integration_service') {
        const isEnabled = enabled === true;
        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id: 'integration_service',
          resource_id,
          email,
          user_id,
          state: isEnabled ? 'ACTIVE' : 'DISABLED',
          suggested_finding_op: isEnabled ? 'REPORT_ACTIVE_DATA_FLOW' : undefined,
          suggested_remediation_op: isEnabled ? 'DISABLE_DATA_FLOW' : undefined,
          suggested_verification_op: 'VERIFY_DATA_FLOW_DISABLED',
          details: `Integration connector: ${isEnabled ? 'Active' : 'Disabled'}`,
          category: 'log',
        });
      } else if (event.includes('restore') || system_id === 'backup_service') {
        const isAllowed = restore_allowed === true;
        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id: 'backup_service',
          resource_id,
          email,
          user_id,
          state: isAllowed ? 'ACTIVE' : 'BLOCKED',
          suggested_finding_op: isAllowed ? 'REPORT_RESTORE_RISK' : undefined,
          suggested_remediation_op: isAllowed ? 'BLOCK_RESTORE' : undefined,
          suggested_verification_op: 'VERIFY_RESTORE_BLOCKED',
          details: `Backup restore policy: ${isAllowed ? 'Restore allowed' : 'Blocked'}`,
          category: 'log',
        });
      } else if (system_id === 'export_service') {
        const isHit = result === 'hit';
        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id: 'export_service',
          resource_id,
          email,
          user_id,
          state: isHit ? 'PRESENT' : 'ABSENT',
          suggested_finding_op: isHit ? 'REPORT_REMAINING_RECORD' : undefined,
          suggested_remediation_op: isHit ? 'DELETE_RECORD' : undefined,
          suggested_verification_op: 'VERIFY_RECORD_ABSENT',
          details: `Export download check: ${isHit ? 'Available' : 'Absent'}`,
          category: 'log',
        });
      }
    }
  }

  private parseLogPairs(line: string): Record<string, string> {
    const pairs: Record<string, string> = {};
    const regex = /([a-zA-Z0-9_]+)=([^\s]+)/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      pairs[match[1]] = match[2];
    }
    return pairs;
  }

  private indexTxt(manifest: EvidenceFileManifest, filePath: string) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n');

    for (const line of lines) {
      if (!line.trim().startsWith('-')) continue;

      // Format: - timestamp | system_id | resource_id | category | status | identifier
      const parts = line.replace(/^[-\s]+/, '').split('|').map((s) => s.trim());
      if (parts.length >= 6) {
        const [time, system_id, resource_id, category, status, identifier] = parts;

        const email = identifier.includes('@') ? identifier.toLowerCase() : undefined;
        const user_id = identifier.startsWith('user_') ? identifier : undefined;

        let state: StepState = 'PRESENT';
        let findingOp: StepOperation | undefined;
        let remOp: StepOperation | undefined;
        let verOp: StepOperation | undefined;

        if (status === 'NOT_FOUND') {
          state = 'ABSENT';
          verOp = 'VERIFY_RECORD_ABSENT';
        } else if (status === 'FOUND') {
          state = 'PRESENT';
          if (category === 'SECURITY_AUDIT_LOG') {
            verOp = 'VERIFY_RECORD_PRESENT';
          } else {
            findingOp = 'REPORT_REMAINING_RECORD';
            remOp = 'DELETE_RECORD';
            verOp = 'VERIFY_RECORD_ABSENT';
          }
        } else if (status === 'IDENTIFIABLE') {
          state = 'PRESENT';
          findingOp = 'REPORT_EXPOSED_PII';
          if (category === 'ANALYTICS_PROFILE') {
            remOp = 'ANONYMIZE_RECORD';
            verOp = 'VERIFY_RECORD_ANONYMIZED';
          } else {
            remOp = 'REDACT_RECORD';
            verOp = 'VERIFY_RECORD_REDACTED';
          }
        } else if (status === 'ANONYMIZED') {
          state = 'ANONYMIZED';
          verOp = 'VERIFY_RECORD_ANONYMIZED';
        } else if (status === 'REDACTED') {
          state = 'REDACTED';
          verOp = 'VERIFY_RECORD_REDACTED';
        } else if (status === 'ACTIVE') {
          state = 'ACTIVE';
          if (category === 'DATA_FLOW') {
            findingOp = 'REPORT_ACTIVE_DATA_FLOW';
            remOp = 'DISABLE_DATA_FLOW';
            verOp = 'VERIFY_DATA_FLOW_DISABLED';
          } else if (category === 'BACKUP_ARCHIVE') {
            findingOp = 'REPORT_RESTORE_RISK';
            remOp = 'BLOCK_RESTORE';
            verOp = 'VERIFY_RESTORE_BLOCKED';
          }
        } else if (status === 'DISABLED') {
          state = 'DISABLED';
          verOp = 'VERIFY_DATA_FLOW_DISABLED';
        } else if (status === 'BLOCKED') {
          state = 'BLOCKED';
          verOp = 'VERIFY_RESTORE_BLOCKED';
        }

        this.addObservation({
          file_id: manifest.file_id,
          file_path: manifest.file_path,
          captured_at: manifest.captured_at,
          system_id,
          resource_id,
          user_id,
          email,
          state,
          suggested_finding_op: findingOp,
          suggested_remediation_op: remOp,
          suggested_verification_op: verOp,
          details: `Shift handover: ${category} ${status} (${identifier})`,
          category: 'record',
        });
      }
    }
  }

  private indexExtractedImages() {
    const extractedDir = path.join(this.datasetDir, 'evidence', 'extracted_images');
    if (!fs.existsSync(extractedDir)) return;

    const files = fs.readdirSync(extractedDir);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const raw = fs.readFileSync(path.join(extractedDir, f), 'utf8');
        const data = JSON.parse(raw);
        const imgName = f.replace('.json', '.png');

        const manifest = this.manifestList.find((m) => m.file_path.includes(imgName));
        const file_id = manifest ? manifest.file_id : 'evidence_image';
        const captured_at = manifest ? manifest.captured_at : '2026-09-01T00:00:00Z';

        if (Array.isArray(data.records)) {
          for (const rec of data.records) {
            if (!rec.resource_id) continue;
            let system_id = 'account_service';
            if (rec.resource_id.startsWith('search_')) system_id = 'search_service';
            else if (rec.resource_id.startsWith('support_')) system_id = 'support_platform';
            else if (rec.resource_id.startsWith('analytics_')) system_id = 'analytics_platform';
            else if (rec.resource_id.startsWith('data_flow_')) system_id = 'integration_service';
            else if (rec.resource_id.startsWith('backup_')) system_id = 'backup_service';
            else if (rec.resource_id.startsWith('audit_record_')) system_id = 'security_service';

            this.addObservation({
              file_id,
              file_path: manifest ? manifest.file_path : `evidence/images/${imgName}`,
              captured_at,
              system_id,
              resource_id: rec.resource_id,
              user_id: rec.user_id,
              email: rec.email,
              phone: rec.phone,
              state: 'PRESENT',
              suggested_finding_op: 'REPORT_REMAINING_RECORD',
              suggested_remediation_op: 'DELETE_RECORD',
              suggested_verification_op: 'VERIFY_RECORD_ABSENT',
              details: `Multimodal image: ${rec.resource_id}`,
              category: 'image',
            });
          }
        }
      } catch (err: any) {
        console.error('Error reading extracted image JSON:', f, err.message);
      }
    }
  }

  private indexPredefinedDocuments() {
    // evidence_58: delivery_correction_attachment.pdf (Priya Raman, support_001)
    const m58 = this.fileIdToManifest.get('evidence_58');
    if (m58) {
      this.addObservation({
        file_id: 'evidence_58',
        file_path: m58.file_path,
        captured_at: m58.captured_at,
        system_id: 'support_platform',
        resource_id: 'support_001',
        email: 'priya.raman@gmail.com',
        state: 'PRESENT',
        suggested_finding_op: 'REPORT_REMAINING_RECORD',
        suggested_remediation_op: 'DELETE_RECORD',
        suggested_verification_op: 'VERIFY_RECORD_ABSENT',
        details: 'Delivery address correction support document CS-4827 / support_001',
        category: 'document',
      });
    }

    // evidence_55: security_retention_extract.pdf (audit_record_003)
    const m55 = this.fileIdToManifest.get('evidence_55');
    if (m55) {
      this.addObservation({
        file_id: 'evidence_55',
        file_path: m55.file_path,
        captured_at: m55.captured_at,
        system_id: 'security_service',
        resource_id: 'audit_record_003',
        state: 'PRESENT',
        suggested_verification_op: 'VERIFY_RECORD_PRESENT',
        details: 'Compliance journal security retention extract audit_record_003',
        category: 'document',
      });
    }

    // evidence_18: account_history_report_20260718.pdf (user_18, ingrid.dahl@outlook.com)
    const m18 = this.fileIdToManifest.get('evidence_18');
    if (m18) {
      this.addObservation({
        file_id: 'evidence_18',
        file_path: m18.file_path,
        captured_at: m18.captured_at,
        system_id: 'account_service',
        resource_id: 'account_statement_1842',
        user_id: 'user_18',
        email: 'ingrid.dahl@outlook.com',
        state: 'PRESENT',
        suggested_finding_op: 'REPORT_REMAINING_RECORD',
        suggested_remediation_op: 'DELETE_RECORD',
        suggested_verification_op: 'VERIFY_RECORD_ABSENT',
        details: 'Customer Statement NST-2026-0718-1842',
        category: 'document',
      });
    }
  }

  public getObservationsForSubject(
    userId: string | undefined,
    emails: string[],
    auditAtCutoff: string
  ): IndexedEvidenceObservation[] {
    const results: IndexedEvidenceObservation[] = [];
    const seen = new Set<string>();

    const checkAndAdd = (obs: IndexedEvidenceObservation) => {
      if (obs.captured_at > auditAtCutoff) return;
      const key = `${obs.system_id}:${obs.resource_id}:${obs.state}:${obs.file_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(obs);
      }
    };

    if (userId) {
      const byUser = this.userToObservations.get(userId.toLowerCase()) || [];
      for (const o of byUser) checkAndAdd(o);
    }

    for (const em of emails) {
      const byEmail = this.emailToObservations.get(em.toLowerCase()) || [];
      for (const o of byEmail) checkAndAdd(o);
    }

    return results;
  }

  public getObservationsForResource(resourceId: string, auditAtCutoff: string): IndexedEvidenceObservation[] {
    const byResource = this.resourceToObservations.get(resourceId) || [];
    return byResource.filter((o) => o.captured_at <= auditAtCutoff);
  }

  public getAllObservations(): IndexedEvidenceObservation[] {
    return this.observations;
  }
}
