# O2UL Slice 1 Backfill

This repository includes a migration helper for importing legacy O2UL profile and preference data into:

- `o2ul_user_profiles`
- `o2ul_preferences`

using the new backend-template Strata repositories.

## Command

```bash
go run ./cmd/migrate o2ul-slice1-backfill --input ./path/to/legacy-export.json --dry-run=true
```

Flags:

- `--input` (required): path to JSON export file.
- `--dry-run` (default: `true`): validate and count records without writing.
- `--allow-missing-users` (default: `false`): import profiles even when user ID is missing from `users` table.

## Expected Input Shape

The tool accepts either `profiles` or `userProfiles` arrays, plus optional `preferences`.

```json
{
  "profiles": [
    {
      "playerId": "player-123",
      "username": "captain",
      "name": "Captain",
      "email": "captain@example.com",
      "phone": "+15551234567",
      "bio": "Legacy profile",
      "image": "https://cdn.example.com/avatar.png",
      "bgImageUrl": "https://cdn.example.com/bg.png",
      "bgImageStorageId": "storage-123",
      "bgImageOpacity": 1,
      "isAnonymous": false,
      "isOnline": true,
      "isBetaTester": false,
      "isHookupEnabled": true,
      "lastLoginDate": 1750000000000,
      "lastSeen": 1750000001000,
      "createdAt": 1740000000000,
      "updatedAt": 1750000002000
    }
  ],
  "preferences": {
    "mode": "beta",
    "enableCalling": true,
    "enabledOAuthProviders": ["google", "github"],
    "lastUpdated": 1750000003000,
    "updatedBy": "player-admin"
  }
}
```

## Notes

- OAuth provider lists are normalized to built-in platform auth only (`["platform"]`).
- Mode values outside `live|beta` are normalized to `live`.
- When `--allow-missing-users=false`, profiles for missing users are skipped.
