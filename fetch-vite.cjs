const http = require('http');

http.get('http://localhost:3000/App.tsx', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(data.substring(0, 500));
  });
}).on('error', (e) => {
  console.error("Got error: " + e.message);
});
