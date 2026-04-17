/* eslint-disable no-console */
import axios from 'axios';

// Using IPv4 localhost to avoid node 17+ IPv6 issues if any
const BASE_URL = 'http://127.0.0.1:8000/api/v1';

async function verifyApis() {
  console.log('🚀 Starting API Verification...');

  // 1. Authenticate
  let token = '';
  // Randomize email to avoid collision on repeated runs if cleanup isn't done
  const randomId = Math.floor(Math.random() * 10000);
  const testUser = {
    email: `bot_${randomId}@example.com`,
    password: 'password123',
    name: 'Verification Bot',
  };

  // Also try a fixed user first to avoid polluting DB too much if possible
  const fixedUser = {
    email: 'bot_fixed@example.com',
    password: 'password123',
    name: 'Verification Bot Fixed',
  };

  try {
    console.log(`Attempting to login as ${fixedUser.email}...`);
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: fixedUser.email,
      password: fixedUser.password,
    });
    token = loginRes.data.access_token;
    console.log('✅ Login successful!');
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 404)
    ) {
      console.log('Login failed (401/404), attempting to register new user...');
      try {
        const registerRes = await axios.post(
          `${BASE_URL}/auth/register`,
          testUser,
        );
        token = registerRes.data.access_token;
        console.log(`✅ Registration successful for ${testUser.email}!`);

        // Try to register the fixed user for next time too, silently
        try {
          await axios.post(`${BASE_URL}/auth/register`, fixedUser);
        } catch (e) {
          /* ignore */
        }
      } catch (regError) {
        if (axios.isAxiosError(regError)) {
          console.error(
            '❌ Registration failed:',
            regError.response?.status,
            regError.response?.data,
          );
        } else {
          console.error('❌ Registration failed:', regError);
        }
        process.exit(1);
      }
    } else {
      if (axios.isAxiosError(error)) {
        console.error(
          '❌ Login error:',
          error.response?.status,
          error.response?.data,
        );
      } else {
        console.error('❌ Login error:', error);
      }
      process.exit(1);
    }
  }

  if (!token) {
    console.error('KBoom! No token.');
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Verify Endpoints
  const endpoints = [
    { name: 'Banking Partners', url: `${BASE_URL}/banking-partners` },
    { name: 'FAQs', url: `${BASE_URL}/faqs` },
    { name: 'Loan Banners', url: `${BASE_URL}/loan-banners` },
    { name: 'Platform Stats', url: `${BASE_URL}/platform-stats` },
    { name: 'Testimonials', url: `${BASE_URL}/testimonials` },
    { name: 'Loan Products', url: `${BASE_URL}/loan-comparison/products` },
    { name: 'Loan Parameters', url: `${BASE_URL}/loan-comparison/parameters` },
    { name: 'Loan Values', url: `${BASE_URL}/loan-comparison/values` },
    // Checking a dummy key for section-content and expecting 200 or 404 but checking it's reachable (auth works)
    {
      name: 'Section Content (Home)',
      url: `${BASE_URL}/section-content/home-hero`,
      ignore404: true,
    },
  ];

  let allPassed = true;

  for (const ep of endpoints) {
    try {
      process.stdout.write(`Checking ${ep.name}... `);
      const res = await axios.get(ep.url, { headers });
      console.log(`✅ ${res.status} OK`);
    } catch (error) {
      if (
        ep.ignore404 &&
        axios.isAxiosError(error) &&
        error.response?.status === 404
      ) {
        console.log(`⚠️ 404 (Expected/Allowed)`);
      } else {
        console.log(
          `❌ Failed: ${axios.isAxiosError(error) ? error.response?.status : error}`,
        );
        if (axios.isAxiosError(error) && error.response?.data) {
          console.log(JSON.stringify(error.response.data));
        }
        allPassed = false;
      }
    }
  }

  if (allPassed) {
    console.log('\n✨ All critical APIs verified successfully!');
  } else {
    console.error('\n⚠️ Some APIs failed verification.');
    process.exit(1);
  }
}

verifyApis();
