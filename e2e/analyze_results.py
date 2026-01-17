
import json
import os

def load_json(path):
    encodings = ['utf-8', 'utf-16', 'utf-16-le', 'cp1252', 'iso-8859-1']
    for enc in encodings:
        try:
            with open(path, 'r', encoding=enc) as f:
                content = f.read().strip()
                # Remove any BOM or garbage at the start if present
                if content.startswith('\ufeff'):
                    content = content[1:]
                return json.loads(content)
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
    return None

results = load_json('test-results.json')
if not results:
    print("Failed to read test-results.json")
    exit(1)

failures = []
for suite in results.get('suites', []):
    for spec in suite.get('specs', []):
        for test in spec.get('tests', []):
            for result in test.get('results', []):
                if result.get('status') == 'failed':
                    failures.append({
                        'file': suite.get('file', 'unknown'),
                        'title': spec.get('title'),
                        'error': result.get('error', {}).get('message', 'No error message')
                    })

print(json.dumps(failures, indent=2))
