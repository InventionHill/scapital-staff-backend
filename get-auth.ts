/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

async function main() {
  const prisma = new PrismaClient();
  const admin = await prisma.adminUser.findFirst();

  const payload = {
    sub: admin?.id,
    id: admin?.id,
    role: 'ADMIN',
    email: admin?.email,
  };
  const token = jwt.sign(payload, 'supersecret', { expiresIn: '1h' });

  try {
    const res2 = await axios.get(
      'http://127.0.0.1:8005/api/v1/calls?page=1&limit=10',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    console.log('SUCCESS length:', res2.data?.data?.length);
  } catch (e: any) {
    if (e.response) {
      console.error(
        'HTTP ERROR:',
        e.response.status,
        JSON.stringify(e.response.data, null, 2),
      );
    } else {
      console.error(e.message);
    }
  }
}
main();
