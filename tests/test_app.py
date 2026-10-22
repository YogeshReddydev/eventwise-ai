import json
import threading
import unittest
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
from app import Handler, build_plan, recover_plan

class EventWiseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True); cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'
    @classmethod
    def tearDownClass(cls): cls.server.shutdown(); cls.server.server_close(); cls.thread.join(timeout=2)
    def setUp(self): self.plan = build_plan()
    def post(self, path, data):
        req = Request(self.base + path, data=json.dumps(data).encode(), headers={'Content-Type':'application/json'}, method='POST')
        try:
            with urlopen(req) as response: return response.status, json.loads(response.read())
        except HTTPError as e: return e.code, json.loads(e.read())
    def test_default_plan_matches_scenario(self):
        self.assertEqual(self.plan['budget'], 100000); self.assertEqual(self.plan['guests'], 150)
        self.assertEqual(sum(c['amount'] for c in self.plan['categories']), 100000); self.assertEqual(len(self.plan['tasks']), 11)
    def test_rejects_invalid_budget_and_guests(self):
        with self.assertRaises(ValueError): build_plan(0, 150, 60)
        with self.assertRaises(ValueError): build_plan(100000, 0, 60)
    def test_budget_recovery_respects_new_total(self):
        result = recover_plan(self.plan, 'budget', 80000)
        self.assertEqual(result['budget'], 80000); self.assertEqual(sum(c['amount'] for c in result['categories']), 80000)
        self.assertTrue(result['requires_user_approval']); self.assertEqual(self.plan['budget'], 100000)
    def test_vendor_increase_uses_contingency_first(self):
        result = recover_plan(self.plan, 'vendor_increase', 5000, 'Catering')
        self.assertEqual(next(c for c in result['categories'] if c['name']=='Contingency')['amount'], 5000)
        self.assertGreater(next(c for c in result['categories'] if c['name']=='Catering')['amount'], next(c for c in self.plan['categories'] if c['name']=='Catering')['amount'])
    def test_guest_change_updates_guest_count(self):
        result = recover_plan(self.plan, 'guests', 180); self.assertEqual(result['guests'], 180)
        self.assertIn('Catering may change', result['recovery_notes'][0])
    def test_api_plan_endpoint(self):
        with urlopen(self.base + '/api/plan?budget=100000&guests=150&days=60') as response:
            self.assertEqual(response.status, 200); self.assertEqual(json.loads(response.read())['guests'], 150)
    def test_recover_endpoint_rejects_unknown_change(self):
        status, _ = self.post('/api/recover', {'plan':self.plan,'change_type':'unknown','value':1}); self.assertEqual(status, 400)
    def test_assistant_requires_prompt(self):
        status, _ = self.post('/api/assistant', {'prompt':'  '}); self.assertEqual(status, 400)
    def test_assistant_rejects_oversized_prompt(self):
        status, _ = self.post('/api/assistant', {'prompt':'x'*2001}); self.assertEqual(status, 400)

if __name__ == '__main__': unittest.main()
