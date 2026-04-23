const http = require('https');

http.get('https://ais-pre-meu5cegwlsbx4sknmrla77-9258861477.europe-west2.run.app/assets/', (res) => {
    // If it denies directory listing, we can parse index.html to find the JS file.
});

const getIndex = () => {
    const req = http.get('https://ais-pre-meu5cegwlsbx4sknmrla77-9258861477.europe-west2.run.app/', (res) => {
        let html = '';
        res.on('data', c => html+=c);
        res.on('end', () => {
            const match = html.match(/\/assets\/index-[a-zA-Z0-9]+\.js/);
            if (match) {
                console.log("Found JS:", match[0]);
                const jsReq = http.get('https://ais-pre-meu5cegwlsbx4sknmrla77-9258861477.europe-west2.run.app' + match[0], (jsRes) => {
                    let jsCode = '';
                    jsRes.on('data', c => jsCode+=c);
                    jsRes.on('end', () => {
                        console.log("JS Length:", jsCode.length);
                        // Check if sourcemap exists
                        const smReq = http.get('https://ais-pre-meu5cegwlsbx4sknmrla77-9258861477.europe-west2.run.app' + match[0] + '.map', (smRes) => {
                            console.log("Sourcemap status:", smRes.statusCode);
                        });
                    });
                });
            } else {
                console.log("No match found in HTML:", html);
            }
        });
    });
};
getIndex();
