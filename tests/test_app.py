import json
import threading
import unittest
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
from app import Handler, build_plan, recover_plan, MAX_BUDGET_LIMIT, MAX_GUEST_LIMIT, MAX_DAYS_LIMIT

class EventWiseLogicTests(unittest.TestCase):
    """Deterministic planning logic unit tests."""

    def test_default_plan_matches_scenario(self):
        plan = build_plan()
        self.assertEqual(plan['budget'], 100000)
        self.assertEqual(plan['guests'], 150)
        self.assertEqual(plan['days_until_event'], 60)
        self.assertEqual(plan['event_type'], 'Wedding')
        self.assertEqual(sum(c['amount'] for c in plan['categories']), 100000)
        self.assertEqual(len(plan['tasks']), 11)
        self.assertEqual(len(plan['vendors']), 7)  # 8 categories minus Contingency

    def test_custom_event_types(self):
        for event_type in ["Birthday", "Community Gala", "Corporate Retreat"]:
            plan = build_plan(50000, 50, 30, event_type=event_type)
            self.assertEqual(plan['event_type'], event_type)
            self.assertEqual(sum(c['amount'] for c in plan['categories']), 50000)

    def test_boundary_values(self):
        # Minimum valid inputs
        min_plan = build_plan(budget=1, guests=1, days=0)
        self.assertEqual(min_plan['budget'], 1)
        self.assertEqual(min_plan['guests'], 1)
        self.assertEqual(min_plan['days_until_event'], 0)
        self.assertEqual(sum(c['amount'] for c in min_plan['categories']), 1)

    def test_budget_exact_sum_for_odd_amounts(self):
        # Test various odd budgets to verify rounding distributes residual accurately
        for test_budget in [77777, 123456, 333333, 999999]:
            plan = build_plan(budget=test_budget, guests=100, days=45)
            self.assertEqual(sum(c['amount'] for c in plan['categories']), test_budget)

    def test_rejects_invalid_inputs(self):
        with self.assertRaises(ValueError): build_plan(0, 150, 60)
        with self.assertRaises(ValueError): build_plan(-5000, 150, 60)
        with self.assertRaises(ValueError): build_plan(100000, 0, 60)
        with self.assertRaises(ValueError): build_plan(100000, -10, 60)
        with self.assertRaises(ValueError): build_plan(100000, 150, -1)
        with self.assertRaises(ValueError): build_plan("not-a-number", 150, 60)
        with self.assertRaises(ValueError): build_plan(100000, "abc", 60)
        with self.assertRaises(ValueError): build_plan(100000, 150, "xyz")

    def test_rejects_exceeded_bounds(self):
        with self.assertRaises(ValueError): build_plan(MAX_BUDGET_LIMIT + 1, 100, 30)
        with self.assertRaises(ValueError): build_plan(100000, MAX_GUEST_LIMIT + 1, 30)
        with self.assertRaises(ValueError): build_plan(100000, 100, MAX_DAYS_LIMIT + 1)

    def test_plan_immutability_on_recovery(self):
        initial_plan = build_plan(100000, 150, 60)
        initial_categories = json.loads(json.dumps(initial_plan['categories']))
        
        # Perform recovery
        recovered = recover_plan(initial_plan, 'budget', 75000)
        
        # Verify initial plan remains unaltered
        self.assertEqual(initial_plan['budget'], 100000)
        self.assertEqual(initial_plan['categories'], initial_categories)
        self.assertEqual(recovered['budget'], 75000)
        self.assertEqual(sum(c['amount'] for c in recovered['categories']), 75000)

    def test_budget_recovery_decrease_and_increase(self):
        plan = build_plan(100000, 150, 60)
        
        # Decrease
        reduced = recover_plan(plan, 'budget', 80000)
        self.assertEqual(reduced['budget'], 80000)
        self.assertEqual(sum(c['amount'] for c in reduced['categories']), 80000)
        self.assertTrue(reduced['requires_user_approval'])
        self.assertTrue(any('Budget reduced' in n for n in reduced['recovery_notes']))

        # Increase
        increased = recover_plan(plan, 'budget', 125000)
        self.assertEqual(increased['budget'], 125000)
        self.assertEqual(sum(c['amount'] for c in increased['categories']), 125000)
        # Surplus added to contingency
        original_contingency = next(c['amount'] for c in plan['categories'] if c['name'] == 'Contingency')
        new_contingency = next(c['amount'] for c in increased['categories'] if c['name'] == 'Contingency')
        self.assertEqual(new_contingency, original_contingency + 25000)

    def test_vendor_increase_uses_contingency_first(self):
        plan = build_plan(100000, 150, 60)
        result = recover_plan(plan, 'vendor_increase', 5000, 'Catering')
        self.assertEqual(next(c for c in result['categories'] if c['name']=='Contingency')['amount'], 5000)
        self.assertEqual(next(c for c in result['categories'] if c['name']=='Catering')['amount'], 35000)
        self.assertTrue(result['requires_user_approval'])

    def test_vendor_increase_exceeding_contingency(self):
        plan = build_plan(100000, 150, 60)
        # Contingency is 10,000; increase Catering by 15,000
        result = recover_plan(plan, 'vendor_increase', 15000, 'Catering')
        self.assertEqual(next(c for c in result['categories'] if c['name']=='Contingency')['amount'], 0)
        self.assertEqual(next(c for c in result['categories'] if c['name']=='Catering')['amount'], 45000)
        self.assertTrue(any('contingency' in n.lower() for n in result['recovery_notes']))

    def test_vendor_increase_invalid_category(self):
        plan = build_plan()
        with self.assertRaises(ValueError):
            recover_plan(plan, 'vendor_increase', 5000, 'NonExistentCategory')
        with self.assertRaises(ValueError):
            recover_plan(plan, 'vendor_increase', 5000, None)

    def test_guest_change_updates_guest_count_and_notes(self):
        plan = build_plan(100000, 150, 60)
        result = recover_plan(plan, 'guests', 200)
        self.assertEqual(result['guests'], 200)
        self.assertEqual(result['per_guest_budget'], 500.0)
        self.assertIn('Catering may change', result['recovery_notes'][0])

    def test_recover_plan_rejects_invalid_plan(self):
        with self.assertRaises(ValueError):
            recover_plan(None, 'budget', 50000)
        with self.assertRaises(ValueError):
            recover_plan({}, 'budget', 50000)


