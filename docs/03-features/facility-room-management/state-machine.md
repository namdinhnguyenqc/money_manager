# Facility & Room Management — State Machine

## Room Status Lifecycle

```mermaid
stateDiagram-v2
  [*] --> AVAILABLE : Room created
  AVAILABLE --> OCCUPIED : Contract activated
  OCCUPIED --> AVAILABLE : Contract terminated / deleted
  AVAILABLE --> MAINTENANCE : Owner sets maintenance
  MAINTENANCE --> AVAILABLE : Owner clears maintenance
```

## Facility Status

```mermaid
stateDiagram-v2
  [*] --> ACTIVE : Facility created
  ACTIVE --> INACTIVE : Owner deactivates
  INACTIVE --> ACTIVE : Owner reactivates
```

## Public Visibility Matrix

| Facility Status | Facility isPublic | Room Status | Room isPublic | Visible in Public Marketplace |
|---|---|---|---|---|
| ACTIVE | true | AVAILABLE | true | ✅ Yes |
| ACTIVE | true | OCCUPIED | true | ❌ No (occupied) |
| ACTIVE | false | AVAILABLE | true | ❌ No (facility hidden) |
| INACTIVE | true | AVAILABLE | true | ❌ No (facility inactive) |
