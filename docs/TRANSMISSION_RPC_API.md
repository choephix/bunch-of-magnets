# Transmission RPC API Documentation

Comprehensive guide to the Transmission BitTorrent client's RPC API, focusing on functionalities needed for **Bunch of Magnets** integration.

## Overview

Transmission's RPC API is a JSON-based interface operating over HTTP. Unlike qBittorrent's REST-style API, Transmission uses JSON-RPC 2.0 with method-based calls.

| Aspect       | qBittorrent          | Transmission            |
| ------------ | -------------------- | ----------------------- |
| Protocol     | REST-style HTTP      | JSON-RPC 2.0            |
| Default Port | 8080                 | 9091                    |
| Auth         | Cookie-based session | Session ID + Basic Auth |
| Endpoint     | `/api/v2/*`          | `/transmission/rpc`     |

---

## Connection Details

### Default Endpoint

```
http://<host>:9091/transmission/rpc
```

### Environment Variables (proposed)

```bash
TRANSMISSION_URL=http://localhost:9091
TRANSMISSION_USERNAME=your_username
TRANSMISSION_PASSWORD=your_password
```

---

## Authentication Flow

Transmission uses a **two-step authentication** mechanism:

### Step 1: CSRF Protection (Session ID)

Every request **must** include an `X-Transmission-Session-Id` header. On first request (or expired session), server responds with `409 Conflict`:

```http
HTTP/1.1 409 Conflict
X-Transmission-Session-Id: abc123xyz789
```

Client must capture and reuse this session ID in all subsequent requests.

### Step 2: HTTP Basic Auth (if enabled)

If authentication is configured, include credentials via standard HTTP Basic Auth:

```http
Authorization: Basic <base64(username:password)>
```

### Implementation Pattern

