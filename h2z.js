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
  // Root Span
  var trace = [{
   "id": data.uuid.split('-')[0] || "1234",
   "traceId": data.call_id || "d6e9329d67b6146b",
   "timestamp": data.cdr_start || microtime.now(),
   "duration": data.duration * 1000000 || 1000,
   "name": `${data.from_user} -> ${data.ruri_user}: ${data.status_text}`,
   "tags": data,
    "localEndpoint": {
      "serviceName": data.type || "hepic"
    }
  }]
  
  // Sub Spans
  if (data.cdr_start){
    if (data.cdr_ringing > 0) {
        trace.push({
           "id": data.uuid.split('-')[0] + "1",
           "parentId": data.uuid.split('-')[0],
           "traceId": data.call_id,
           "timestamp": data.cdr_start || microtime.now(),
           "duration": (data.cdr_ringing - data.cdr_start) * 1000000 || 1000,
           "name": `${data.from_user} -> ${data.ruri_user}: Ringing`,
           "tags": data,
            "localEndpoint": {
              "serviceName": data.type || "hepic"
            }
        })
    }
    if (data.cdr_conected > 0) {
        trace.push({
           "id": data.uuid.split('-')[0] + "2",
           "parentId": data.uuid.split('-')[0],
           "traceId": data.call_id,
           "timestamp": data.cdr_ringing || microtime.now(),
           "duration": (data.cdr_connected - data.cdr_ringing) * 1000000 || 1000,
           "name": `${data.from_user} -> ${data.ruri_user}: Connected`,
           "tags": data,
            "localEndpoint": {
              "serviceName": data.type || "hepic"
            }
        })

    }
  }

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
      console.log(data.toString())
    }
    if (data.status < 10) { 
      if (debug) console.log('discard non-final tdrs')
      return;
    }
    const modifiedData = middleware(JSON.parse(data.toString()))
    messages.set(modifiedData.uuid || uuid(), modifiedData)
  });

  ws.on('close', () => {
    console.log('WS Connection closed');
  });
});
