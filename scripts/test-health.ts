
import http from 'http';

function testHealth() {
    const options = {
        hostname: '127.0.0.1',
        port: 3000,
        path: '/api/health',
        method: 'GET',
        timeout: 5000
    };

    console.log(`Sending request to http://${options.hostname}:${options.port}${options.path}...`);

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('BODY:', data);
            console.log('Health Test Passed');
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

testHealth();