class EventWiseHttpTests(unittest.TestCase):
    """HTTP server and API endpoint integration tests."""

    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def setUp(self):
        self.plan = build_plan()

    def get(self, path):
        req = Request(self.base + path, method='GET')
        try:
            with urlopen(req) as response:
                return response.status, json.loads(response.read()), response.headers
        except HTTPError as e:
            return e.code, json.loads(e.read()), e.headers

    def post(self, path, data):
        req = Request(self.base + path, data=json.dumps(data).encode(), headers={'Content-Type':'application/json'}, method='POST')
        try:
            with urlopen(req) as response:
                return response.status, json.loads(response.read()), response.headers
        except HTTPError as e:
            return e.code, json.loads(e.read()), e.headers

    def test_health_endpoint(self):
        status, data, headers = self.get('/api/health')
        self.assertEqual(status, 200)
        self.assertEqual(data.get('status'), 'ok')
        self.assertEqual(headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(headers.get('X-Frame-Options'), 'SAMEORIGIN')
        self.assertEqual(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')

    def test_api_plan_endpoint_defaults_and_custom(self):
        status, data, _ = self.get('/api/plan')
        self.assertEqual(status, 200)
        self.assertEqual(data['budget'], 100000)

        status, data, _ = self.get('/api/plan?budget=80000&guests=120&days=45&event_type=Birthday')
        self.assertEqual(status, 200)
        self.assertEqual(data['budget'], 80000)
        self.assertEqual(data['guests'], 120)
        self.assertEqual(data['days_until_event'], 45)
        self.assertEqual(data['event_type'], 'Birthday')

    def test_api_plan_rejects_invalid_query_params(self):
        status, data, _ = self.get('/api/plan?budget=-500')
        self.assertEqual(status, 400)
        self.assertIn('error', data)

        status, data, _ = self.get('/api/plan?guests=0')
        self.assertEqual(status, 400)

    def test_recover_endpoint_success(self):
        status, data, _ = self.post('/api/recover', {
            'plan': self.plan,
            'change_type': 'budget',
            'value': 90000
        })
        self.assertEqual(status, 200)
        self.assertEqual(data['budget'], 90000)
        self.assertTrue(data['requires_user_approval'])

    def test_recover_endpoint_rejects_unknown_change(self):
        status, data, _ = self.post('/api/recover', {'plan': self.plan, 'change_type': 'unknown', 'value': 1})
        self.assertEqual(status, 400)
        self.assertIn('error', data)

    def test_recover_endpoint_rejects_invalid_category(self):
        status, data, _ = self.post('/api/recover', {
            'plan': self.plan,
            'change_type': 'vendor_increase',
            'value': 5000,
            'category': 'BogusCategory'
        })
        self.assertEqual(status, 400)
        self.assertIn('error', data)

    def test_assistant_requires_prompt(self):
        status, _, _ = self.post('/api/assistant', {'prompt': '  '})
        self.assertEqual(status, 400)

    def test_assistant_rejects_oversized_prompt(self):
        status, _, _ = self.post('/api/assistant', {'prompt': 'x' * 2001})
        self.assertEqual(status, 400)

    def test_assistant_valid_request(self):
        status, data, _ = self.post('/api/assistant', {'prompt': 'How to choose flowers for 150 guests?'})
        self.assertEqual(status, 200)
        self.assertIn('answer', data)
        self.assertIn('mode', data)

    def test_not_found_routes(self):
        status, _, _ = self.get('/api/unknown_endpoint')
        self.assertEqual(status, 404)
        status, _, _ = self.post('/api/unknown_endpoint', {})
        self.assertEqual(status, 404)


if __name__ == '__main__':
    unittest.main()

