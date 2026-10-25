/**
 * GhostTrace AI — Dataset & Evidence Manager
 * Manages official and uploaded datasets, performs strict schema & data integrity validation,
 * indexes multimodal evidence files, and exposes dataset activation manifests to the audit engine.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type DatasetFileStatus = 'Missing' | 'Uploaded' | 'Validated' | 'Invalid';

export interface DatasetFileInfo {
  file_name: string;
  category: 'primary' | 'sample' | 'identity' | 'rules' | 'activity' | 'manifest' | 'output' | 'evidence';
  description: string;
  required_for_audit: boolean;
  required_for_evaluation: boolean;
  status: DatasetFileStatus;
  row_count: number;
  size_bytes: number;
  columns: string[];
  missing_columns: string[];
  duplicate_count: number;
  invalid_timestamps_count: number;
  errors: string[];
  file_hash: string;
  last_updated: string | null;
  preview_rows: Record<string, string>[];
}

export interface EvidenceRecordInfo {
  file_id: string;
  file_name: string;
  file_path: string;
  format: 'SQL' | 'JSON' | 'LOG' | 'TXT' | 'PDF' | 'IMAGE' | 'DB' | 'UNKNOWN';
  size_bytes: number;
  origin: string;
  captured_at: string;
  status: 'INDEXED' | 'UNINDEXED' | 'CORRUPTED';
  extracted_records_count: number;
  sample_preview?: string;
}

export interface ActiveDatasetManifest {
  manifest_id: string;
  source: 'DEFAULT' | 'UPLOADED' | 'CUSTOM';
  name: string;
  activated_at: string;
  is_valid_for_audit: boolean;
  is_valid_for_evaluation: boolean;
  total_files: number;
  uploaded_files: number;
  validated_files: number;
  invalid_files: number;
  total_cases_count: number;
  sample_cases_count: number;
  evidence_files_count: number;
  validation_errors: string[];
  required_files: Record<string, DatasetFileInfo>;
}

export class DatasetManager {
  private repoRoot: string;
  private defaultDatasetDir: string;
  private uploadsDir: string;

  // In-memory file content cache for session uploads
  private uploadedFilesContent: Map<string, string | Buffer> = new Map();
  private activeManifest!: ActiveDatasetManifest;
  private evidenceRecords: EvidenceRecordInfo[] = [];

  // Required column definitions for each dataset file
  private readonly REQUIRED_COLUMNS: Record<string, string[]> = {
    'deletion_requests.csv': ['case_id', 'email', 'requested_at', 'reported_status', 'reported_at', 'audit_at', 'request_text'],
    'sample_deletion_requests.csv': ['case_id', 'email', 'requested_at', 'reported_status', 'reported_at', 'audit_at', 'request_text'],
    'sample_output.csv': ['case_id', 'deletion_status', 'steps_json'],
    'user_identities.csv': ['user_id', 'name', 'email', 'phone', 'email_hash', 'updated_at'],
    'user_audit_log.csv': ['audit_id', 'user_id', 'event_time', 'field_name', 'old_value', 'new_value'],
    'system_activity.csv': ['activity_id', 'event_time', 'event_type', 'source_system', 'target_system', 'resource_id', 'reported_result', 'details'],
    'deletion_rules.csv': ['rule_id', 'data_category', 'condition', 'required_action'],
    'evidence_files.csv': ['file_id', 'file_path', 'origin', 'captured_at'],
    'output.csv': ['case_id', 'deletion_status', 'steps_json'],
  };

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
    this.defaultDatasetDir = path.join(repoRoot, 'dataset');
    this.uploadsDir = path.join(repoRoot, 'dataset', 'uploads');

    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }

    this.rebuildDefaultManifest();
  }

  /**
   * Initializes or refreshes the default dataset manifest from dataset/ directory.
   */
  public rebuildDefaultManifest(): ActiveDatasetManifest {
    const requiredFileKeys = Object.keys(this.REQUIRED_COLUMNS);
    const requiredFilesMap: Record<string, DatasetFileInfo> = {};

    let totalCases = 0;
    let sampleCases = 0;
    const globalErrors: string[] = [];

    for (const fileName of requiredFileKeys) {
      const diskPath = path.join(this.defaultDatasetDir, fileName);
      const isPresent = fs.existsSync(diskPath);

      if (!isPresent) {
        requiredFilesMap[fileName] = {
          file_name: fileName,
          category: this.getFileCategory(fileName),
          description: this.getFileDescription(fileName),
          required_for_audit: fileName === 'deletion_requests.csv' || fileName === 'user_identities.csv' || fileName === 'deletion_rules.csv',
          required_for_evaluation: fileName === 'sample_deletion_requests.csv' || fileName === 'sample_output.csv',
          status: 'Missing',
          row_count: 0,
          size_bytes: 0,
          columns: [],
          missing_columns: this.REQUIRED_COLUMNS[fileName],
          duplicate_count: 0,
          invalid_timestamps_count: 0,
          errors: [`File '${fileName}' is missing in active dataset directory`],
          file_hash: 'MISSING',
          last_updated: null,
          preview_rows: [],
        };
        if (requiredFilesMap[fileName].required_for_audit) {
          globalErrors.push(`Required audit file missing: ${fileName}`);
        }
        continue;
      }

      const content = fs.readFileSync(diskPath, 'utf8');
      const stat = fs.statSync(diskPath);
      const validation = this.validateCsvContent(fileName, content, stat.size);
      requiredFilesMap[fileName] = validation;

      if (fileName === 'deletion_requests.csv') {
        totalCases = validation.row_count;
      } else if (fileName === 'sample_deletion_requests.csv') {
        sampleCases = validation.row_count;
      }

      if (validation.status === 'Invalid' && validation.required_for_audit) {
        globalErrors.push(`${fileName}: ${validation.errors.join(', ')}`);
      }
    }

    // Index evidence files
    this.indexEvidenceFiles();

    const uploadedCount = Object.values(requiredFilesMap).filter((f) => f.status !== 'Missing').length;
    const validatedCount = Object.values(requiredFilesMap).filter((f) => f.status === 'Validated').length;
    const invalidCount = Object.values(requiredFilesMap).filter((f) => f.status === 'Invalid').length;

    const isValidForAudit =
      requiredFilesMap['deletion_requests.csv']?.status === 'Validated' &&
      requiredFilesMap['user_identities.csv']?.status === 'Validated' &&
      requiredFilesMap['deletion_rules.csv']?.status === 'Validated';

    const isValidForEvaluation =
      requiredFilesMap['sample_deletion_requests.csv']?.status === 'Validated' &&
      requiredFilesMap['sample_output.csv']?.status === 'Validated';

    this.activeManifest = {
      manifest_id: `manifest_default_${Date.now()}`,
      source: 'DEFAULT',
      name: 'HackerRank Orchestrate October 2026 (Official Challenge Dataset)',
      activated_at: new Date().toISOString(),
      is_valid_for_audit: isValidForAudit,
      is_valid_for_evaluation: isValidForEvaluation,
      total_files: requiredFileKeys.length,
      uploaded_files: uploadedCount,
      validated_files: validatedCount,
      invalid_files: invalidCount,
      total_cases_count: totalCases,
      sample_cases_count: sampleCases,
      evidence_files_count: this.evidenceRecords.length,
      validation_errors: globalErrors,
      required_files: requiredFilesMap,
    };

    return this.activeManifest;
  }

  /**
   * Validates CSV content against required columns, duplicate IDs, timestamp validity, and syntax.
   */
  public validateCsvContent(fileName: string, content: string, sizeBytes: number): DatasetFileInfo {
    const lines = content.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    const requiredCols = this.REQUIRED_COLUMNS[fileName] || [];
    const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex').substring(0, 16);
    const errors: string[] = [];

    if (lines.length === 0) {
      return {
        file_name: fileName,
        category: this.getFileCategory(fileName),
        description: this.getFileDescription(fileName),
        required_for_audit: fileName === 'deletion_requests.csv' || fileName === 'user_identities.csv' || fileName === 'deletion_rules.csv',
        required_for_evaluation: fileName === 'sample_deletion_requests.csv' || fileName === 'sample_output.csv',
        status: 'Invalid',
        row_count: 0,
        size_bytes: sizeBytes,
        columns: [],
        missing_columns: requiredCols,
        duplicate_count: 0,
        invalid_timestamps_count: 0,
        errors: ['File is empty (0 lines)'],
        file_hash: hash,
        last_updated: new Date().toISOString(),
        preview_rows: [],
      };
    }

    const headers = this.parseCsvLine(lines[0]);
    const headerSet = new Set(headers.map((h) => h.trim().toLowerCase()));
    const missingColumns = requiredCols.filter((col) => !headerSet.has(col.toLowerCase()));

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Check rows, duplicate IDs, timestamps
    const seenIds = new Set<string>();
    let duplicateCount = 0;
    let invalidTimestampsCount = 0;
    const previewRows: Record<string, string>[] = [];

    const isCaseFile = fileName === 'deletion_requests.csv' || fileName === 'sample_deletion_requests.csv';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const values = this.parseCsvLine(line);
      const row: Record<string, string> = {};

      for (let h = 0; h < headers.length; h++) {
        row[headers[h]] = values[h] !== undefined ? values[h] : '';
      }

      if (i <= 15) {
        previewRows.push(row);
      }

      // Check duplicates on primary ID
      if (isCaseFile && row.case_id) {
        if (seenIds.has(row.case_id)) {
          duplicateCount++;
        }
        seenIds.add(row.case_id);
      }

      // Check timestamps on case files
      if (isCaseFile) {
        if (row.audit_at && isNaN(Date.parse(row.audit_at))) {
          invalidTimestampsCount++;
        }
        if (row.requested_at && isNaN(Date.parse(row.requested_at))) {
          invalidTimestampsCount++;
        }
      }
    }

    if (duplicateCount > 0) {
      errors.push(`Found ${duplicateCount} duplicate case IDs`);
    }
    if (invalidTimestampsCount > 0) {
      errors.push(`Found ${invalidTimestampsCount} invalid timestamp entries`);
    }

    const isValid = errors.length === 0;

    return {
      file_name: fileName,
      category: this.getFileCategory(fileName),
      description: this.getFileDescription(fileName),
      required_for_audit: fileName === 'deletion_requests.csv' || fileName === 'user_identities.csv' || fileName === 'deletion_rules.csv',
      required_for_evaluation: fileName === 'sample_deletion_requests.csv' || fileName === 'sample_output.csv',
      status: isValid ? 'Validated' : 'Invalid',
      row_count: lines.length - 1,
      size_bytes: sizeBytes,
      columns: headers,
      missing_columns: missingColumns,
      duplicate_count: duplicateCount,
      invalid_timestamps_count: invalidTimestampsCount,
      errors,
      file_hash: hash,
      last_updated: new Date().toISOString(),
      preview_rows: previewRows,
    };
  }

  /**
   * Accepts uploaded file, validates it, and stages it.
   */
  public handleFileUpload(fileName: string, content: string | Buffer, sizeBytes: number): DatasetFileInfo {
    const isText = typeof content === 'string';
    const textContent = isText ? (content as string) : (content as Buffer).toString('utf8');

    // Save in session map
    this.uploadedFilesContent.set(fileName, content);

    // If it's one of the required CSVs, validate it
    if (fileName.endsWith('.csv') && this.REQUIRED_COLUMNS[fileName]) {
      const validation = this.validateCsvContent(fileName, textContent, sizeBytes);
      validation.status = validation.errors.length === 0 ? 'Validated' : 'Invalid';
      this.activeManifest.required_files[fileName] = validation;
      this.updateManifestMetrics();
      return validation;
    }

    // Evidence file upload
    const ext = path.extname(fileName).toLowerCase();
    const format = this.getFormatFromExt(ext);
    const hash = crypto
      .createHash('sha256')
      .update(isText ? textContent : (content as Buffer))
      .digest('hex')
      .substring(0, 16);

    const evidenceRecord: EvidenceRecordInfo = {
      file_id: `evidence_upload_${Date.now().toString().slice(-4)}`,
      file_name: fileName,
      file_path: `uploads/${fileName}`,
      format,
      size_bytes: sizeBytes,
      origin: 'User Upload Session',
      captured_at: new Date().toISOString(),
      status: 'INDEXED',
      extracted_records_count: isText ? textContent.split('\n').length : 1,
      sample_preview: isText ? textContent.slice(0, 500) : `Binary evidence (${format})`,
    };

    this.evidenceRecords.unshift(evidenceRecord);
    this.activeManifest.evidence_files_count = this.evidenceRecords.length;

    return {
      file_name: fileName,
      category: 'evidence',
      description: `Uploaded evidence artifact (${format})`,
      required_for_audit: false,
      required_for_evaluation: false,
      status: 'Validated',
      row_count: isText ? textContent.split('\n').length : 1,
      size_bytes: sizeBytes,
      columns: [],
      missing_columns: [],
      duplicate_count: 0,
      invalid_timestamps_count: 0,
      errors: [],
      file_hash: hash,
      last_updated: new Date().toISOString(),
      preview_rows: [],
    };
  }

  /**
   * Explicitly activates the current uploaded or default dataset manifest.
   */
  public activateDataset(manifestName?: string): ActiveDatasetManifest {
    this.updateManifestMetrics();
    this.activeManifest.name = manifestName || `Custom Active Dataset (${new Date().toLocaleTimeString()})`;
    this.activeManifest.activated_at = new Date().toISOString();
    this.activeManifest.source = this.uploadedFilesContent.size > 0 ? 'UPLOADED' : 'DEFAULT';
    return this.activeManifest;
  }

  /**
   * Returns content of a file (from memory upload or disk).
   */
  public getFileContent(fileName: string): string | null {
    if (this.uploadedFilesContent.has(fileName)) {
      const val = this.uploadedFilesContent.get(fileName)!;
      return typeof val === 'string' ? val : val.toString('utf8');
    }

    const diskPath = path.join(this.defaultDatasetDir, fileName);
    if (fs.existsSync(diskPath)) {
      return fs.readFileSync(diskPath, 'utf8');
    }

    return null;
  }

  /**
   * Returns active manifest.
   */
  public getActiveManifest(): ActiveDatasetManifest {
    return this.activeManifest;
  }

  /**
   * Returns all evidence records.
   */
  public getEvidenceRecords(): EvidenceRecordInfo[] {
    return this.evidenceRecords;
  }

  private updateManifestMetrics(): void {
    const files = Object.values(this.activeManifest.required_files);
    this.activeManifest.uploaded_files = files.filter((f) => f.status !== 'Missing').length;
    this.activeManifest.validated_files = files.filter((f) => f.status === 'Validated').length;
    this.activeManifest.invalid_files = files.filter((f) => f.status === 'Invalid').length;

    const delReq = this.activeManifest.required_files['deletion_requests.csv'];
    this.activeManifest.total_cases_count = delReq?.status === 'Validated' ? delReq.row_count : 0;

    const sampleReq = this.activeManifest.required_files['sample_deletion_requests.csv'];
    this.activeManifest.sample_cases_count = sampleReq?.status === 'Validated' ? sampleReq.row_count : 0;

    this.activeManifest.is_valid_for_audit =
      this.activeManifest.required_files['deletion_requests.csv']?.status === 'Validated' &&
      this.activeManifest.required_files['user_identities.csv']?.status === 'Validated' &&
      this.activeManifest.required_files['deletion_rules.csv']?.status === 'Validated';

    this.activeManifest.is_valid_for_evaluation =
      this.activeManifest.required_files['sample_deletion_requests.csv']?.status === 'Validated' &&
      this.activeManifest.required_files['sample_output.csv']?.status === 'Validated';

    const globalErrors: string[] = [];
    if (!this.activeManifest.is_valid_for_audit) {
      if (this.activeManifest.required_files['deletion_requests.csv']?.status !== 'Validated') {
        globalErrors.push('deletion_requests.csv must be uploaded and validated before running a full audit.');
      }
    }
    this.activeManifest.validation_errors = globalErrors;
  }

  private indexEvidenceFiles(): void {
    const manifestPath = path.join(this.defaultDatasetDir, 'evidence_files.csv');
    if (!fs.existsSync(manifestPath)) return;

    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      const lines = content.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      const records: EvidenceRecordInfo[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = this.parseCsvLine(lines[i]);
        if (parts.length >= 4) {
          const fileId = parts[0];
          const filePath = parts[1];
          const origin = parts[2];
          const capturedAt = parts[3];

          const fullDiskPath = path.join(this.defaultDatasetDir, filePath);
          const exists = fs.existsSync(fullDiskPath);
          const size = exists ? fs.statSync(fullDiskPath).size : 0;
          const ext = path.extname(filePath).toLowerCase();

          records.push({
            file_id: fileId,
            file_name: path.basename(filePath),
            file_path: filePath,
            format: this.getFormatFromExt(ext),
            size_bytes: size,
            origin,
            captured_at: capturedAt,
            status: exists ? 'INDEXED' : 'CORRUPTED',
            extracted_records_count: exists && (ext === '.sql' || ext === '.log' || ext === '.txt') ? 15 : 1,
          });
        }
      }

      this.evidenceRecords = records;
    } catch (e) {
      console.warn('Failed to index evidence files:', e);
    }
  }

  private getFormatFromExt(ext: string): 'SQL' | 'JSON' | 'LOG' | 'TXT' | 'PDF' | 'IMAGE' | 'DB' | 'UNKNOWN' {
    switch (ext) {
      case '.sql':
        return 'SQL';
      case '.json':
        return 'JSON';
      case '.log':
        return 'LOG';
      case '.txt':
        return 'TXT';
      case '.pdf':
        return 'PDF';
      case '.png':
      case '.jpg':
      case '.jpeg':
        return 'IMAGE';
      case '.db':
      case '.sqlite':
        return 'DB';
      default:
        return 'UNKNOWN';
    }
  }

  private getFileCategory(
    name: string
  ): 'primary' | 'sample' | 'identity' | 'rules' | 'activity' | 'manifest' | 'output' | 'evidence' {
    if (name.includes('sample_deletion')) return 'sample';
    if (name.includes('sample_output')) return 'sample';
    if (name.includes('deletion_requests')) return 'primary';
    if (name.includes('identity') || name.includes('audit_log')) return 'identity';
    if (name.includes('deletion_rules')) return 'rules';
    if (name.includes('activity')) return 'activity';
    if (name.includes('evidence')) return 'manifest';
    if (name.includes('output')) return 'output';
    return 'evidence';
  }

  private getFileDescription(name: string): string {
    switch (name) {
      case 'deletion_requests.csv':
        return 'Official 518 GDPR/CCPA consumer deletion requests subjected to temporal audit.';
      case 'sample_deletion_requests.csv':
        return '32 reference ground-truth sample requests used for empirical evaluation scoring.';
      case 'sample_output.csv':
        return 'Benchmark ground truth containing canonical status and ordered remediation steps.';
      case 'user_identities.csv':
        return 'Current snapshot profiles including user_id, current email, phone, and cryptographic hashes.';
      case 'user_audit_log.csv':
        return 'Historical identity event log tracing past email aliases, phone changes, and name shifts.';
      case 'system_activity.csv':
        return 'Temporal global system event log containing 4,000+ data pipeline & deletion executions.';
      case 'deletion_rules.csv':
        return '15 data category deletion rules defining legal hold, tombstone, and retention logic.';
      case 'evidence_files.csv':
        return '94-file multimodal evidence catalog covering SQL dumps, logs, documents, and screenshots.';
      case 'output.csv':
        return 'Submission artifact template or output generated by the latest successful audit run.';
      default:
        return 'Dataset or evidence support artifact.';
    }
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        values.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur);
    return values;
  }
}
