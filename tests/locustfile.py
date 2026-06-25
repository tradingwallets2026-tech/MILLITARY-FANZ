"""
Military Pass — Locust Load Test
=================================
Tests 1,000 concurrent simulated studio sessions.

Install:
    pip install locust

Run (basic):
    locust -f locustfile.py --host=https://militarypass.com

Run (headless, 1000 users):
    locust -f locustfile.py --headless \
           --users 1000 \
           --spawn-rate 50 \
           --run-time 5m \
           --host=https://militarypass.com \
           --html=load_test_report.html
"""

import base64
import json
import os
import random
import time
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner

# ─── Config ──────────────────────────────────────────────────────
TEST_EMAIL_DOMAIN = os.environ.get("TEST_EMAIL_DOMAIN", "test.militarypass.com")
TEST_PASSWORD     = os.environ.get("TEST_PASSWORD",     "TestPassword123!")

# Mock 512-dim embedding (real clients would use actual face embeddings)
MOCK_EMBEDDING = [random.uniform(-1, 1) for _ in range(512)]

# Mock 200ms PCM chunk (3200 float32 samples = 12800 bytes → base64)
MOCK_AUDIO_PCM  = base64.b64encode(bytes(12800)).decode()

# Mock JPEG frame (small 100×100 pixel grayscale)
MOCK_FRAME_JPEG = base64.b64encode(b"\xff\xd8\xff\xe0" + b"\x00" * 1000 + b"\xff\xd9").decode()


# ─── User classes ────────────────────────────────────────────────

class StudioUser(HttpUser):
    """
    Simulates a live studio operator:
    1. Sign in
    2. Check credit balance
    3. Start a session
    4. Send face-swap frames (30fps → throttled to 5fps for load test)
    5. Send voice chunks (every 200ms → throttled to every 1s)
    6. End session
    """
    wait_time = between(0.1, 0.3)
    session_id: str | None = None
    credit_balance: int    = 0

    def on_start(self):
        """Authenticate before tasks run."""
        idx = random.randint(1, 1000)
        email    = f"loadtest{idx}@{TEST_EMAIL_DOMAIN}"
        password = TEST_PASSWORD

        with self.client.post(
            "/api/auth/callback",
            json={"email": email, "password": password},
            catch_response=True,
            name="[Auth] Sign In"
        ) as res:
            if res.status_code not in (200, 302):
                res.failure(f"Login failed: {res.status_code}")

        # Check balance
        bal_res = self.client.get("/api/credits/balance", name="[Credits] Get Balance")
        if bal_res.status_code == 200:
            data = bal_res.json()
            self.credit_balance = data.get("balance", 0)

        # Start session
        sess_res = self.client.post(
            "/api/sessions",
            json={"avatarId": None, "voiceProfileId": None},
            name="[Session] Start"
        )
        if sess_res.status_code == 201:
            data = sess_res.json()
            self.session_id = data.get("session", {}).get("id")

    def on_stop(self):
        """End session on user exit."""
        if self.session_id:
            self.client.request(
                "PATCH",
                "/api/sessions",
                json={
                    "sessionId": self.session_id,
                    "stats": {
                        "duration_seconds": random.randint(30, 600),
                        "credits_used":     random.randint(3, 60),
                        "frames_processed": random.randint(900, 18000),
                        "avg_latency_ms":   random.randint(50, 200),
                    }
                },
                name="[Session] End"
            )

    @task(5)
    def face_swap_frame(self):
        """Simulate a face-swap frame request (throttled to ~5fps)."""
        if self.credit_balance <= 0:
            return
        self.client.post(
            "/api/ai/face-swap",
            json={
                "frame_b64":        MOCK_FRAME_JPEG,
                "avatar_embedding": MOCK_EMBEDDING,
                "enhance":          True,
            },
            name="[AI] Face Swap Frame"
        )

    @task(3)
    def voice_transform(self):
        """Simulate a voice chunk (200ms)."""
        if self.credit_balance <= 0:
            return
        preset = random.choice(["commander", "ghost", "operative", "recon", "ranger"])
        self.client.post(
            "/api/ai/voice",
            json={"audio_b64": MOCK_AUDIO_PCM, "preset": preset},
            name="[AI] Voice Transform"
        )

    @task(1)
    def credit_deduct(self):
        """Simulate periodic credit deduction."""
        self.client.post(
            "/api/credits/balance",
            json={"action": "deduct", "amount": 1},
            name="[Credits] Deduct 1"
        )
        self.credit_balance = max(0, self.credit_balance - 1)

    @task(1)
    def check_ai_status(self):
        """Occasional health check."""
        self.client.get("/api/ai/status", name="[AI] Status Check")


class AnonUser(HttpUser):
    """
    Simulates anonymous visitors browsing the landing page and pricing.
    """
    wait_time = between(1, 5)

    @task(4)
    def landing_page(self):
        self.client.get("/", name="[Page] Landing")

    @task(2)
    def pricing_page(self):
        self.client.get("/pricing", name="[Page] Pricing")

    @task(1)
    def login_page(self):
        self.client.get("/auth/login", name="[Page] Login")


# ─── Event hooks ─────────────────────────────────────────────────

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n🎖️  Military Pass Load Test Starting")
    print(f"   Target: {environment.host}")
    print(f"   Users:  {environment.runner.target_user_count if hasattr(environment.runner, 'target_user_count') else 'N/A'}")
    print("   Mix:    80% StudioUser, 20% AnonUser\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    stats = environment.runner.stats
    print("\n🏁  Load Test Complete")
    print(f"   Total requests:  {stats.total.num_requests}")
    print(f"   Failures:        {stats.total.num_failures}")
    print(f"   Avg response:    {stats.total.avg_response_time:.0f}ms")
    print(f"   95th percentile: {stats.total.get_response_time_percentile(0.95):.0f}ms")
    print(f"   RPS:             {stats.total.current_rps:.1f}")
