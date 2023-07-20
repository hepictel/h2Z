import {WebSocketServer} from 'ws'
import axios from 'axios'
import { LRUCache } from 'lru-cache'
import microtime from 'microtime'
import crypto from 'crypto'

const debug = process.env.DEBUG || false

const options = {
  max: process.env.MAX_CACHE || 10000,
  ttl: 2000,
  ttlAutopurge: true,
  dispose: function(n, key) {
    console.log('Batch disposal... ')
    const payload = JSON.stringify(n)
    if (debug) console.log(payload)
    axios.post(process.env.HTTP_ENDPOINT || 'https://localhost:3100/tempo/api/push', payload, {
      headers:{
        'Content-Type': 'application/json'
      }
    })
      .then((response) => {
        console.log('Zipkin Data successfully sent', response.data)
      })
      .catch((error) => {
        console.log('An error occurred while sending data', error)
      })
  }
}

let messages = new LRUCache(options)

function middleware(data) {
  data = allStrings(data)
  const traceId = hashString(data.callid, 32)
  const parentId = hashString(data.uuid, 16)
  
  let trace = [{
   "id": parentId,
   "traceId": traceId,
   "timestamp": data.micro_ts || microtime.now(),
   "duration": data.duration * 1000000 || 1000,
   "name": `${data.callid}`,
   "tags": data,
    "localEndpoint": {
      "serviceName": data.type || "hepic"
    }
  }]
  if (debug) console.log(trace[0])
  // Sub Span Generator
  if (data.cdr_ringing > 0) {
        trace.push({
           "id": hashString(data.uuid.split('-')[0].slice(0, -2) + "10", 16),
           "parentId": parentId,
           "traceId": traceId,
           "timestamp": data.cdr_start * 1000 || microtime.now(),
           "duration": (data.cdr_ringing * 1000) - data.micro_ts || 1000,
           "name": `Ringing`,
           "tags": data,
            "localEndpoint": {
              "serviceName": data.type || "hepic"
            }
        })
  }
  if (data.cdr_connect > 0) {
        trace.push({
           "id": hashString(data.uuid.split('-')[0].slice(0, -2) + "20", 16),
           "parentId": parentId,
           "traceId": traceId,
           "timestamp": data.cdr_start * 1000 || microtime.now(),
           "duration": (data.cdr_connect * 1000 ) - data.micro_ts || 1000,
           "name": `Connected`,
           "tags": data,
            "localEndpoint": {
              "serviceName": data.type || "hepic"
            }
        })
  }
  
  return trace
}

const wss = new WebSocketServer({ port: process.env.WS_PORT || 18909 })
console.log(`h2z running, listening on ${process.env.WS_PORT || 18909}, sending traces to ${process.env.HTTP_ENDPOINT || 'https://localhost:3100/tempo/api/push'}. Debug is ${process.env.DEBUG}`)


wss.on('connection', (ws) => {
  console.log('New WS connection established')

  ws.on('error', (err) => {
    console.log(`Websocket error: ${err}`)
  })

  ws.on('message', async (data) => {
    data = JSON.parse(data.toString())
    if (data.status < 10 ) return
    if (messages.has(data.uuid)) return
    const modifiedData = middleware(data)
    messages.set(modifiedData.uuid, modifiedData)
  })

  ws.on('close', () => {
    console.log('WS Connection closed')
  })
})

/* Utils */

function hashString(str, max) {
    const hash = crypto.createHash('sha256')
    hash.update(str.toString())
    const fullHash = hash.digest('hex')
    return fullHash.substring(0, max || 32)
}

function allStrings(data){
  for (let key in data) {
    data[key] = data[key].toString()
  }
  return data
}