```typescript
async function makeRequest(payload: object): Promise<Response> {
  const url = `${TRANSMISSION_URL}/transmission/rpc`
  const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${auth}`,
  }

  // First attempt
  let response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  // Handle CSRF token requirement
  if (response.status === 409) {
    const sessionId = response.headers.get('X-Transmission-Session-Id')
    headers['X-Transmission-Session-Id'] = sessionId!

    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  }

  return response
}
```

---

## Request/Response Structure

### Request Format

All requests are HTTP POST with JSON body:

```json
{
  "method": "method-name",
  "arguments": {
    /* method-specific params */
  },
  "tag": 123 // optional: client-defined ID for matching responses
}
```

### Response Format

```json
{
  "result": "success", // or error message string
  "arguments": {
    /* method-specific data */
  },
  "tag": 123 // echoed back if provided
}
```

**Key difference from qBittorrent:** Success/failure is in `result` string, not HTTP status code. Always check `result === "success"`.

---

## Core Methods for Bunch of Magnets

### 1. `torrent-add` — Add Torrents

**Primary method for adding magnet links.** This is equivalent to qBittorrent's `/api/v2/torrents/add`.

#### Request Arguments

| Argument            | Type    | Required                 | Description                                |
| ------------------- | ------- | ------------------------ | ------------------------------------------ |
| `filename`          | string  | One of filename/metainfo | URL, magnet link, or file path             |
| `metainfo`          | string  | One of filename/metainfo | Base64-encoded .torrent content            |
| `download-dir`      | string  | No                       | Custom save directory path                 |
| `paused`            | boolean | No                       | Add in paused state (default: false)       |
| `peer-limit`        | number  | No                       | Max number of peers                        |
| `bandwidthPriority` | number  | No                       | -1 (low), 0 (normal), 1 (high)             |
| `files-wanted`      | array   | No                       | Indices of files to download               |
| `files-unwanted`    | array   | No                       | Indices of files to skip                   |
| `priority-high`     | array   | No                       | File indices for high priority             |
| `priority-low`      | array   | No                       | File indices for low priority              |
| `priority-normal`   | array   | No                       | File indices for normal priority           |
| `labels`            | array   | No                       | Array of label strings (Transmission 4.0+) |

#### Adding a Magnet Link

```json
{
  "method": "torrent-add",
  "arguments": {
    "filename": "magnet:?xt=urn:btih:ABC123...&dn=Show.Name.S01E01",
    "download-dir": "/storage/Library/TV/Show Name/Season 1",
    "paused": false
  }
}
```

#### Success Response

```json
{
  "result": "success",
  "arguments": {
    "torrent-added": {
      "id": 42,
      "name": "Show.Name.S01E01.720p",
      "hashString": "abc123def456..."
    }
  }
}
```

#### Duplicate Response

If torrent already exists:

```json
{
  "result": "success",
  "arguments": {
    "torrent-duplicate": {
      "id": 42,
      "name": "Show.Name.S01E01.720p",
      "hashString": "abc123def456..."
    }
  }
}
```

**Note:** `torrent-duplicate` is NOT an error — it's still `"result": "success"`. Handle accordingly.

#### Error Response

```json
{
  "result": "invalid or corrupt torrent file"
}
```

Common error strings:

- `"invalid or corrupt torrent file"`
- `"duplicate torrent"`
- `"invalid argument"`

---

### 2. `session-get` — Get Session Info

Useful for verifying connection and getting default download directory.

#### Request

```json
{
  "method": "session-get"
}
```

#### Key Response Fields

```json
{
  "result": "success",
  "arguments": {
    "version": "4.0.5",
    "rpc-version": 18,
    "download-dir": "/home/user/Downloads",
    "download-dir-free-space": 123456789000,
    "speed-limit-down": 1000,
    "speed-limit-down-enabled": false,
    "speed-limit-up": 100,
    "speed-limit-up-enabled": true
  }
}
```

---

### 3. `torrent-get` — Query Torrents

Retrieve information about existing torrents.

#### Request

```json
{
  "method": "torrent-get",
  "arguments": {
    "ids": [1, 2, 3], // optional: omit for all torrents
    "fields": ["id", "name", "status", "percentDone", "downloadDir"]
  }
}
```

#### Useful Fields

| Field         | Type   | Description                                             |
| ------------- | ------ | ------------------------------------------------------- |
| `id`          | number | Torrent ID                                              |
| `name`        | string | Torrent name                                            |
| `status`      | number | Current status (see below)                              |
| `percentDone` | number | 0.0 to 1.0                                              |
| `downloadDir` | string | Save location                                           |
| `hashString`  | string | Info hash                                               |
| `totalSize`   | number | Total size in bytes                                     |
| `labels`      | array  | Labels/tags (4.0+)                                      |
| `error`       | number | 0=OK, 1=tracker warning, 2=tracker error, 3=local error |
| `errorString` | string | Error details                                           |

#### Status Values

| Value | Meaning            |
| ----- | ------------------ |
| 0     | Stopped            |
| 1     | Queued to verify   |
| 2     | Verifying          |
| 3     | Queued to download |
| 4     | Downloading        |
| 5     | Queued to seed     |
| 6     | Seeding            |

---

### 4. `torrent-start` / `torrent-stop` — Control Torrents

```json
{
  "method": "torrent-start",
  "arguments": {
    "ids": [1, 2, 3]
  }
}
```

---

### 5. `torrent-remove` — Remove Torrents

```json
{
  "method": "torrent-remove",
  "arguments": {
    "ids": [1, 2, 3],
    "delete-local-data": true // also delete downloaded files
  }
}
```

---

### 6. `torrent-set` — Modify Torrents

Change properties of existing torrents.

```json
{
  "method": "torrent-set",
  "arguments": {
    "ids": [1],
    "downloadDir": "/new/path",
    "labels": ["tv", "hd"],
    "bandwidthPriority": 1
  }
}
```

---

## Labels vs Categories

**Important difference from qBittorrent:**

| qBittorrent                       | Transmission            |
| --------------------------------- | ----------------------- |
| Categories (hierarchical, single) | Labels (flat, multiple) |
| Tags (multiple)                   | Labels (same as tags)   |

Transmission uses **labels** (array of strings) instead of categories. One torrent can have multiple labels. Available in Transmission 4.0+.

```json
{
  "method": "torrent-add",
  "arguments": {
    "filename": "magnet:?...",
    "labels": ["tv-shows", "hd", "in-progress"]
  }
}
```

---

## Batch Operations

### Adding Multiple Torrents

Unlike qBittorrent which accepts multiple URLs in one call, Transmission's `torrent-add` handles **one torrent per request**.

**Strategy for batch adding:**

```typescript
async function addTorrents(magnetLinks: string[], downloadDir: string) {
  const results = await Promise.all(
    magnetLinks.map((magnet) =>
      makeRequest({
        method: 'torrent-add',
        arguments: {
          filename: magnet,
          'download-dir': downloadDir,
        },
      })
    )
  )

  return results
}
```

**Performance note:** Transmission handles concurrent requests well. Can batch 50+ parallel requests.

---

## Error Handling

### HTTP Status Codes

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| 200  | Request processed (check `result` for success)       |
| 401  | Authentication required                              |
| 409  | Session ID expired/missing (get new one from header) |

### Result Strings

Always check `response.result`:

```typescript
const data = await response.json()

