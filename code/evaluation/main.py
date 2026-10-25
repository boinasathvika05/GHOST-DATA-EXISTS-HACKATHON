#!/usr/bin/env python3
"""
GhostTrace AI — Evaluation Runner (Python)
Evaluates output predictions against dataset/sample_output.csv.
"""
import os
import sys
import csv
import json

# Add parent directory to path so it can import PythonAuditEngine
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
try:
    from main import PythonAuditEngine
except ImportError:
    from code.main import PythonAuditEngine

def evaluate(pred_file='output.csv', sample_file='dataset/sample_output.csv'):
    if not os.path.exists(sample_file):
        print(f"Sample ground truth {sample_file} not found.")
        return

    with open(sample_file, 'r', encoding='utf-8') as f:
        truth = {r['case_id']: (r['deletion_status'], json.loads(r['steps_json'])) for r in csv.DictReader(f)}

    preds = {}
    if os.path.exists(pred_file):
        with open(pred_file, 'r', encoding='utf-8') as f:
            for r in csv.DictReader(f):
                if r['case_id'] in truth:
                    preds[r['case_id']] = (r['deletion_status'], json.loads(r['steps_json']))

    # If output.csv is production 518 cases (case_33..case_550), evaluate sample cases via engine
    if not preds:
        dataset_dir = 'dataset' if os.path.exists('dataset') else os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'dataset'))
        engine = PythonAuditEngine(dataset_dir=dataset_dir)
        for req in engine.sample_cases:
            res = engine.audit_single_case(req)
            preds[res['case_id']] = (res['deletion_status'], res['steps'])

    matched_cases = 0
    total_samples = len(truth)

    for cid, (t_status, t_steps) in truth.items():
        if cid in preds:
            p_status, p_steps = preds[cid]
            if p_status == t_status:
                matched_cases += 1
            print(f"{cid}: Expected {t_status}, Got {p_status} ({'MATCH' if p_status == t_status else 'DIFF'})")
        else:
            print(f"{cid}: Missing from predictions")

    accuracy = (matched_cases / total_samples) * 100 if total_samples > 0 else 0
    print(f"\nEvaluation Complete: {matched_cases}/{total_samples} status matches ({accuracy:.1f}%)")

if __name__ == '__main__':
    evaluate()

