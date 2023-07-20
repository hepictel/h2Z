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
  
  var traceId = hashString(data.callid);
  var trace = [{
   "id": data.uuid.split('-')[0] || "1234",
   "traceId": traceId || "d6e9329d67b6146b",
   "timestamp": data.micro_ts || microtime.now(),
   "duration": data.duration * 1000000 || 1000,
   "name": `${data.from_user} -> ${data.ruri_user}: ${data.status_text}`,
   "tags": data,
    "localEndpoint": {
      "serviceName": data.type || "hepic"
    }
  }]
  
  // Sub Span Generator
  if (data.micro_ts > 0){
    if (data.cdr_ringing > 0) {
        trace.push({
           "id": data.uuid.split('-')[0] + "1",
           "parentId": data.uuid.split('-')[0],
           "traceId": traceId,
           "timestamp": data.cdr_start * 1000 || microtime.now(),
           "duration": (data.cdr_ringing * 1000) - data.micro_ts || 1000,
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
           "traceId": traceId,
           "timestamp": data.cdr_ringing * 1000 || microtime.now(),
           "duration": (data.cdr_connected * 1000 ) - data.micro_ts || 1000,
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

function hashString(str) {
    const hash = crypto.createHash('sha256');
    hash.update(str.toString());
    const fullHash = hash.digest('hex');
    return fullHash.substr(0, 32);
}

const wss = new WebSocketServer({ port: process.env.WS_PORT | 18910 });
console.log('Listening on ', process.env.WS_PORT | 18910 )

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
