// Test script for minimal server
const axios = require('axios');

const testMinimalServer = async () => {
  try {
    // Test GET endpoint
    console.log('Testing GET /test endpoint...');
    const getResponse = await axios.get('http://localhost:3000/test');
    console.log('GET Response:', getResponse.data);
    
    // Test POST endpoint
    console.log('\nTesting POST /test endpoint...');
    const postResponse = await axios.post('http://localhost:3000/test', {
      message: 'Hello from test client',
      testData: true
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('POST Response:', postResponse.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    }
  }
};

testMinimalServer();
