# Admin Management — State Machine

## User Status
```mermaid
stateDiagram-v2
  [*] --> ACTIVE : User created/registered
  ACTIVE --> BLOCKED : Admin blocks user
  BLOCKED --> ACTIVE : Admin unblocks user
  ACTIVE --> DELETED : Admin deletes user
```

## User Status Table
| Status | Meaning | Access |
|---|---|---|
| `active` | Normal account | Full access per role |
| `blocked` | Suspended by admin | Cannot authenticate |
| `deleted` | Removed by admin | Account removed |
