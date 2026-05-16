# {{ BOX_NAME }}

| Field | Value |
|-------|-------|
| **Target IP** | `{{ TARGET_IP }}` |
| **OS** | {{ OS }} |
| **Difficulty** | {{ DIFFICULTY }} |
| **Spawned** | {{ SPAWN_TIME }} |
| **Status** | 🟡 In Progress |

## Recon

### Port Scan

```
# nmap -sCV -p- -T4 {{ TARGET_IP }} -oA scans/nmap/initial
```

## Enumeration

## Foothold

## Privilege Escalation

## Flags

- **User**: `{{ USER_FLAG }}`
- **Root**: `{{ ROOT_FLAG }}`

## Notes / TIL
