const https = require('https');

https.get('https://checkout-staging.pluralonline.com/v3/web-sdk-checkout.js', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
