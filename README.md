# h2z
HEPIC Trace Emitter/Converter


```mermaid
flowchart LR

A[HEPIC] -->|WS/JSON| C{h2z}
C -->|Trace| D[Zipkin]
C -->|Log| E[LogQL]
```
