/* eslint-disable no-console */
import axios from 'axios';

async function main() {
  try {
    const res = await axios.post('http://localhost:8005/api/v1/auth/login', {
      mobileNumber: '9876543210',
      password: 'Password@123',
    });
    const token = res.data.data.access_token;
    console.log('Got token');
    const res2 = await axios.get(
      'http://localhost:8005/api/v1/calls?page=1&limit=10',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    console.log(res2.data);
  } catch (e: any) {
    if (e.response) {
      console.error(e.response.data);
    } else {
      console.error(e);
    }
  }
}
main();
