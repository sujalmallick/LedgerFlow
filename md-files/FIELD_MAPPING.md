# Field Mapping & Column Aliases

## Purpose

Extracted fields (`challan_number`, `vehicle_number`, `driver_name`, `amount`, `date`, ...) need to land in whatever columns the user has already created in their own workbook — which may not use the same names.

## Canonical fields → known aliases (seed data)

| Canonical field | Known aliases |
|---|---|
| `vehicle_number` | Vehicle, Vehicle No, Vehicle Number, Registration Number, Reg No |
| `challan_number` | Challan No, Challan Number, Challan # |
| `driver_name` | Driver, Driver Name |
| `date` | Date, Challan Date, Entry Date |
| `amount` | Amount, Fine Amount, Total |

This table seeds `column_aliases` in SQLite and is user-extensible: the first time a field can't be auto-mapped, the user picks the matching column manually and the app stores that mapping (and, optionally, the alias) for next time.

## Matching strategy

1. **Exact match** — column name equals canonical field name (case-insensitive).
2. **Alias match** — column name matches an entry in `column_aliases` for that canonical field.
3. **Fuzzy match** (fallback) — normalize whitespace/case/punctuation and compare; surface as a suggestion, not an auto-commit.
4. **No match** — leave unmapped; the review screen prompts the user to pick a column or skip the field.

## Per-workbook overrides

Once a user maps a field to a column for a given workbook, that mapping is stored in `field_mappings` and reused for future scans against the same workbook — it does not need to be re-resolved every time.

## Review-screen behavior

- Every mapped field is shown next to the column it will populate.
- Fields extracted with low OCR/regex confidence are visually flagged.
- The user can edit any value, remap a field to a different column, or leave a field blank before confirming.
- Nothing is written to the workbook until the user explicitly confirms.
