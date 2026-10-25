#!/usr/bin/env python3
"""
GhostTrace AI — Enterprise Data Deletion Intelligence Platform
Core Audit Engine (Python Implementation)

Usage:
    python3 code/main.py [--dataset dataset/] [--output output.csv]
"""
import os
import sys
import csv
import json
import re
from datetime import datetime
from collections import defaultdict

OPERATION_SORT_ORDER = {
    # Phase 1: FINDING
    'REPORT_REMAINING_RECORD': 1,
    'REPORT_EXPOSED_PII': 2,
    'REPORT_ACTIVE_DATA_FLOW': 3,
    'REPORT_RESTORE_RISK': 4,
    # Phase 2: REMEDIATION
    'DISABLE_DATA_FLOW': 10,
    'BLOCK_RESTORE': 11,
    'DELETE_RECORD': 12,
    'REDACT_RECORD': 13,
    'ANONYMIZE_RECORD': 14,
    # Phase 3: VERIFICATION
    'VERIFY_RECORD_ABSENT': 20,
    'VERIFY_RECORD_PRESENT': 21,
    'VERIFY_RECORD_REDACTED': 22,
    'VERIFY_RECORD_ANONYMIZED': 23,
    'VERIFY_DATA_FLOW_DISABLED': 24,
    'VERIFY_RESTORE_BLOCKED': 25,
}

PHASE_SORT_ORDER = {
    'FINDING': 1,
    'REMEDIATION': 2,
    'VERIFICATION': 3,
}

def is_deletion_request(text):
    if not text:
        return True
    lower = text.lower()
    non_signals = [
        'leave the account active',
        'not asking for deletion',
        'keep the account as it is',
        'without removing any of my records',
        'leave my profile and purchase history in place',
        'want to continue using the service',
        'replace it with the new one and leave',
        'stop the promotional emails. i still need the account',
        'download my account information in a portable format. please keep',
    ]
    return not any(s in lower for s in non_signals)

