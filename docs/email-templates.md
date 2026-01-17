# DigiBot Email Notification Templates

This document shows exactly how each email will look for every Playwright workflow run.

---

## 1. BLOCKED Email (High/Critical Security Issues)

**When it's sent:** When Gemini detects High or Critical security issues in the PR

**Subject:**
```
DigiBot - QA Automation BLOCKED: Gemini High/Critical Issues - PR #123
```

**Body:**
```
DigiBot – QA Automation Summary
Execution Status: BLOCKED by Gemini Code Review
PR: #123

SUMMARY:
⚠️ Tests NOT executed due to High/Critical security issues

🔐 Gemini Gate Status: ✗ BLOCKED

Critical Issues Detected:
- [HIGH] Potential SQL injection vulnerability in user.js:45
- [CRITICAL] Command injection risk in documents.js:120

📋 Details:
The code review found security vulnerabilities that must be addressed before
running tests. Please review the Gemini bot comments on the PR for full details.

🔗 View Full Report: https://github.com/MonishStark/digiplay3/actions/runs/12345

⚠️ Action Required:
Please fix the High/Critical security issues before Playwright tests can run.
```

---

## 2. STARTED Email (Gemini Passed, Tests Running)

**When it's sent:** When Gemini gate passes (no High/Critical issues) and tests begin

**Subject:**
```
DigiBot - QA Automation Started - PR #123
```

**Body:**
```
DigiBot – QA Automation Summary
Execution Status: In Progress
PR: #123

🔐 Gemini Gate Status: ✓ Passed
No High/Critical security issues detected.

⚙️ Playwright smoke tests are now running...

🔗 View Live Progress: https://github.com/MonishStark/digiplay3/actions/runs/12345
```

---

## 3. COMPLETED Email (Tests Finished)

**When it's sent:** After all Playwright tests complete

**Subject:**
```
DigiBot - QA Automation Complete: 10/12 Passed - PR #123
```

**Body (with failures):**
```
DigiBot – QA Automation Summary
Execution Status: Completed
PR: #123

SUMMARY:
✅ Passed: 10
❌ Failed: 2

📂 PLAYWRIGHT REPORT:
Report attached as ZIP file

🔗 View Full Report: https://github.com/MonishStark/digiplay3/actions/runs/12345

⚠️ Failed Tests:
  ❌ Should allow creating a new chat
  ❌ Should navigate to Files page

📋 Note:
1. Gemini Code Review passed - No High/Critical security issues detected.
2. The test suite was executed sequentially to improve stability.
3. UI animations were disabled during execution to ensure consistent and reliable visual comparisons.

🔐 Gemini Gate Status: ✓ Passed (Low/Medium issues only)
```

**Body (all passed):**
```
DigiBot – QA Automation Summary
Execution Status: Completed
PR: #123

SUMMARY:
✅ Passed: 12
❌ Failed: 0

📂 PLAYWRIGHT REPORT:
Report attached as ZIP file

🔗 View Full Report: https://github.com/MonishStark/digiplay3/actions/runs/12345

📋 Note:
1. Gemini Code Review passed - No High/Critical security issues detected.
2. The test suite was executed sequentially to improve stability.
3. UI animations were disabled during execution to ensure consistent and reliable visual comparisons.

🔐 Gemini Gate Status: ✓ Passed (Low/Medium issues only)
```

**Body (error scenario - no report generated):**
```
DigiBot – QA Automation Summary
Execution Status: Completed
PR: #123

SUMMARY:
✅ Passed: 0
❌ Failed: 0

⚠️ ISSUE SUMMARY:
- Test results file not found (test-results.json missing)
- Report not generated (playwright-report missing)

Run logs: https://github.com/MonishStark/digiplay3/actions/runs/12345

📋 Note:
1. Gemini Code Review passed - No High/Critical security issues detected.
2. The test suite was executed sequentially to improve stability.
3. UI animations were disabled during execution to ensure consistent and reliable visual comparisons.

🔐 Gemini Gate Status: ✓ Passed (Low/Medium issues only)
```

---

## Email Configuration

All emails are sent via:
- **SMTP Server:** premium49.web-hosting.com:465
- **From:** QA Automation Bot
- **To:** Recipients configured in `REPORT_TO_MAILS` secret

### Required GitHub Secrets
- `REPORT_FROM_MAIL` - Email account username
- `REPORT_FROM_PASSWORD` - Email account password
- `REPORT_TO_MAILS` - Comma-separated list of recipients

---

## Workflow Summary

```
┌─────────────────────────────────────────────────────┐
│  PR Created/Updated                                  │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Wait for Gemini Bot Code Review                     │
│  (Polls PR comments for "Code Review" section)       │
└─────────────────────────────────────────────────────┘
                      ↓
                   ╱     ╲
                ╱           ╲
              ╱               ╲
    High/Critical?          No?
            ╲                 ╱
              ╲             ╱
                ╲         ╱
                  ╲     ╱
                    ↓ ↓
         ┌───────────────────────┐
         │  📧 BLOCKED Email      │ → Workflow stops
         └───────────────────────┘
                                    ↓
                          ┌───────────────────────┐
                          │  📧 STARTED Email      │
                          └───────────────────────┘
                                    ↓
                          ┌───────────────────────┐
                          │  Run Playwright Tests  │
                          └───────────────────────┘
                                    ↓
                          ┌───────────────────────┐
                          │  📧 COMPLETED Email    │
                          │  (with ZIP attachment) │
                          └───────────────────────┘
```

---

## Key Features

1. **Environment Variables**: Uses `REPORT_SECTION` pattern from Techwink project for dynamic email content
2. **Three Email Scenarios**: Blocked, Started, Completed - each with appropriate content
3. **No Test Summary on Block**: When blocked, no "0/0 Passed" is shown since tests never run
4. **Failed Test Details**: Completion email lists all failed tests for quick debugging
5. **ZIP Attachment**: Full Playwright HTML report attached to completion email
6. **Error Handling**: Graceful handling when reports are missing with diagnostic messages