if (data.result !== 'success') {
  throw new Error(`Transmission error: ${data.result}`)
}

// Check for duplicate (not an error, but good to know)
if (data.arguments['torrent-duplicate']) {
  console.log('⚠️ Torrent already exists')
}
```

---

## Comparison: qBittorrent vs Transmission API

### Adding Torrents

**qBittorrent:**

```typescript
// POST /api/v2/torrents/add
const body = new URLSearchParams({
  urls: magnetLinks.join('\n'), // multiple URLs in one call
  savepath: '/storage/path',
  category: 'tv-shows',
  tags: 'hd,1080p',
})
```

**Transmission:**

```typescript
// POST /transmission/rpc (per torrent)
const body = {
  method: 'torrent-add',
  arguments: {
    filename: magnetLink, // single URL
    'download-dir': '/storage/path',
    labels: ['tv-shows', 'hd', '1080p'],
  },
}
```

### Key Differences Summary

| Feature                   | qBittorrent         | Transmission            |
| ------------------------- | ------------------- | ----------------------- |
| Multiple magnets per call | ✅ Yes              | ❌ No (one per call)    |
| Custom save path          | `savepath`          | `download-dir`          |
| Categories                | `category` (single) | N/A                     |
| Tags/Labels               | `tags` (comma-sep)  | `labels` (array, 4.0+)  |
| Auth method               | Cookie              | Session ID + Basic Auth |
| Response format           | Plain text / JSON   | Always JSON-RPC         |

---

## Implementation Checklist for Bunch of Magnets

### Required Changes

1. **New environment variables:**
   - `TRANSMISSION_URL`
   - `TRANSMISSION_USERNAME`
   - `TRANSMISSION_PASSWORD`

2. **New API route:** `/api/transmission/route.ts`
   - Handle session ID caching/refresh
   - Map internal request format to Transmission's format
   - Loop through magnets (one request per magnet)

3. **Service layer:** `/app/services/transmissionService.ts`
   - Abstract client selection (qBittorrent vs Transmission)
   - Common interface for both clients

4. **Config/Settings:**
   - Add torrent client selector in settings
   - Store/retrieve selected client preference

### Feature Parity Matrix

| Feature               | qBittorrent Support | Transmission Support  |
| --------------------- | ------------------- | --------------------- |
| Add magnet links      | ✅                  | ✅                    |
| Custom save directory | ✅                  | ✅                    |
| Categories            | ✅                  | ⚠️ Use labels instead |
| Tags                  | ✅                  | ✅ (as labels, 4.0+)  |
| Bulk add              | ✅ Native           | ✅ Loop + parallel    |
| Start paused          | ✅                  | ✅                    |
| Connection test       | ✅                  | ✅ via session-get    |

---

## TypeScript Types

```typescript
interface TransmissionRequest {
  method: string
  arguments?: Record<string, unknown>
  tag?: number
}

interface TransmissionResponse {
  result: string
  arguments?: Record<string, unknown>
  tag?: number
}

interface TorrentAddArgs {
  filename?: string // magnet link or URL
  metainfo?: string // base64 torrent
  'download-dir'?: string
  paused?: boolean
  labels?: string[]
  'peer-limit'?: number
  bandwidthPriority?: -1 | 0 | 1
}

interface TorrentAddedResponse {
  'torrent-added'?: {
    id: number
    name: string
    hashString: string
  }
  'torrent-duplicate'?: {
    id: number
    name: string
    hashString: string
  }
}
```

---

## References

- [Official RPC Specification](https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md)
- [Transmission Project](https://transmissionbt.com/)
- [TypeScript Client: @brielov/transmission-rpc](https://jsr.io/@brielov/transmission-rpc)