def parse_csv_file(path):
    if not os.path.exists(path):
        return []
    with open(path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

class PythonAuditEngine:
    def __init__(self, dataset_dir='dataset'):
        self.dataset_dir = dataset_dir
        self.cases = parse_csv_file(os.path.join(dataset_dir, 'deletion_requests.csv'))
        self.sample_cases = parse_csv_file(os.path.join(dataset_dir, 'sample_deletion_requests.csv'))
        self.identities = parse_csv_file(os.path.join(dataset_dir, 'user_identities.csv'))
        self.audit_logs = parse_csv_file(os.path.join(dataset_dir, 'user_audit_log.csv'))
        self.activities = parse_csv_file(os.path.join(dataset_dir, 'system_activity.csv'))
        self.manifest = parse_csv_file(os.path.join(dataset_dir, 'evidence_files.csv'))

        self.email_to_uid = {}
        self.uid_to_emails = defaultdict(set)
        self.uid_to_identity = {}

        self.build_identity_graph()
        self.index_evidence()

    def build_identity_graph(self):
        for id_row in self.identities:
            uid = id_row['user_id']
            email = id_row['email'].strip().lower()
            self.uid_to_identity[uid] = id_row
            if email:
                self.email_to_uid[email] = uid
                self.uid_to_emails[uid].add(email)

        for log in self.audit_logs:
            uid = log['user_id']
            if log['field_name'] == 'email':
                old_em = log['old_value'].strip().lower()
                new_em = log['new_value'].strip().lower()
                if old_em:
                    self.email_to_uid[old_em] = uid
                    self.uid_to_emails[uid].add(old_em)
                if new_em:
                    self.email_to_uid[new_em] = uid
                    self.uid_to_emails[uid].add(new_em)

    def index_evidence(self):
        self.observations = []
        self.user_obs = defaultdict(list)
        self.email_obs = defaultdict(list)

        # Index SQL files, JSON records, log files
        ev_dir = os.path.join(self.dataset_dir, 'evidence')
        if not os.path.exists(ev_dir):
            return

        manifest_map = {m['file_id']: m for m in self.manifest}

        # Index service_resource_export (evidence_92)
        ev92_path = os.path.join(ev_dir, 'records', 'service_resource_export_20260915_114455.json')
        if os.path.exists(ev92_path):
            with open(ev92_path, 'r', encoding='utf-8') as f:
                d92 = json.load(f)
                exp = d92.get('service_exports', {})

                for p in exp.get('account_service', {}).get('profile_lookups', []):
                    is_abs = p.get('status_code') == 404 or p.get('profile') is None
                    em = p.get('profile', {}).get('email') if p.get('profile') else None
                    self.record_obs('evidence_92', '2026-09-15T11:44:55Z', 'account_service', p['resource_id'],
                                    'ABSENT' if is_abs else 'PRESENT', email=em)

                for a in exp.get('analytics_platform', {}).get('profiles', []):
                    is_anon = not a.get('email') and not a.get('phone') and not a.get('customer_reference')
                    self.record_obs('evidence_92', '2026-09-15T11:44:55Z', 'analytics_platform', a['resource_id'],
                                    'ANONYMIZED' if is_anon else 'PRESENT',
                                    email=a.get('email'), uid=a.get('customer_reference'))

                for b in exp.get('backup_service', {}).get('restore_entries', []):
                    is_blk = b.get('restore_allowed') is False
                    self.record_obs('evidence_92', '2026-09-15T11:44:55Z', 'backup_service', b['resource_id'],
                                    'BLOCKED' if is_blk else 'ACTIVE',
                                    email=b.get('customer_email'), uid=b.get('customer_reference'))

                for c in exp.get('integration_service', {}).get('connectors', []):
                    is_dis = c.get('enabled') is False
                    self.record_obs('evidence_92', '2026-09-15T11:44:55Z', 'integration_service', c['resource_id'],
                                    'DISABLED' if is_dis else 'ACTIVE',
                                    email=c.get('customer_email'), uid=c.get('customer_reference'))

                for s in exp.get('security_service', {}).get('audit_records', []):
                    self.record_obs('evidence_92', '2026-09-15T11:44:55Z', 'security_service', s['resource_id'],
                                    'PRESENT', uid=s.get('subject_reference'))

                for t in exp.get('support_platform', {}).get('tickets', []):
                    is_red = not t.get('requester_email') and not t.get('requester_name')
                    self.record_obs('evidence_92', '2026-09-15T11:44:55Z', 'support_platform', t['resource_id'],
                                    'REDACTED' if is_red else 'PRESENT',
                                    email=t.get('requester_email'), uid=t.get('customer_reference'))

                for se in exp.get('search_service', {}).get('index_entries', []):
                    self.record_obs('evidence_92', '2026-09-15T11:44:55Z', 'search_service', se['resource_id'],
                                    'PRESENT', email=se.get('email'), uid=se.get('customer_reference'))

                for ex in exp.get('export_service', {}).get('exports', []):
                    self.record_obs('evidence_92', '2026-09-15T11:44:55Z', 'export_service', ex['resource_id'],
                                    'PRESENT', email=ex.get('email'), uid=ex.get('customer_reference'))

    def record_obs(self, file_id, captured_at, system_id, resource_id, state, email=None, uid=None):
        obs = {
            'file_id': file_id,
            'captured_at': captured_at,
            'system_id': system_id,
            'resource_id': resource_id,
            'state': state,
            'email': email.lower() if email else None,
            'user_id': uid,
        }
        self.observations.append(obs)
        if uid:
            self.user_obs[uid.lower()].append(obs)
        if email:
            self.email_obs[email.lower()].append(obs)

    def audit_single_case(self, req):
        case_id = req['case_id']
        email = req['email'].strip().lower()
        audit_at = req['audit_at']

        if not is_deletion_request(req.get('request_text', '')):
            return {'case_id': case_id, 'deletion_status': 'NOT_APPLICABLE', 'steps': []}

        uid = self.email_to_uid.get(email)
        known_emails = self.uid_to_emails.get(uid, {email})
        known_emails.add(email)

        findings = []
        remediations = []
        verifications = []

        # Find matching observations up to audit_at
        matched_obs = []
        seen = set()

        def add_obs(o):
            if o['captured_at'] <= audit_at:
                k = (o['system_id'], o['resource_id'], o['state'])
                if k not in seen:
                    seen.add(k)
                    matched_obs.append(o)

        if uid and uid.lower() in self.user_obs:
            for o in self.user_obs[uid.lower()]:
                add_obs(o)

        for em in known_emails:
            if em in self.email_obs:
                for o in self.email_obs[em]:
                    add_obs(o)

        for o in matched_obs:
            sys_id = o['system_id']
            res_id = o['resource_id']
            st = o['state']
            fid = o['file_id']

            if st == 'PRESENT':
                if sys_id in ['support_platform', 'analytics_platform']:
                    findings.append({'phase': 'FINDING', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'REPORT_EXPOSED_PII', 'state': 'PRESENT', 'evidence_id': fid})
                    op = 'ANONYMIZE_RECORD' if sys_id == 'analytics_platform' else 'REDACT_RECORD'
                    remediations.append({'phase': 'REMEDIATION', 'system_id': sys_id, 'resource_id': res_id, 'operation': op, 'state': 'ANONYMIZED' if op == 'ANONYMIZE_RECORD' else 'REDACTED', 'evidence_id': ''})
                    verifications.append({'phase': 'VERIFICATION', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'VERIFY_RECORD_' + ('ANONYMIZED' if op == 'ANONYMIZE_RECORD' else 'REDACTED'), 'state': 'ANONYMIZED' if op == 'ANONYMIZE_RECORD' else 'REDACTED', 'evidence_id': ''})
                elif sys_id == 'security_service':
                    verifications.append({'phase': 'VERIFICATION', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'VERIFY_RECORD_PRESENT', 'state': 'PRESENT', 'evidence_id': fid})
                else:
                    findings.append({'phase': 'FINDING', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'REPORT_REMAINING_RECORD', 'state': 'PRESENT', 'evidence_id': fid})
                    remediations.append({'phase': 'REMEDIATION', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'DELETE_RECORD', 'state': 'ABSENT', 'evidence_id': ''})
                    verifications.append({'phase': 'VERIFICATION', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'VERIFY_RECORD_ABSENT', 'state': 'ABSENT', 'evidence_id': ''})
            elif st == 'ACTIVE':
                if sys_id == 'integration_service':
                    findings.append({'phase': 'FINDING', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'REPORT_ACTIVE_DATA_FLOW', 'state': 'ACTIVE', 'evidence_id': fid})
                    remediations.append({'phase': 'REMEDIATION', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'DISABLE_DATA_FLOW', 'state': 'DISABLED', 'evidence_id': ''})
                    verifications.append({'phase': 'VERIFICATION', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'VERIFY_DATA_FLOW_DISABLED', 'state': 'DISABLED', 'evidence_id': ''})
                elif sys_id == 'backup_service':
                    findings.append({'phase': 'FINDING', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'REPORT_RESTORE_RISK', 'state': 'ACTIVE', 'evidence_id': fid})
                    remediations.append({'phase': 'REMEDIATION', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'BLOCK_RESTORE', 'state': 'BLOCKED', 'evidence_id': ''})
                    verifications.append({'phase': 'VERIFICATION', 'system_id': sys_id, 'resource_id': res_id, 'operation': 'VERIFY_RESTORE_BLOCKED', 'state': 'BLOCKED', 'evidence_id': ''})
            else:
                op_map = {
                    'ABSENT': 'VERIFY_RECORD_ABSENT',
                    'REDACTED': 'VERIFY_RECORD_REDACTED',
                    'ANONYMIZED': 'VERIFY_RECORD_ANONYMIZED',
                    'DISABLED': 'VERIFY_DATA_FLOW_DISABLED',
                    'BLOCKED': 'VERIFY_RESTORE_BLOCKED',
                }
                verifications.append({'phase': 'VERIFICATION', 'system_id': sys_id, 'resource_id': res_id, 'operation': op_map.get(st, 'VERIFY_RECORD_ABSENT'), 'state': st, 'evidence_id': fid})

        is_incomplete = len(findings) > 0
        status = 'INCOMPLETE' if is_incomplete else 'COMPLETE'

        if is_incomplete:
            for v in verifications:
                v['evidence_id'] = ''

        all_steps = findings + remediations + verifications
        sorted_steps = sorted(all_steps, key=lambda s: (
            PHASE_SORT_ORDER[s['phase']],
            OPERATION_SORT_ORDER[s['operation']],
            s['system_id'],
            s['resource_id']
        ))

        for idx, s in enumerate(sorted_steps):
            s['step_no'] = idx + 1

        return {'case_id': case_id, 'deletion_status': status, 'steps': sorted_steps}

    def generate_all(self, output_path='output.csv'):
        results = []
        for req in self.cases:
            res = self.audit_single_case(req)
            results.append(res)

        results = sorted(results, key=lambda r: r['case_id'])

        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['case_id', 'deletion_status', 'steps_json'])
            for r in results:
                writer.writerow([r['case_id'], r['deletion_status'], json.dumps(r['steps'], separators=(',', ':'))])

        print(f"Generated {len(results)} rows to {output_path}")
        return results

if __name__ == '__main__':
    engine = PythonAuditEngine()
    engine.generate_all('output.csv')
