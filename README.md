# h2z
HEPIC TDR to Zipkin Trace relay

## Status
- Experimental

## Workflow
```mermaid
flowchart LR

A[hepic] -->|WS/JSON| C{h2z}
C -->|Zipkin/JSON| D[qryn]


style A fill:#d9ead3ff
style D fill:#FFA500ff
style C fill:#c9daf8ff
```

## Screenshots

![image](https://github.com/hepictel/h2z/assets/1423657/fe388ee6-8eff-4682-a759-d4c256ccd1c9)
