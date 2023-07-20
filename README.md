# h2z
HEPIC TDR to Zipkin Trace relay

### Status
- Experimental

### Parameters
- `WS_PORT`: Listening Websocket Port
- `HTTP_ENDPOINT`: Zipkin/Tempo HTTP Push API _(/tempo/api/push)_
- `MAX_CACHE`: Buffer Cache in Seconds

<br>

### Workflow
```mermaid
flowchart LR

A[hepic] -->|WS/JSON| C{h2z}
C -->|Zipkin/JSON| D[qryn]


style A fill:#d9ead3ff
style D fill:#FFA500ff
style C fill:#c9daf8ff
```

### Example

![image](https://github.com/hepictel/h2z/assets/1423657/fe388ee6-8eff-4682-a759-d4c256ccd1c9)
