
const axios = require('axios');

const API_URL = 'http://localhost:8000/api/v1';

async function verifyReorder() {
  try {
    // 1. Get all testimonials
    console.log('Fetching testimonials...');
    const res1 = await axios.get(`${API_URL}/testimonials`);
    let items = res1.data;
    
    if (items.length < 2) {
      console.log('Not enough items to test reorder. Need at least 2.');
      return;
    }

    console.log('Current order IDs:', items.map(i => i.id));

    // 2. Swap first two items
    const swappedItems = [items[1], items[0], ...items.slice(2)];
    const swappedIds = swappedItems.map(i => i.id);
    
    console.log('Sending Reorder request with IDs:', swappedIds);

    // 3. Send reorder request
    await axios.put(`${API_URL}/testimonials/reorder`, { ids: swappedIds });
    console.log('Reorder request successful.');

    // 4. Verify new order
    console.log('Fetching testimonials again...');
    const res2 = await axios.get(`${API_URL}/testimonials`);
    const newItems = res2.data;
    
    console.log('New order IDs:', newItems.map(i => i.id));

    const isMatch = newItems[0].id === swappedIds[0] && newItems[1].id === swappedIds[1];
    
    if (isMatch) {
        console.log('SUCCESS: Order updated correctly.');
    } else {
        console.log('FAILURE: Order did not update.');
    }

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

verifyReorder();
