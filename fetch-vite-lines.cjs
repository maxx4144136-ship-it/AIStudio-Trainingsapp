const http = require('http');

http.get('http://localhost:3000/App.tsx', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    console.log(lines.slice(150, 180).join('\n'));
  });
}).on('error', (e) => {
  console.error("Got error: " + e.message);
});
