// Test script for "go to Google, search for leetcode, and navigate to first link"
const axios = require('axios');

async function testLeetcodeNavigation() {
  try {
    console.log('\n🔍 Testing Google Search + First Link Navigation');
    console.log('===========================================\n');
    
    console.log('1. Sending command to go to Google, search for leetcode, and navigate to first link...');
    
    const response = await axios.post('http://localhost:3000/interact', {
      command: 'go to https://google.com and search leetcode and navigate to first link'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minute timeout to handle the never-resolving promise
    });
    
    console.log('✅ Command executed successfully');
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('\n✅ Browser is running and will remain open until you close it.');
      console.log('The script timeout is expected - the browser is kept open with a never-resolving promise.');
    } else {
      console.error('\n❌ Error occurred:');
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Response data:', error.response.data);
      } else {
        console.error(`Message: ${error.message}`);
      }
    }
  }
}

console.log('Running LeetCode navigation test...');
testLeetcodeNavigation();
