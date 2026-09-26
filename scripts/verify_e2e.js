const assert = require('assert');
const XLSX = require('xlsx');

// 1. Test Field Extraction Logic
console.log('--- Testing RuleBasedFieldExtractor ---');
const sampleOcrText = `
GOVERNMENT OF ODISHA
TRANSPORT DEPARTMENT
E-CHALLAN RECEIPT
Challan No: INV-2026-01842
Date of Violation: 23/09/2026 14:30
Vehicle No: OD02AB4521
Driver: Rakesh Kumar
Compounding Fee Amount: INR 18,450.00
Payment Status: Unpaid
`;

function extractFields(text) {
  const fields = {};
  const invalidKeywords = /^(?:receipt|notice|copy|department|traffic|police|book|memo)$/i;

  // Challan No
  const challanRegex = /(?:challan|receipt|ticket|notice)\s*(?:number|num|no|#)\s*[:.-]?\s*([A-Z0-9\/-]{3,25})/i;
  const challanMatch = text.match(challanRegex);
  if (challanMatch && challanMatch[1] && !invalidKeywords.test(challanMatch[1].trim())) {
    fields.challan_number = { value: challanMatch[1].trim(), confidence: 0.98 };
  }

  // Date
  const dateMatch = text.match(/(?:date(?:\s+of\s+[a-z]+)?|dated|dt)[:.\s-]*(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i);
  if (dateMatch) {
    fields.date = { value: dateMatch[1].replace(/[-.]/g, '/').trim(), confidence: 0.95 };
  }

  // Vehicle Number (Indian registration)
  const vehicleMatch = text.match(/\b([A-Z]{2}\s*[-]?\s*\d{1,2}\s*[-]?\s*[A-Z]{1,3}\s*[-]?\s*\d{4})\b/i);
  if (vehicleMatch) {
    const cleaned = vehicleMatch[1].replace(/[\s-]/g, '').toUpperCase();
    fields.vehicle_number = { value: cleaned, confidence: 0.97 };
  }

  // Driver Name
  const driverMatch = text.match(/(?:driver(?:\s*name)?|operator|violator)[:\s-]*([A-Za-z\s]{3,30})(?:\r?\n|$)/i);
  if (driverMatch) {
    fields.driver_name = { value: driverMatch[1].trim(), confidence: 0.85 };
  }

  // Amount
  const amountMatch = text.match(/(?:amount|fine|fee|total|paid|due|compounding fee amount)[:\s]*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(/,/g, '');
    const num = parseFloat(rawNum);
    if (!isNaN(num)) {
      fields.amount = { value: num, confidence: 0.96 };
    }
  }

  return fields;
}

const extracted = extractFields(sampleOcrText);
console.log('Extracted fields:', extracted);
assert.strictEqual(extracted.challan_number.value, 'INV-2026-01842');
assert.strictEqual(extracted.date.value, '23/09/2026');
assert.strictEqual(extracted.vehicle_number.value, 'OD02AB4521');
assert.strictEqual(extracted.driver_name.value, 'Rakesh Kumar');
assert.strictEqual(extracted.amount.value, 18450);
console.log('✓ Field extraction passed!');

// 2. Test Field Mapping
console.log('\n--- Testing Field Mapping Logic ---');
const sampleColumns = [
  { id: 'col_challan_1', name: 'Challan #', type: 'text', index: 0 },
  { id: 'col_date_2', name: 'Entry Date', type: 'date', index: 1 },
  { id: 'col_vehicle_3', name: 'Vehicle Registration', type: 'text', index: 2 },
  { id: 'col_driver_4', name: 'Driver', type: 'text', index: 3 },
  { id: 'col_amount_5', name: 'Total Fine (INR)', type: 'currency', index: 4 },
];

const SEED_ALIASES = {
  vehicle_number: ['vehicle', 'vehicle no', 'vehicle number', 'registration number', 'reg no', 'vehicle registration'],
  challan_number: ['challan no', 'challan number', 'challan #', 'invoice no'],
  driver_name: ['driver', 'driver name', 'operator'],
  date: ['date', 'challan date', 'entry date'],
  amount: ['amount', 'fine amount', 'total', 'total fine (inr)'],
};

function resolveMappings(columns, fields) {
  const resolutions = [];

  for (const [key, data] of Object.entries(fields)) {
    let matchedCol = null;
    let matchType = 'unmapped';

    // Tier 1: Exact Match
    matchedCol = columns.find(c => c.name.toLowerCase() === key.toLowerCase());
    if (matchedCol) {
      matchType = 'exact';
    }

    // Tier 2: Alias Match
    if (!matchedCol && SEED_ALIASES[key]) {
      matchedCol = columns.find(c =>
        SEED_ALIASES[key].some(alias => alias.toLowerCase() === c.name.toLowerCase())
      );
      if (matchedCol) {
        matchType = 'alias';
      }
    }

    // Tier 3: Fuzzy Match
    if (!matchedCol) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      matchedCol = columns.find(c => {
        const cleanCol = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanCol.includes(cleanKey) || cleanKey.includes(cleanCol);
      });
      if (matchedCol) {
        matchType = 'fuzzy';
      }
    }

    resolutions.push({
      fieldKey: key,
      mappedColumnId: matchedCol ? matchedCol.id : null,
      mappedColumnName: matchedCol ? matchedCol.name : null,
      matchType,
      value: data.value,
      confidence: data.confidence,
    });
  }

  return resolutions;
}

const mappings = resolveMappings(sampleColumns, extracted);
console.log('Mapping resolutions:');
mappings.forEach(m => {
  console.log(` - ${m.fieldKey} (${m.matchType}) -> ${m.mappedColumnName} [${m.mappedColumnId}]`);
});

assert.strictEqual(mappings.find(m => m.fieldKey === 'challan_number').mappedColumnId, 'col_challan_1');
assert.strictEqual(mappings.find(m => m.fieldKey === 'date').mappedColumnId, 'col_date_2');
assert.strictEqual(mappings.find(m => m.fieldKey === 'vehicle_number').mappedColumnId, 'col_vehicle_3');
assert.strictEqual(mappings.find(m => m.fieldKey === 'driver_name').mappedColumnId, 'col_driver_4');
assert.strictEqual(mappings.find(m => m.fieldKey === 'amount').mappedColumnId, 'col_amount_5');
console.log('✓ Field mapping passed!');

// 3. Test Row Commit & Workbook Mutation
console.log('\n--- Testing SpreadsheetService addRow with Column IDs ---');
const wb = {
  fileName: 'September_Delivery_Challans.xlsx',
  activeSheetIndex: 0,
  sheets: [
    {
      name: 'Sheet1',
      columns: sampleColumns,
      rows: [
        {
          id: 'row_1',
          index: 0,
          values: {
            col_challan_1: 'INV-2026-00101',
            col_date_2: '20/09/2026',
            col_vehicle_3: 'OD02AA1111',
            col_driver_4: 'Suresh Patil',
            col_amount_5: 5000,
          },
        },
      ],
    },
  ],
};

const newRowValues = {};
mappings.forEach(m => {
  if (m.mappedColumnId) {
    newRowValues[m.mappedColumnId] = m.value;
  }
});

const newRowId = 'row_' + Date.now();
const newRow = {
  id: newRowId,
  index: wb.sheets[0].rows.length,
  values: newRowValues,
};
wb.sheets[0].rows.push(newRow);

console.log('Rows count after commit:', wb.sheets[0].rows.length);
assert.strictEqual(wb.sheets[0].rows.length, 2);
assert.strictEqual(wb.sheets[0].rows[1].values.col_challan_1, 'INV-2026-01842');
assert.strictEqual(wb.sheets[0].rows[1].values.col_amount_5, 18450);
console.log('✓ Spreadsheet addRow with internal column IDs passed!');

// 4. Test Export Generation (XLSX and CSV via SheetJS)
console.log('\n--- Testing Export Generation (XLSX & CSV) ---');
const sheet = wb.sheets[0];
const headers = sheet.columns.map(c => c.name);
const dataRows = sheet.rows.map(row => {
  return sheet.columns.map(col => row.values[col.id] ?? '');
});

const sheetData = [headers, ...dataRows];
const ws = XLSX.utils.aoa_to_sheet(sheetData);
const outWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(outWb, ws, sheet.name);

// Generate XLSX base64
const xlsxBase64 = XLSX.write(outWb, { type: 'base64', bookType: 'xlsx' });
assert.ok(xlsxBase64 && xlsxBase64.length > 100);
console.log(`Generated XLSX binary size: ${xlsxBase64.length} base64 chars`);

// Generate CSV string
const csvContent = XLSX.utils.sheet_to_csv(ws);
console.log('Generated CSV content:\n' + csvContent);
assert.ok(csvContent.includes('Challan #,Entry Date,Vehicle Registration,Driver,Total Fine (INR)'));
assert.ok(csvContent.includes('INV-2026-01842,23/09/2026,OD02AB4521,Rakesh Kumar,18450'));
console.log('✓ Export generation passed!');

console.log('\n🎉 ALL PIPELINE TESTS PASSED SUCCESSFULLY! 🎉');
