# Military Pass — Load Testing Guide
> Locust test plan for 1,000 concurrent sessions

## Setup

```bash
# Install Python dependencies
pip install locust

# Run with Locust web UI (http://localhost:8089)
cd military-pass
locust -f tests/locustfile.py --host=https://militarypass.com

# Run headless (CI/CD or terminal only)
locust -f tests/locustfile.py --headless \
       --users 1000 \
       --spawn-rate 50 \
       --run-time 5m \
       --host=https://militarypass.com \
       --html=tests/reports/load_test_$(date +%Y%m%d).html
```

## User Types

| Class | Weight | Behavior |
|-------|--------|----------|
| `StudioUser` | 80% | Auth → Start session → 5fps face swap + 1s voice chunks → End |
| `AnonUser` | 20% | Browse landing, pricing, login pages |

## Tasks (StudioUser)

| Task | Weight | API Hit |
|------|--------|---------|
| Face swap frame | 5× | POST `/api/ai/face-swap` |
| Voice transform | 3× | POST `/api/ai/voice` |
| Credit deduct | 1× | POST `/api/credits/balance` |
| AI status check | 1× | GET `/api/ai/status` |

## Acceptance Criteria

| Metric | Target | Notes |
|--------|--------|-------|
| P95 response (face swap) | < 200ms | ONNX on A10G |
| P95 response (voice) | < 400ms | WORLD vocoder |
| P95 response (pages) | < 800ms | Next.js SSR |
| Error rate | < 1% | All endpoints |
| Requests/second | ≥ 500 RPS | At 1,000 users |

## Environment Variables for Test

```bash
export TEST_EMAIL_DOMAIN=test.militarypass.com
export TEST_PASSWORD=TestPassword123!
```

> **Note:** Create 1,000 test accounts before running:
> ```sql
> -- Run in Supabase SQL Editor to see test user count
> SELECT COUNT(*) FROM auth.users
> WHERE email LIKE '%@test.militarypass.com';
> ```

## Report Artifacts

Results are saved as HTML reports in `tests/reports/`.
Upload to S3/GCS for team sharing.
