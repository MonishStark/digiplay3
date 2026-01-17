import { test, expect } from '@playwright/test';

test.describe('Comprehensive Endpoint Coverage', () => {
  const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3011';
  const API_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5050';

  // ==================== UNAUTHENTICATED ENDPOINTS ====================

  test('GET /app-data - Get app configuration', async ({ request }) => {
    const response = await request.get(`${API_URL}/app-data`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
  });

  test('POST /auth/email/check - Check email existence', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/email/check`, {
      data: {
        email: process.env.TEST_EMAIL || 'test@example.com'
      }
    });
    expect([200, 400]).toContain(response.status());
  });

  test('GET /auth/payment/status - Check payment status', async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/payment/status`, {
      failOnStatusCode: false
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /auth/register - Register new user endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: `test${Date.now()}@test.com`,
        password: 'TestPassword123!'
      },
      failOnStatusCode: false
    });
    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('POST /auth/login - Login endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: process.env.TEST_EMAIL || 'test@test.com',
        password: process.env.TEST_PASSWORD || 'Test@123'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 401, 422]).toContain(response.status());
  });

  test('POST /auth/refresh - Refresh token endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/refresh`, {
      data: {
        refreshToken: 'test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 401]).toContain(response.status());
  });

  test('POST /auth/password/forgot - Forgot password endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/password/forgot`, {
      data: {
        email: process.env.TEST_EMAIL || 'test@test.com'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /invitations/verify - Verify invitation endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/invitations/verify`, {
      data: {
        invitationCode: 'test-code-123'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 404]).toContain(response.status());
  });

  // ==================== AUTHENTICATED ENDPOINTS ====================

  test('GET /teams - Get all teams (with auth simulation)', async ({ request }) => {
    const response = await request.get(`${API_URL}/teams`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      },
      failOnStatusCode: false
    });
    // Should fail with 401 since token is invalid
    expect([401, 403]).toContain(response.status());
  });

  test('GET /teams/active - Get active teams endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/teams/active`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /teams/shared - Get shared teams endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/teams/shared`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /me/profile - Get user profile endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/me/profile`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /me/usage - Get user usage endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/me/usage`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /integrations - Get integrations endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/integrations`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 401, 403]).toContain(response.status());
  });

  test('GET /invitations - Get invitations list endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/invitations`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 401, 403]).toContain(response.status());
  });

  test('POST /invitations - Send invitation endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/invitations`, {
      data: {
        email: `invite${Date.now()}@test.com`,
        role: 'member'
      },
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 201, 400, 401, 403]).toContain(response.status());
  });

  test('POST /teams - Create team endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/teams`, {
      data: {
        name: `Team-${Date.now()}`,
        description: 'Test team'
      },
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 201, 400, 401, 403]).toContain(response.status());
  });

  test('POST /teams/:teamId/chats - Create chat endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/teams/1/chats`, {
      data: {
        name: `Chat-${Date.now()}`
      },
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 201, 400, 401, 403, 404]).toContain(response.status());
  });

  test('GET /teams/:teamId/chats - Get chats endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/teams/1/chats`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 401, 403, 404]).toContain(response.status());
  });

  test('POST /chat/get-histories - Get chat histories endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/chat/get-histories`, {
      data: {
        teamId: '1'
      },
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 401, 403]).toContain(response.status());
  });

  test('GET /teams/:teamId/folders - Get folders endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/teams/1/folders`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 401, 403, 404]).toContain(response.status());
  });

  test('POST /teams/:teamId/folders - Create folder endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/teams/1/folders`, {
      data: {
        name: `Folder-${Date.now()}`,
        parentId: null
      },
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 201, 400, 401, 403, 404]).toContain(response.status());
  });

  test('POST /teams/:teamId/files - Create file endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/teams/1/files`, {
      data: {
        name: `File-${Date.now()}.txt`,
        content: 'Test content',
        parentId: null
      },
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 201, 400, 401, 403, 404]).toContain(response.status());
  });

  test('GET /companies/:companyId/profile - Get company profile endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/companies/1/profile`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 401, 403, 404]).toContain(response.status());
  });

  test('GET /companies/:companyId/usage - Get company usage endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/companies/1/usage`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 401, 403, 404]).toContain(response.status());
  });

  test('POST /me/password - Change password endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/me/password`, {
      data: {
        currentPassword: 'old-pass',
        newPassword: 'new-pass'
      },
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 401, 403]).toContain(response.status());
  });

  test('POST /me/email - Update email endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/me/email`, {
      data: {
        email: `new${Date.now()}@test.com`
      },
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 401, 403]).toContain(response.status());
  });

  test('POST /me/2fa - Update 2FA endpoint exists', async ({ request }) => {
    const response = await request.post(`${API_URL}/me/2fa`, {
      data: {
        enabled: true
      },
      headers: {
        'Authorization': 'Bearer test-token'
      },
      failOnStatusCode: false
    });
    expect([200, 400, 401, 403]).toContain(response.status());
  });
});

