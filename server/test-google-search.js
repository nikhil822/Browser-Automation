// Test Google search combined command
const axios = require('axios');

const testGoogleSearch = async () => {
  try {
    console.log('Sending combined Google search command...');
    const response = await axios.post('http://localhost:3000/interact', {
      command: 'go to https://google.com and search kiara advani'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
};

testGoogleSearch();
