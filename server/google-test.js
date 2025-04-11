// Google search test script with better UI feedback
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function runGoogleSearch() {
  try {
    console.log('\n🌐 Browser Automation Test');
    console.log('========================\n');
    
    console.log('🚀 Sending request to search Google for "kiara advani"...\n');
    
    const startTime = Date.now();
    const response = await axios.post('http://localhost:3000/interact', {
      command: 'go to https://google.com and search kiara advani'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minute timeout to handle the never-resolving promise
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Command completed in ${duration} seconds\n`);
    
    console.log('📊 Server Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n👉 The browser should now be open and stay open until you manually close it.');
    console.log('   If you see a CAPTCHA, complete it manually in the browser window.\n');
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.log('\n✅ Browser is running and will stay open until you close it!');
      console.log('   The script timeout is normal - this happens because the browser');
      console.log('   is intentionally kept open with a never-resolving promise.\n');
    } else {
      console.error(`Message: ${error.message}`);
    }
  } finally {
    rl.close();
  }
}

console.log('Running Google search test. The browser will stay open until manually closed...');
runGoogleSearch();
