<img src="https://avatars2.githubusercontent.com/u/27866033?s=200&v=4">

# h2z
HEPIC:TDR Zipkin Trace Emitter

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

![hepic_telemetry](https://github.com/hepictel/h2z/assets/1423657/65e8efa5-2468-475b-95f4-62d3ca196c37)
