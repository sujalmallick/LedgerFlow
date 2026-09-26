import { CanonicalFieldKey } from '../types/extraction';

export const CANONICAL_FIELDS: Record<
  CanonicalFieldKey,
  { label: string; aliases: string[] }
> = {
  invoice_number: {
    label: 'Invoice / Bill No',
    aliases: ['Invoice No', 'Invoice Number', 'Bill No', 'Bill Number', 'Inv No', 'Inv #', 'Memo No', 'Receipt No'],
  },
  challan_number: {
    label: 'Challan Number',
    aliases: ['Challan No.', 'Challan No', 'Challan Number', 'Challan #', 'Delivery Challan No', 'DC No', 'Challan'],
  },
  date: {
    label: 'Date',
    aliases: ['Date', 'Invoice Date', 'Bill Date', 'Challan Date', 'Entry Date', 'Dated'],
  },
  vendor_name: {
    label: 'Vendor / Supplier',
    aliases: ['Vendor', 'Supplier', 'Seller', 'Party Name', 'Biller', 'Shop Name', 'Merchant', 'Company Name'],
  },
  gstin: {
    label: 'GSTIN',
    aliases: ['GSTIN', 'GST No', 'GST Number', 'Tax ID', 'GST'],
  },
  amount: {
    label: 'Total Amount',
    aliases: ['Amount', 'Total Amount', 'Net Amount', 'Grand Total', 'Total', 'Bill Amount', 'Invoice Total'],
  },
  tax_amount: {
    label: 'Tax (GST)',
    aliases: ['Tax', 'Tax Amount', 'GST Amount', 'CGST', 'SGST', 'IGST', 'Vat'],
  },
  vehicle_number: {
    label: 'Vehicle Number',
    aliases: ['Vehicle No.', 'Vehicle No', 'Vehicle', 'Vehicle Number', 'Registration Number', 'Reg No', 'Truck No', 'Truck Number'],
  },
  driver_name: {
    label: 'Driver / Transporter',
    aliases: ['Driver', 'Driver Name', 'Transporter', 'Carrier', 'Contact Person'],
  },
  items_summary: {
    label: 'Items / Description',
    aliases: ['Items', 'Description', 'Particulars', 'Item Details', 'Material', 'Goods'],
  },
  serial_number: {
    label: 'Sl. No.',
    aliases: ['Sl. No.', 'Sl. No', 'Sl No.', 'Sl No', 'Serial No', 'Sr. No.', 'Sr No', 'S.No.', 'S.No', 'S No', 'Sl.'],
  },
  quantity: {
    label: 'Quantity (MT)',
    aliases: ['Quantity (MT)', 'Quantity(MT)', 'Quantity', 'Qty (MT)', 'Qty(MT)', 'Qty', 'Net Wt', 'Net Weight', 'Weight', 'Qty MT'],
  },
  hsd: {
    label: 'HSD',
    aliases: ['HSD', 'Diesel', 'Fuel', 'HSD (Ltr)', 'HSD Diesel', 'HSD Qty', 'H.S.D.', 'H.S.D'],
  },
};
