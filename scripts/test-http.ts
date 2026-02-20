
import http from 'http';

function testHttp() {
    const options = {
        hostname: '127.0.0.1',
        port: 3000,
        path: '/',
        method: 'GET',
        timeout: 5000
    };

    console.log(`Sending request to http://${options.hostname}:${options.port}${options.path}...`);

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('BODY length:', data.length);
            console.log('Snippet:', data.substring(0, 200));
            console.log('HTTP Test Passed');
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    req.on('timeout', () => {
        console.error('Request timed out');
        req.destroy();
    });

    req.end();
}

testHttp();
