/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

async function main() {
  const prisma = new PrismaClient();
  const admin = await prisma.adminUser.findFirst();
  if (admin) {
    // Generate identical token logic as backend (using JWT_SECRET or default)
    // Actually wait, let's just use the login endpoint manually instead of manual sign.
    const res = await axios
      .post('http://127.0.0.1:8005/api/v1/auth/admin/login', {
        email: admin.email,
        password: 'Password@123',
      })
      .catch((e) => e.response);
    if (!res || res.status !== 200) {
      console.log('Login failed with email: ' + admin.email, res?.data);
      return;
    }
    const token = res.data.data.access_token;
    console.log('Got token from login');
    try {
      await axios.get('http://127.0.0.1:8005/api/v1/calls?page=1&limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('SUCCESS');
    } catch (e: any) {
      if (e.response) {
        console.error('500 ERROR DETAILS:', e.response.data);
      } else {
        console.error(e);
      }
    }
  } else {
    console.log('No admins found');
  }
}
main();
