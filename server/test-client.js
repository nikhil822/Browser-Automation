// A simple test client to debug the interact API
const axios = require('axios');

const testRequest = async () => {
  try {
    console.log('Sending POST request to direct-interact endpoint...');
    const directResponse = await axios.post('http://localhost:3000/direct-interact', {
      command: 'go to https://example.com'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Direct Interact Response:', directResponse.data);
    
    console.log('\nNow sending POST request to interact endpoint...');
    const interactResponse = await axios.post('http://localhost:3000/interact', {
      command: 'go to https://example.com'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Interact Response:', interactResponse.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    }
  }
};

testRequest();
