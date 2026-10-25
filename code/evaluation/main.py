#!/usr/bin/env python3
"""
GhostTrace AI — Evaluation Runner (Python)
Evaluates output predictions against dataset/sample_output.csv.
"""
import os
import sys
import csv
import json

def evaluate(pred_file='output.csv', sample_file='dataset/sample_output.csv'):
    if not os.path.exists(pred_file):
        print(f"Prediction file {pred_file} not found.")
        return
    if not os.path.exists(sample_file):
        print(f"Sample ground truth {sample_file} not found.")
        return

    with open(sample_file, 'r', encoding='utf-8') as f:
        truth = {r['case_id']: (r['deletion_status'], json.loads(r['steps_json'])) for r in csv.DictReader(f)}

    with open(pred_file, 'r', encoding='utf-8') as f:
        preds = {r['case_id']: (r['deletion_status'], json.loads(r['steps_json'])) for r in csv.DictReader(f)}

    matched_cases = 0
    total_samples = len(truth)

    for cid, (t_status, t_steps) in truth.items():
        if cid in preds:
            p_status, p_steps = preds[cid]
            if p_status == t_status:
                matched_cases += 1
            print(f"{cid}: Expected {t_status}, Got {p_status} ({'MATCH' if p_status == t_status else 'DIFF'})")

    print(f"\nEvaluation Complete: {matched_cases}/{total_samples} status matches ({(matched_cases/total_samples)*100:.1f}%)")

if __name__ == '__main__':
    evaluate()
