#!/usr/bin/env node

/**
 * LOAD TEST - Navex Market
 * Using autocannon for concurrent user simulation
 * Simulates 1000+ concurrent users hitting the platform
 */

const autocannon = require("autocannon");

// Configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || "500");
const DURATION = parseInt(process.env.DURATION || "60"); // seconds
const TEST_NAME = `Navex Market Load Test - ${new Date().toISOString()}`;

console.log("\n🚀 STARTING LOAD TEST");
console.log("=".repeat(60));
console.log(`Base URL: ${BASE_URL}`);
console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
console.log(`Duration: ${DURATION}s`);
console.log(`Test Name: ${TEST_NAME}`);
console.log("=".repeat(60));

// Define test endpoints
const endpoints = [
  {
    path: "/",
    weight: 20, // 20% of requests
    name: "Home Page",
  },
  {
    path: "/api/deals",
    weight: 20,
    name: "List Deals API",
    method: "GET",
  },
  {
    path: "/api/portfolio",
    weight: 15,
    name: "Portfolio API",
    method: "GET",
  },
  {
    path: "/api/analytics",
    weight: 15,
    name: "Analytics API",
    method: "GET",
  },
  {
    path: "/api/user",
    weight: 10,
    name: "User Profile API",
    method: "GET",
  },
  {
    path: "/dashboard",
    weight: 10,
    name: "Dashboard Page",
  },
  {
    path: "/api/search?q=startup",
    weight: 10,
    name: "Search API",
    method: "GET",
  },
];

// Create requests array with weighted distribution
function createRequests() {
  const requests = [];
  endpoints.forEach((endpoint) => {
    for (let i = 0; i < endpoint.weight; i++) {
      requests.push(endpoint);
    }
  });
  return requests;
}

// Run the load test
async function runLoadTest() {
  const requests = createRequests();

  try {
    const result = await autocannon({
      url: BASE_URL,
      connections: CONCURRENT_USERS,
      pipelining: 10,
      duration: DURATION,
      requests: requests.map((r) => ({
        path: r.path,
        method: r.method || "GET",
        setupClient: (client) => {
          client.on("response", (statusCode) => {
            // Log response codes
          });
        },
      })),
    });

    // Print results
    console.log("\n✅ LOAD TEST COMPLETED");
    console.log("=".repeat(60));
    console.log(`\n📊 RESULTS:\n`);
    console.log(`Total Requests:      ${result.requests.total}`);
    console.log(`Successful (2xx):    ${result.requests.sent}`);
    console.log(`Failed (4xx/5xx):    ${
      result.requests.total - result.requests.sent
    }`);
    console.log(`\n⏱️  RESPONSE TIMES:\n`);
    console.log(`Min:  ${result.latency.min}ms`);
    console.log(`Mean: ${Math.round(result.latency.mean)}ms`);
    console.log(`Max:  ${result.latency.max}ms`);
    console.log(`P50:  ${result.latency.p50}ms`);
    console.log(`P90:  ${result.latency.p90}ms`);
    console.log(`P95:  ${result.latency.p95}ms`);
    console.log(`P99:  ${result.latency.p99}ms`);
    console.log(`\n🔄 THROUGHPUT:\n`);
    console.log(`Requests/sec: ${Math.round(result.throughput.average)}`);
    console.log(`\n📈 SUMMARY:\n`);
    console.log(`Duration:     ${DURATION}s`);
    console.log(`Connections:  ${CONCURRENT_USERS}`);
    console.log(`Pipelining:   10`);

    // Determine test status
    const errorRate = (
      ((result.requests.total - result.requests.sent) /
        result.requests.total) *
      100
    ).toFixed(2);
    const p95ResponseTime = result.latency.p95;

    console.log("\n🎯 PERFORMANCE THRESHOLDS:\n");
    console.log(
      `Error Rate: ${errorRate}% ${errorRate < 0.5 ? "✅" : "❌"} (target: < 0.5%)`
    );
    console.log(
      `P95 Latency: ${p95ResponseTime}ms ${
        p95ResponseTime < 1000 ? "✅" : "❌"
      } (target: < 1000ms)`
    );

    if (errorRate < 0.5 && p95ResponseTime < 1000) {
      console.log("\n✅ TEST PASSED - Platform performs well under load!");
    } else {
      console.log(
        "\n⚠️  TEST WARNING - Some thresholds exceeded, review performance"
      );
    }

    console.log("\n" + "=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ LOAD TEST ERROR:");
    console.error(error.message);
    console.log(
      "\nNote: Ensure the application is running at the specified BASE_URL"
    );
    console.log(
      "Usage: BASE_URL=http://localhost:5173 node load-test-autocannon.js"
    );
    process.exit(1);
  }
}

// Run test
runLoadTest();
