/**
 * LOAD TESTING CONFIGURATION - k6 Performance Testing
 * Tests Navex Market with 1000+ concurrent users
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 * Run: k6 run performance-load-test.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter, Gauge } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const apiDuration = new Trend("api_duration");
const pageLoadTime = new Trend("page_load_time");
const databaseQueryTime = new Trend("db_query_time");
const activeUsers = new Gauge("active_users");
const successfulRequests = new Counter("successful_requests");

// Test configuration
export const options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up to 100 users
    { duration: "5m", target: 500 }, // Ramp up to 500 users
    { duration: "5m", target: 1000 }, // Ramp up to 1000 users
    { duration: "5m", target: 1000 }, // Stay at 1000 users
    { duration: "3m", target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"], // 95% of requests < 500ms, 99% < 1000ms
    http_req_failed: ["rate<0.1"], // Less than 10% failure rate
    errors: ["rate<0.05"], // Less than 5% error rate
  },
};

const BASE_URL = "https://navexmarket.com";
const AUTH_TOKEN = "your_test_token_here";

// Helper function to get auth header
function authHeader() {
  return {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
  };
}

export default function () {
  activeUsers.add(1);

  group("Homepage Load", () => {
    const startTime = new Date();
    let response = http.get(`${BASE_URL}/`);
    const loadTime = new Date() - startTime;
    pageLoadTime.add(loadTime);

    check(response, {
      "homepage status is 200": (r) => r.status === 200,
      "homepage loads within 500ms": (r) => r.timings.duration < 500,
    });

    errorRate.add(response.status !== 200);
    if (response.status === 200) successfulRequests.add(1);
  });

  sleep(1);

  group("Authentication Flow", () => {
    // Login attempt
    const loginPayload = JSON.stringify({
      email: `user_${Math.random()}@test.com`,
      password: "TestPassword123!",
    });

    let response = http.post(
      `${BASE_URL}/api/auth/login`,
      loginPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const startTime = new Date();
    apiDuration.add(response.timings.duration);
    const duration = new Date() - startTime;
    databaseQueryTime.add(duration);

    check(response, {
      "login status is 200 or 401": (r) => r.status === 200 || r.status === 401,
      "login response time < 1000ms": (r) => r.timings.duration < 1000,
    });

    errorRate.add(response.status >= 400);
  });

  sleep(1);

  group("Deal Listing - Database Query Performance", () => {
    const startTime = new Date();
    let response = http.get(
      `${BASE_URL}/api/deals?page=1&limit=20`,
      authHeader()
    );
    const queryTime = new Date() - startTime;
    databaseQueryTime.add(queryTime);
    apiDuration.add(response.timings.duration);

    check(response, {
      "deals list status is 200": (r) => r.status === 200,
      "deals response time < 800ms": (r) => r.timings.duration < 800,
      "deals list has data": (r) => r.body.includes("deal_id"),
    });

    errorRate.add(response.status !== 200);
    if (response.status === 200) successfulRequests.add(1);
  });

  sleep(1);

  group("Marketplace Search - Advanced Filtering", () => {
    const startTime = new Date();
    let response = http.get(
      `${BASE_URL}/api/deals/search?industry=technology&stage=seed&min_funding=100000&max_funding=5000000`,
      authHeader()
    );
    const queryTime = new Date() - startTime;
    databaseQueryTime.add(queryTime);
    apiDuration.add(response.timings.duration);

    check(response, {
      "search status is 200": (r) => r.status === 200,
      "search response time < 1000ms": (r) => r.timings.duration < 1000,
    });

    errorRate.add(response.status !== 200);
  });

  sleep(1);

  group("Deal Detail Page - Multiple Relationships", () => {
    const startTime = new Date();
    let response = http.get(
      `${BASE_URL}/api/deals/deal_12345/full`,
      authHeader()
    );
    const queryTime = new Date() - startTime;
    databaseQueryTime.add(queryTime);
    apiDuration.add(response.timings.duration);

    check(response, {
      "deal detail status is 200": (r) => r.status === 200 || r.status === 404,
      "deal detail response time < 1500ms": (r) => r.timings.duration < 1500,
    });

    errorRate.add(response.status !== 200 && response.status !== 404);
  });

  sleep(1);

  group("Portfolio Management - Heavy Query", () => {
    const startTime = new Date();
    let response = http.get(
      `${BASE_URL}/api/portfolios/my-portfolios?include=investments&include=performance`,
      authHeader()
    );
    const queryTime = new Date() - startTime;
    databaseQueryTime.add(queryTime);
    apiDuration.add(response.timings.duration);

    check(response, {
      "portfolio status is 200": (r) => r.status === 200,
      "portfolio response time < 1200ms": (r) => r.timings.duration < 1200,
    });

    errorRate.add(response.status !== 200);
  });

  sleep(1);

  group("Analytics Dashboard - Complex Aggregations", () => {
    const startTime = new Date();
    let response = http.get(
      `${BASE_URL}/api/analytics/deal-metrics?timeframe=30`,
      authHeader()
    );
    const queryTime = new Date() - startTime;
    databaseQueryTime.add(queryTime);
    apiDuration.add(response.timings.duration);

    check(response, {
      "analytics status is 200": (r) => r.status === 200,
      "analytics response time < 2000ms": (r) => r.timings.duration < 2000,
      "analytics has metrics": (r) => r.body.includes("total_deals"),
    });

    errorRate.add(response.status !== 200);
  });

  sleep(1);

  group("Activity Feed - Real-time Subscriptions", () => {
    const startTime = new Date();
    let response = http.get(
      `${BASE_URL}/api/deals/deal_12345/activity?limit=50`,
      authHeader()
    );
    const queryTime = new Date() - startTime;
    databaseQueryTime.add(queryTime);
    apiDuration.add(response.timings.duration);

    check(response, {
      "activity status is 200": (r) => r.status === 200 || r.status === 404,
      "activity response time < 800ms": (r) => r.timings.duration < 800,
    });

    errorRate.add(response.status !== 200 && response.status !== 404);
  });

  sleep(1);

  group("Document Upload & Processing", () => {
    const fileContent = JSON.stringify({
      document_name: "Test Document",
      deal_room_id: "room_123",
      file_size: Math.random() * 10000000, // Up to 10MB
    });

    const startTime = new Date();
    let response = http.post(
      `${BASE_URL}/api/documents/upload`,
      fileContent,
      authHeader()
    );
    const uploadTime = new Date() - startTime;
    apiDuration.add(uploadTime);

    check(response, {
      "upload status is 200 or 400": (r) => r.status === 200 || r.status === 400,
      "upload response time < 3000ms": (r) => r.timings.duration < 3000,
    });

    errorRate.add(response.status >= 500);
  });

  sleep(1);

  group("Deal Room Chat - WebSocket Simulation", () => {
    const messagePayload = JSON.stringify({
      message: `Test message at ${new Date().toISOString()}`,
      deal_room_id: "room_123",
      user_id: "user_123",
    });

    const startTime = new Date();
    let response = http.post(
      `${BASE_URL}/api/deal-rooms/room_123/chat`,
      messagePayload,
      authHeader()
    );
    const msgTime = new Date() - startTime;
    apiDuration.add(msgTime);

    check(response, {
      "chat message status is 200 or 201": (r) =>
        r.status === 200 || r.status === 201,
      "chat response time < 500ms": (r) => r.timings.duration < 500,
    });

    errorRate.add(response.status >= 400);
  });

  sleep(1);

  group("E-Signature Requests - Database Write", () => {
    const signaturePayload = JSON.stringify({
      document_id: "doc_123",
      signers: [
        { email: "signer1@test.com", name: "Signer 1" },
        { email: "signer2@test.com", name: "Signer 2" },
      ],
      expires_in_days: 30,
    });

    const startTime = new Date();
    let response = http.post(
      `${BASE_URL}/api/signatures/request`,
      signaturePayload,
      authHeader()
    );
    const writeTime = new Date() - startTime;
    apiDuration.add(writeTime);
    databaseQueryTime.add(writeTime);

    check(response, {
      "signature request status is 200 or 201": (r) =>
        r.status === 200 || r.status === 201,
      "signature response time < 1000ms": (r) => r.timings.duration < 1000,
    });

    errorRate.add(response.status >= 400);
  });

  sleep(1);

  group("API Keys & Rate Limiting", () => {
    let response = http.get(
      `${BASE_URL}/api/user/api-keys`,
      authHeader()
    );

    check(response, {
      "api keys status is 200": (r) => r.status === 200,
      "rate limit header present": (r) => r.headers["X-RateLimit-Remaining"],
    });

    errorRate.add(response.status !== 200);
  });

  sleep(2);

  activeUsers.add(-1);
}
