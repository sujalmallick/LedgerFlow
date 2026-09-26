import { ColumnDefinition } from '../../types/spreadsheet';
import { ExtractionResult, CanonicalFieldKey } from '../../types/extraction';
import { CANONICAL_FIELDS } from '../../constants/fields';
import { DatabaseService } from '../db/DatabaseService';

export interface FieldMappingResolution {
  fieldKey: string;
  fieldLabel: string;
  extractedValue: string | number;
  confidence: number;
  mappedColumnId: string | null;
  mappedColumnName: string | null;
  matchType: 'saved_override' | 'exact' | 'alias' | 'fuzzy' | 'unmapped';
}

export class FieldMappingService {
  // In-memory registry for per-workbook overrides (workbookId or fileName -> { canonicalKey: columnId })
  private static workbookOverrides: Record<string, Record<string, string>> = {};

  // Dynamic user-added aliases dictionary (canonicalKey -> Set of alias strings)
  // Initialized lazily on first use to avoid static {} block (unsupported by Metro Babel)
  private static _dynamicAliases: Record<string, Set<string>> | null = null;

  private static get dynamicAliases(): Record<string, Set<string>> {
    if (!FieldMappingService._dynamicAliases) {
      const aliases: Record<string, Set<string>> = {};
      (Object.keys(CANONICAL_FIELDS) as CanonicalFieldKey[]).forEach((key) => {
        aliases[key] = new Set(
          CANONICAL_FIELDS[key].aliases.map((a) => a.toLowerCase().trim())
        );
      });
      FieldMappingService._dynamicAliases = aliases;
    }
    return FieldMappingService._dynamicAliases;
  }

  /**
   * Normalizes a string for comparison (lowercase, trimmed, strips punctuation)
   */
  public static normalize(str: string): string {
    return (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Resolves field mappings for an extracted challan against the workbook's columns
   */
  public static resolveMappings(
    columns: ColumnDefinition[],
    extractionResult: ExtractionResult,
    workbookIdentifier?: string
  ): FieldMappingResolution[] {
    const resolutions: FieldMappingResolution[] = [];
    const usedColumnIds = new Set<string>();
    const safeColumns = Array.isArray(columns) ? columns : [];

    // Check if this workbook has stored overrides
    const overrides = workbookIdentifier
      ? this.workbookOverrides[workbookIdentifier] || {}
      : {};

    const extractedFields = extractionResult?.fields || {};

    for (const [fieldKey, fieldData] of Object.entries(extractedFields)) {
      const canonical = CANONICAL_FIELDS[fieldKey as CanonicalFieldKey];
      const fieldLabel = canonical?.label || fieldKey;
      const normKey = this.normalize(fieldKey);

      let matchedCol: ColumnDefinition | null = null;
      let matchType: FieldMappingResolution['matchType'] = 'unmapped';

      // 1. Tier 0: Check Per-Workbook Stored Override
      if (overrides[fieldKey]) {
        const found = safeColumns.find((c) => c.id === overrides[fieldKey]);
        if (found && !usedColumnIds.has(found.id)) {
          matchedCol = found;
          matchType = 'saved_override';
        }
      }

      // 2. Tier 1: Exact Match (e.g. column name "vehicle_number" or "Vehicle Number")
      if (!matchedCol) {
        for (const col of safeColumns) {
          if (usedColumnIds.has(col.id)) continue;
          const normCol = this.normalize(col.name);
          if (normCol && (normCol === normKey || normCol === this.normalize(fieldLabel))) {
            matchedCol = col;
            matchType = 'exact';
            break;
          }
        }
      }

      // 3. Tier 2: Alias Match (seed and user-added aliases)
      if (!matchedCol) {
        const aliases = this.dynamicAliases[fieldKey];
        if (aliases) {
          for (const col of safeColumns) {
            if (usedColumnIds.has(col.id)) continue;
            const normCol = this.normalize(col.name);
            if (!normCol) continue;
            for (const alias of aliases) {
              if (normCol === this.normalize(alias)) {
                matchedCol = col;
                matchType = 'alias';
                break;
              }
            }
            if (matchedCol) break;
          }
        }
      }

      // 4. Tier 3: Fuzzy Match (requires non-empty strings with at least 3 characters)
      if (!matchedCol && normKey.length >= 3) {
        for (const col of safeColumns) {
          if (usedColumnIds.has(col.id)) continue;
          const normCol = this.normalize(col.name);
          if (normCol.length >= 3) {
            if (
              normCol.includes(normKey) ||
              normKey.includes(normCol) ||
              (normCol.length >= 4 && this.normalize(fieldLabel).includes(normCol))
            ) {
              matchedCol = col;
              matchType = 'fuzzy';
              break;
            }
          }
        }
      }

      if (matchedCol) {
        usedColumnIds.add(matchedCol.id);
      }

      resolutions.push({
        fieldKey,
        fieldLabel,
        extractedValue: fieldData?.value ?? '',
        confidence: fieldData?.confidence ?? 0.95,
        mappedColumnId: matchedCol ? matchedCol.id : null,
        mappedColumnName: matchedCol ? matchedCol.name : null,
        matchType,
      });
    }

    return resolutions;
  }

  /**
   * Saves a user-confirmed column mapping for a workbook and extends aliases
   */
  public static saveMappingOverride(
    workbookIdentifier: string,
    fieldKey: string,
    column: ColumnDefinition
  ): void {
    if (!this.workbookOverrides[workbookIdentifier]) {
      this.workbookOverrides[workbookIdentifier] = {};
    }
    this.workbookOverrides[workbookIdentifier][fieldKey] = column.id;

    // Also teach the alias dictionary the user's column name
    if (!this.dynamicAliases[fieldKey]) {
      this.dynamicAliases[fieldKey] = new Set();
    }
    const cleanAlias = column.name.toLowerCase().trim();
    if (cleanAlias) {
      this.dynamicAliases[fieldKey].add(cleanAlias);
      DatabaseService.saveColumnAlias(fieldKey, column.name).catch(() => {});
    }
  }

  /**
   * Retrieves all custom saved overrides for a workbook
   */
  public static getWorkbookOverrides(
    workbookIdentifier: string
  ): Record<string, string> {
    return this.workbookOverrides[workbookIdentifier] || {};
  }
}

