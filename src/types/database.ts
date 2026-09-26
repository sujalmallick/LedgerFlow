export interface RecentWorkbookRecord {
  id: number;
  file_uri: string;
  display_name: string | null;
  last_opened_at: string;
}

export interface ScanHistoryRecord {
  id: number;
  workbook_id: number;
  scanned_at: string;
  extraction_json: string;
  committed: number; // 0 or 1
}

export interface FieldMappingRecord {
  id: number;
  workbook_id: number;
  field_key: string;
  column_id: string;
}

export interface ColumnAliasRecord {
  id: number;
  canonical_field: string;
  alias: string;
}

export interface UserPreferenceRecord {
  key: string;
  value: string;
}
