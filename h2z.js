const WebSocket = require('ws');
const axios = require('axios');
const process = require('process');
const LRU = require('lru-cache').LRUCache;
const uuid = require('uuid');
const microtime = require('microtime');

const options = {
  max: process.env.MAX_CACHE || 100,
  ttl: 1000 * 60 * 5,
  dispose: function(key, n) {
    const payload = JSON.stringify(n);
    axios.post(process.env.HTTP_ENDPOINT || 'https://localhost:3100/tempo/api/push', payload)
      .then((response) => {
        console.log('Zipkin Data successfully sent', response.data);
      })
      .catch((error) => {
        console.log('An error occurred while sending data', error);
      });
  }
};

let messages = new LRU(options);

function middleware(data) {

  var trace = {
   "id": data.uuid.split('-')[0] || "1234",
   "traceId": data.call_id || "d6e9329d67b6146b",
   "timestamp": microtime.now(),
   "duration": data.duration * 1000 || 1000,
   "name": `$data.from_user -> $data.ruri_user: $data.status_text`,
   "tags": data,
    "localEndpoint": {
      "serviceName": "hepic"
    }
  }

  return trace;
}

const ws = new WebSocket.Server({ port: process.env.WS_PORT | 18909 });

ws.on('connection', (socket) => {
  console.log('New WS connection established');

  socket.on('message', (data) => {
    const modifiedData = middleware(JSON.parse(data));
    messages.set(modifiedData.uuid || uuid.v4(), modifiedData);
  });

  socket.on('close', () => {
    console.log('WS Connection closed');
  });
});
