import {WebSocketServer} from 'ws'
import axios from 'axios'
import { LRUCache } from 'lru-cache'
import { v4 as uuid } from 'uuid'
import microtime from 'microtime'

const debug = true;

const options = {
  max: process.env.MAX_CACHE || 1,
  ttl: 2,
  dispose: function(n, key) {
    console.log('dispose called')
    const payload = JSON.stringify(n);
    axios.post(process.env.HTTP_ENDPOINT || 'https://localhost:3100/tempo/api/push', payload, {
      headers:{
        'Content-Type': 'application/json'
      }
    })
      .then((response) => {
        console.log('Zipkin Data successfully sent', response.data);
      })
      .catch((error) => {
        console.log('An error occurred while sending data', error);
      });
  }
};

let messages = new LRUCache(options);

function middleware(data) {

  var trace = [{
   "id": data.uuid.split('-')[0] || "1234",
   "traceId": data.call_id || "d6e9329d67b6146b",
   "timestamp": microtime.now(),
   "duration": data.duration * 1000 || 1000,
   "name": `${data.from_user} -> ${data.ruri_user}: ${data.status_text}`,
   "tags": data,
    "localEndpoint": {
      "serviceName": "hepic"
    }
  }]

  return trace;
}

const wss = new WebSocketServer({ port: process.env.WS_PORT | 18909 });
console.log('Listening on ', process.env.WS_PORT | 18909)

wss.on('connection', (ws) => {
  console.log('New WS connection established');

  ws.on('error', (err) => {
    console.log(`Websocket error: ${err}`)
  })

  ws.on('message', async (data) => {
    if (debug) {
      console.log('received data')
      console.log(data.toString())
    }
    const modifiedData = middleware(JSON.parse(data.toString()))
    messages.set(modifiedData.uuid || uuid(), modifiedData)
  });

  ws.on('close', () => {
    console.log('WS Connection closed');
  });
});
