import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StatusBar,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  BackHandler,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ExtractionResult, ExtractedFieldValue } from '../types/extraction';
import { WorkbookData } from '../types/spreadsheet';
import { SpreadsheetService } from '../services/excel/SpreadsheetService';
import { FileService } from '../services/storage/FileService';
import { FieldMappingService } from '../services/mapping/FieldMappingService';
import { CANONICAL_FIELDS } from '../constants/fields';
import { colors } from '../theme/colors';
import { radii, touchTarget, shadows } from '../theme/spacing';
import { rs, ms, gutter } from '../theme/responsive';
import { Icon } from '../components/common/Icon';
import { AppLogo } from '../components/common/AppLogo';
import { Button } from '../components/common/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

interface EditableField {
  key: string;
  label: string;
  value: string;
  needsReview: boolean;
}

/**
 * ReviewScreen — LedgerFlow Document Review (Clean)
 * Source of truth: Google Stitch screen 0dedfb7ef23443fcbad0d08f56770bc3
 */
interface LineItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
}

export const ReviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const targetWorkbook = route.params?.targetWorkbook;
  const fileName = route.params?.fileName ?? 'September_Delivery_Challans.xlsx';

  const fallbackExtractionResult: ExtractionResult = {
    fields: {
      challan_number: { value: 'CH-8821', confidence: 0.98, rawText: 'CH-8821' },
      date: { value: '24 Sep 2026', confidence: 0.96, rawText: '24 Sep 2026' },
      vendor: { value: 'Shree Traders', confidence: 0.95, rawText: 'Shree Traders' },
      vehicle_number: { value: 'MH-12-AB-1234', confidence: 0.85, rawText: 'MH-12-AB-1234' },
      driver_name: { value: 'Ramesh Sharma', confidence: 0.92, rawText: 'Ramesh Sharma' },
      amount: { value: '14,250.00', confidence: 0.88, rawText: '14,250.00' },
    },
  };

  const extractionResult: ExtractionResult =
    route.params?.extractionResult ?? fallbackExtractionResult;

  const buildEditableFields = (): EditableField[] => {
    return Object.entries(extractionResult.fields).map(([key, fieldValue]) => {
      const fv = fieldValue as ExtractedFieldValue;
      const fieldDef = CANONICAL_FIELDS[key as keyof typeof CANONICAL_FIELDS];
      const label = fieldDef ? fieldDef.label : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const valStr = fv.value !== undefined && fv.value !== null ? String(fv.value) : '';
      const needsReview = (fv.confidence !== undefined && fv.confidence < 0.90) || key === 'vehicle_number';
      return { key, label, value: valStr, needsReview };
    });
  };
  const [editableFields, setEditableFields] = useState<EditableField[]>(buildEditableFields());
  const [committedWorkbook, setCommittedWorkbook] = useState<WorkbookData | null>(null);
  const [slipExpanded, setSlipExpanded] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);

  // Interactive Line Items (empty by default, user-addable)
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editRate, setEditRate] = useState('');

  const subtotal = lineItems.reduce((acc, it) => acc + it.qty * it.rate, 0);

  const handleOpenEditItem = (item: LineItem) => {
    setEditingItem(item);
    setIsNewItem(false);
    setEditName(item.name);
    setEditQty(String(item.qty));
    setEditRate(String(item.rate));
  };

  const handleOpenAddItem = () => {
    const newItem: LineItem = {
      id: String(Date.now()),
      name: '',
      qty: 1,
      rate: 0,
    };
    setEditingItem(newItem);
    setIsNewItem(true);
    setEditName('');
    setEditQty('1');
    setEditRate('');
  };

  const handleSaveItem = () => {
    if (!editingItem || !editName.trim()) {
      Alert.alert('Required', 'Please enter an item name.');
      return;
    }
    const q = Math.max(1, parseInt(editQty, 10) || 1);
    const r = Math.max(0, parseFloat(editRate) || 0);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    let updatedList: LineItem[];
    if (isNewItem) {
      updatedList = [...lineItems, { ...editingItem, name: editName.trim(), qty: q, rate: r }];
    } else {
      updatedList = lineItems.map((it) =>
        it.id === editingItem.id ? { ...it, name: editName.trim(), qty: q, rate: r } : it
      );
    }
    setLineItems(updatedList);
    const newTotal = updatedList.reduce((acc, it) => acc + it.qty * it.rate, 0);
    const formattedTotal = newTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setEditableFields((prev) =>
      prev.map((f) =>
        f.key === 'amount' || f.key.toLowerCase().includes('amount')
          ? { ...f, value: formattedTotal }
          : f
      )
    );
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updatedList = lineItems.filter((it) => it.id !== id);
    setLineItems(updatedList);
    const newTotal = updatedList.reduce((acc, it) => acc + it.qty * it.rate, 0);
    const formattedTotal = newTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setEditableFields((prev) =>
      prev.map((f) =>
        f.key === 'amount' || f.key.toLowerCase().includes('amount')
          ? { ...f, value: formattedTotal }
          : f
      )
    );
    setEditingItem(null);
  };

  const handleClearAllFields = () => {
    Alert.alert(
      'Clear All Fields',
      'Do you want to clear all entered values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setEditableFields((prev) => prev.map((f) => ({ ...f, value: '' })));
            setOptionsModalVisible(false);
          },
        },
      ]
    );
  };

  const handleDiscardScan = () => {
    Alert.alert(
      'Discard Scan',
      'Are you sure you want to discard this bill without saving?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setOptionsModalVisible(false);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleFieldChange = (key: string, newValue: string) => {
    setEditableFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, value: newValue } : f))
    );
  };

  const handleAddToExcel = async () => {
    let activeWorkbook =
      targetWorkbook ??
      committedWorkbook ??
      SpreadsheetService.getActiveWorkbook();

    if (!activeWorkbook) {
      activeWorkbook = SpreadsheetService.createBlankWorkbook(fileName || 'Scanned_Challans.xlsx');
    }

    setIsSaving(true);
    const activeSheetIndex = activeWorkbook.activeSheetIndex ?? 0;
    const sheetCols = activeWorkbook.sheets[activeSheetIndex]?.columns || [];

    const rowValues: Record<string, unknown> = {};

    // 1. Resolve mappings using FieldMappingService (exact, alias, and fuzzy matching)
    const currentExtraction: ExtractionResult = {
      fields: {},
    };
    editableFields.forEach((f) => {
      currentExtraction.fields[f.key] = { value: f.value, rawText: f.value };
    });

    const resolutions = FieldMappingService.resolveMappings(
      sheetCols,
      currentExtraction,
      activeWorkbook.fileName
    );

    // Apply resolved column IDs
    resolutions.forEach((res) => {
      let val: unknown = res.extractedValue;
      if (res.mappedColumnId) {
        const targetCol = sheetCols.find((c) => c.id === res.mappedColumnId);
        if (targetCol && (targetCol.type === 'number' || targetCol.type === 'currency')) {
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) val = num;
        }
        rowValues[res.mappedColumnId] = val;
      }
      rowValues[res.fieldKey] = val;
    });

    // 2. Direct fallback for any column matching canonical keys or labels
    editableFields.forEach((f) => {
      let val: unknown = f.value;
      const col = sheetCols.find(
        (c) =>
          c.id === f.key ||
          FieldMappingService.normalize(c.name) === FieldMappingService.normalize(f.key) ||
          FieldMappingService.normalize(c.name) === FieldMappingService.normalize(f.label) ||
          c.name.toLowerCase().includes(f.key.toLowerCase().replace(/_/g, ' ')) ||
          f.key.toLowerCase().includes(c.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );

      if (col && (rowValues[col.id] === undefined || rowValues[col.id] === null)) {
        if (col.type === 'number' || col.type === 'currency') {
          const num = parseFloat(String(f.value).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) val = num;
        }
        rowValues[col.id] = val;
      }
      if (rowValues[f.key] === undefined) {
        rowValues[f.key] = val;
      }
    });

    if (lineItems.length > 0) {
      const itemsSummary = lineItems
        .map((it) => `${it.name} (${it.qty} x ${it.rate})`)
        .join(', ');
      const itemCol = sheetCols.find((c) =>
        ['item', 'description', 'particular', 'material', 'goods'].some((k) =>
          c.name.toLowerCase().includes(k)
        )
      );
      if (itemCol) {
        rowValues[itemCol.id] = itemsSummary;
      }
      rowValues.items_summary = itemsSummary;
      rowValues.items = itemsSummary;
      rowValues.description = itemsSummary;
    }

    const { updatedWorkbook } = SpreadsheetService.addRow(
      activeWorkbook,
      activeSheetIndex,
      rowValues
    );

    // Save to active in-memory cache IMMEDIATELY
    SpreadsheetService.setActiveWorkbook(updatedWorkbook);

    // Auto-save confirmed row into device storage
    try {
      await FileService.saveWorkbook(updatedWorkbook);
    } catch (e) {
      Alert.alert(
        'Save Failed',
        'Could not save the file to disk. Your data was added in memory, but could not be written to storage.'
      );
    }

    setIsSaving(false);
    setCommittedWorkbook(updatedWorkbook);
    setSuccessModalVisible(true);
    navigation.setParams({ targetWorkbook: updatedWorkbook });
  };

  const handleViewRow = () => {
    setSuccessModalVisible(false);
    const finalWb = committedWorkbook ?? targetWorkbook ?? SpreadsheetService.getActiveWorkbook();
    if (finalWb) {
      navigation.navigate('Workbook', { initialWorkbook: finalWb, fileName: finalWb.fileName || fileName });
    } else {
      navigation.goBack();
    }
  };

  const handleContinueScanning = () => {
    setSuccessModalVisible(false);
    const finalWb = committedWorkbook ?? targetWorkbook ?? SpreadsheetService.getActiveWorkbook();
    navigation.navigate('Camera', { targetWorkbook: finalWb || undefined, fileName: finalWb?.fileName || fileName });
  };

  // Hardware back press handler: return to Workbook if already committed
  useEffect(() => {
    const onBackPress = () => {
      if (committedWorkbook) {
        handleViewRow();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [committedWorkbook]);

  const handleToggleSlip = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSlipExpanded((prev) => !prev);
  };

  const docNumber =
    editableFields.find((f) => f.key === 'challan_number' || f.key === 'invoice_number')?.value ||
    'DOC';
  const docDate = editableFields.find((f) => f.key === 'date')?.value || '';
  const vendorName = editableFields.find((f) => f.key === 'vendor_name' || f.key === 'vendor')?.value || '';
  const vehicleNo = editableFields.find((f) => f.key === 'vehicle_number')?.value || '';
  const driverName = editableFields.find((f) => f.key === 'driver_name')?.value || '';
  const gstinVal = editableFields.find((f) => f.key === 'gstin')?.value || '';
  const amountVal =
    editableFields.find((f) => f.key === 'amount' || f.key.includes('amount'))?.value ||
    (subtotal > 0 ? subtotal.toFixed(2) : '');

  const G = gutter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Top App Bar with First Logo (Stitch header) */}
      <View style={[styles.topAppBar, { paddingHorizontal: G }]}>
        <View style={styles.appBarLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={rs(20)} color={colors.textPrimary} />
          </TouchableOpacity>
          <AppLogo size={rs(28)} variant="brand" />
          <Text style={styles.appBarTitle} numberOfLines={1}>
            Document Review
          </Text>
        </View>
        <View style={styles.topAppBarRight}>
          <TouchableOpacity
            style={styles.moreBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setOptionsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Icon name="more-vert" size={rs(20)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: G }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Check Details Header Row */}
        <View style={styles.headerBlock}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Check the details</Text>
            <View style={styles.readyBadge}>
              <View style={styles.readyDot} />
              <Text style={styles.readyText}>Ready to save</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Edit anything that needs correcting
          </Text>
        </View>

        {/* Adding to File Destination Banner */}
        <TouchableOpacity
          style={styles.destinationBanner}
          onPress={() =>
            Alert.alert(
              'Saving to File',
              `Target file: ${fileName}\n\nWhen you tap "Add to Excel Sheet", this entry will be appended as a new row.`
            )
          }
          activeOpacity={0.85}
        >
          <View style={styles.destinationLeft}>
            <View style={styles.destIconBox}>
              <Icon name="table" size={rs(18)} color={colors.primary} />
            </View>
            <View style={styles.destTextCol}>
              <Text style={styles.destLabel}>Adding to file</Text>
              <Text style={styles.destFileName} numberOfLines={1}>
                {fileName}
              </Text>
            </View>
          </View>
          <Icon name="lock" size={rs(16)} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Source Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptRow}>
            <TouchableOpacity
              style={styles.receiptThumbBox}
              onPress={handleToggleSlip}
              activeOpacity={0.8}
            >
              <Icon name="receipt-long" size={rs(24)} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.receiptMetaCol}>
              <View style={styles.receiptTopMeta}>
                <Text style={styles.receiptSourceLabel}>SCANNED BILL</Text>
                <Text style={styles.receiptIdTag}>{docNumber}</Text>
              </View>
              <Text style={styles.receiptName}>
                {vendorName || (vehicleNo ? `Vehicle: ${vehicleNo}` : 'Document Summary')}
              </Text>
              <TouchableOpacity
                style={styles.viewSlipLink}
                onPress={handleToggleSlip}
                activeOpacity={0.7}
              >
                <Icon
                  name="visibility"
                  size={rs(14)}
                  color={colors.primary}
                />
                <Text style={styles.viewSlipLinkText}>
                  {slipExpanded ? 'Hide details' : 'View extracted summary'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Expandable Paper Slip Representation */}
          {slipExpanded && (
            <View style={styles.expandedSlipBox}>
              <Text style={styles.slipHeader}>DOCUMENT SUMMARY</Text>
              <Text style={styles.slipText}>No: {docNumber}{docDate ? `  ·  Date: ${docDate}` : ''}</Text>
              <View style={styles.slipDivider} />
              {vendorName ? <Text style={styles.slipText}>Party: {vendorName}</Text> : null}
              {gstinVal ? <Text style={styles.slipText}>GSTIN: {gstinVal}</Text> : null}
              {vehicleNo ? <Text style={styles.slipText}>Vehicle: {vehicleNo}</Text> : null}
              {driverName ? <Text style={styles.slipText}>Driver: {driverName}</Text> : null}
              <View style={styles.slipDivider} />
              <Text style={styles.slipTotal}>Total: ₹ {amountVal || '0.00'}</Text>
            </View>
          )}
        </View>

        {/* Extracted Fields Section */}
        <View style={styles.fieldsSection}>
          <View style={styles.fieldsHeaderRow}>
            <Text style={styles.fieldsSectionTitle}>Extracted Fields</Text>
            <Text style={styles.fieldsSectionHint}>Tap any row to edit</Text>
          </View>

          {/* Field Cards */}
          <View style={styles.fieldsList}>
            {/* Top 2-Column Row: Challan Number & Date (Stitch grid-cols-2) */}
            {(() => {
              const challanField = editableFields.find((f) => f.key === 'challan_number');
              const dateField = editableFields.find((f) => f.key === 'date');
              if (challanField || dateField) {
                return (
                  <View style={styles.twoColRow}>
                    {challanField && (
                      <View style={[styles.fieldCard, styles.colHalf]}>
                        <Text style={styles.fieldLabel}>{challanField.label}</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={challanField.value}
                          onChangeText={(txt) => handleFieldChange(challanField.key, txt)}
                          placeholderTextColor={colors.textMuted}
                          underlineColorAndroid="transparent"
                        />
                      </View>
                    )}
                    {dateField && (
                      <View style={[styles.fieldCard, styles.colHalf]}>
                        <Text style={styles.fieldLabel}>{dateField.label}</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={dateField.value}
                          onChangeText={(txt) => handleFieldChange(dateField.key, txt)}
                          placeholderTextColor={colors.textMuted}
                          underlineColorAndroid="transparent"
                        />
                      </View>
                    )}
                  </View>
                );
              }
              return null;
            })()}

            {editableFields
              .filter((f) => f.key !== 'challan_number' && f.key !== 'date')
              .map((field) => {
                const isAmount = field.key === 'amount' || field.key.toLowerCase().includes('amount');

                if (field.needsReview) {
                  return (
                    <View key={field.key} style={styles.fieldCardWarning}>
                      <View style={styles.warningAccentStrip} />
                      <View style={styles.warningCardContent}>
                        <View style={styles.warningFieldHeader}>
                          <Text style={styles.fieldLabel}>{field.label}</Text>
                          <TouchableOpacity
                            style={styles.cautionBadge}
                            onPress={() =>
                              Alert.alert(
                                'Check Vehicle Number',
                                'Vehicle numbers on paper challans are often faint or handwritten. Please verify that this matches your paper slip.'
                              )
                            }
                            activeOpacity={0.7}
                          >
                            <Icon name="info" size={rs(12)} color="#B45309" />
                            <Text style={styles.cautionText}>Please check this field</Text>
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={styles.fieldInput}
                          value={field.value}
                          onChangeText={(txt) => handleFieldChange(field.key, txt)}
                          placeholderTextColor={colors.textMuted}
                          underlineColorAndroid="transparent"
                        />
                      </View>
                    </View>
                  );
                }

                if (isAmount) {
                  return (
                    <View key={field.key} style={styles.amountCard}>
                      <View style={styles.amountTextCol}>
                        <Text style={styles.fieldLabel}>{field.label}</Text>
                        <TextInput
                          style={styles.amountInput}
                          value={field.value.startsWith('₹') ? field.value : `₹ ${field.value}`}
                          onChangeText={(txt) => {
                            const cleaned = txt.replace('₹', '').trim();
                            handleFieldChange(field.key, cleaned);
                          }}
                          keyboardType="decimal-pad"
                          placeholderTextColor={colors.textMuted}
                          underlineColorAndroid="transparent"
                        />
                      </View>
                      <View style={styles.amountIconCircle}>
                        <Icon name="currency-rupee" size={rs(18)} color={colors.textSecondary} />
                      </View>
                    </View>
                  );
                }

                return (
                  <View key={field.key} style={styles.fieldCard}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={field.value}
                      onChangeText={(txt) => handleFieldChange(field.key, txt)}
                      placeholderTextColor={colors.textMuted}
                      underlineColorAndroid="transparent"
                    />
                  </View>
                );
              })}
          </View>
        </View>

        {/* Line Items Overview Card (Stitch) */}
        <View style={styles.lineItemsCard}>
          <View style={styles.lineItemsHeaderRow}>
            <View style={styles.lineItemsTitleGroup}>
              <Icon name="receipt-long" size={rs(16)} color={colors.secondary} />
              <Text style={styles.lineItemsTitle}>Line Items ({lineItems.length})</Text>
            </View>
            <TouchableOpacity
              style={styles.addItemSmallBtn}
              onPress={handleOpenAddItem}
              activeOpacity={0.75}
            >
              <Icon name="add" size={rs(14)} color={colors.primary} />
              <Text style={styles.addItemSmallText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.lineItemsList}>
            {lineItems.length === 0 ? (
              <View style={{ paddingVertical: rs(12), alignItems: 'center' }}>
                <Text style={{ fontSize: ms(12), color: colors.textSecondary, textAlign: 'center' }}>
                  No item breakdown entered. Tap "+ Add Item" if you wish to record individual items.
                </Text>
              </View>
            ) : (
              lineItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.lineItemRow}
                  onPress={() => handleOpenEditItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.lineItemInfo}>
                    <Text style={styles.lineItemName}>{item.name}</Text>
                    <Text style={styles.lineItemDetails}>Qty: {item.qty} · Rate: ₹{item.rate}</Text>
                  </View>
                  <View style={styles.lineItemRight}>
                    <Text style={styles.lineItemAmount}>₹ {(item.qty * item.rate).toLocaleString('en-IN')}</Text>
                    <Icon name="edit" size={rs(14)} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {subtotal > 0 && (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Items Subtotal</Text>
              <Text style={styles.subtotalAmount}>
                ₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Panel (Stitch) */}
      <View style={[styles.bottomActionPanel, { paddingHorizontal: G }]}>
        <Button
          label="Add to Excel Sheet"
          variant="primary"
          icon="save"
          onPress={handleAddToExcel}
          loading={isSaving}
          fullWidth
          style={{ height: rs(48) }}
        />
        <Button
          label="Scan Again"
          variant="ghost"
          icon="camera"
          onPress={() => navigation.goBack()}
          fullWidth
          style={{ height: rs(38), marginTop: rs(4) }}
        />
        <Text style={styles.safetyFooterText}>
          Nothing is saved until you tap Add to Excel Sheet
        </Text>
      </View>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleViewRow}
      >
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Icon name="check" size={rs(26)} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Row added to Excel</Text>
            <Text style={styles.successSubtitle}>
              Successfully recorded in {fileName}.
            </Text>

            <View style={styles.successBtnStack}>
              <Button
                label="View in Workbook"
                variant="primary"
                icon="table"
                onPress={handleViewRow}
                fullWidth
              />
              <Button
                label="Scan Another Bill"
                variant="secondary"
                icon="camera"
                onPress={handleContinueScanning}
                fullWidth
                style={{ marginTop: rs(8) }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Line Item Modal */}
      <Modal
        visible={editingItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.itemEditCard}>
            <Text style={styles.itemEditTitle}>
              {isNewItem ? 'Add Line Item' : 'Edit Line Item'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputGroupLabel}>Item Description</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Cement 50kg Bags"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>

            <View style={styles.modalTwoCol}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputGroupLabel}>Quantity</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editQty}
                  onChangeText={setEditQty}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputGroupLabel}>Rate (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editRate}
                  onChangeText={setEditRate}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.itemEditBtnRow}>
              {!isNewItem && (
                <TouchableOpacity
                  style={styles.deleteItemBtn}
                  onPress={() => editingItem && handleDeleteItem(editingItem.id)}
                >
                  <Icon name="delete" size={rs(16)} color={colors.error} />
                  <Text style={styles.deleteItemBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
              <View style={styles.itemEditRightBtns}>
                <TouchableOpacity
                  style={styles.itemEditCancelBtn}
                  onPress={() => setEditingItem(null)}
                >
                  <Text style={styles.itemEditCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.itemEditSaveBtn}
                  onPress={handleSaveItem}
                >
                  <Text style={styles.itemEditSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Options Modal */}
      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdropBottom}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Document Options</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOptionsModalVisible(false);
                navigation.goBack();
              }}
            >
              <Icon name="camera" size={rs(18)} color={colors.primary} />
              <Text style={styles.menuItemText}>Scan again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleClearAllFields}
            >
              <Icon name="edit" size={rs(18)} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Clear all values</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDestructive]}
              onPress={handleDiscardScan}
            >
              <Icon name="delete" size={rs(18)} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Discard this scan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setOptionsModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topAppBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    flex: 1,
  },
  backBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBarTitle: {
    fontSize: ms(16),
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: rs(2),
  },
  topAppBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  moreBtn: {
    width: rs(36),
    height: rs(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarCircle: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: rs(14),
    paddingBottom: rs(140),
    gap: rs(14),
  },
  headerBlock: {},
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: ms(20),
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: ms(14),
    color: colors.textSecondary,
    marginTop: rs(3),
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  readyDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
    backgroundColor: colors.tertiaryContainer,
  },
  readyText: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  destinationBanner: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  destinationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    flex: 1,
  },
  destIconBox: {
    width: rs(36),
    height: rs(36),
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destTextCol: {
    flex: 1,
  },
  destLabel: {
    fontSize: ms(11),
    color: colors.textSecondary,
  },
  destFileName: {
    fontSize: ms(14),
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: rs(1),
  },
  receiptCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(12),
    ...shadows.sm,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  receiptThumbBox: {
    width: rs(52),
    height: rs(52),
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptMetaCol: {
    flex: 1,
  },
  receiptTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptSourceLabel: {
    fontSize: ms(10),
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  receiptIdTag: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.secondary,
  },
  receiptName: {
    fontSize: ms(15),
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: rs(2),
  },
  viewSlipLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    marginTop: rs(4),
  },
  viewSlipLinkText: {
    fontSize: ms(12),
    fontWeight: '600',
    color: colors.primary,
  },
  expandedSlipBox: {
    marginTop: rs(12),
    paddingTop: rs(12),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
    padding: rs(12),
  },
  slipHeader: {
    fontSize: ms(12),
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  slipText: {
    fontSize: ms(12),
    color: colors.textSecondary,
    marginVertical: rs(2),
  },
  slipDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: rs(6),
  },
  slipTotal: {
    fontSize: ms(13),
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'right',
  },
  fieldsSection: {
    gap: rs(10),
  },
  fieldsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldsSectionTitle: {
    fontSize: ms(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldsSectionHint: {
    fontSize: ms(11),
    color: colors.textSecondary,
  },
  fieldsList: {
    gap: rs(10),
  },
  twoColRow: {
    flexDirection: 'row',
    gap: rs(10),
  },
  colHalf: {
    flex: 1,
  },
  fieldCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: rs(14),
    paddingVertical: rs(10),
    ...shadows.sm,
  },
  fieldCardWarning: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.sm,
  },
  warningAccentStrip: {
    width: rs(4),
    backgroundColor: '#F59E0B',
  },
  warningCardContent: {
    flex: 1,
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
  },
  warningFieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(4),
  },
  cautionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: '#FEF3C7',
    paddingHorizontal: rs(8),
    paddingVertical: rs(2),
    borderRadius: radii.full,
  },
  cautionText: {
    fontSize: ms(10),
    fontWeight: '600',
    color: '#92400E',
  },
  fieldLabel: {
    fontSize: ms(11),
    color: colors.textSecondary,
    marginBottom: rs(2),
  },
  fieldInput: {
    fontSize: ms(15),
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: 0,
    minHeight: rs(26),
  },
  amountCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: rs(14),
    paddingVertical: rs(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  amountTextCol: {
    flex: 1,
  },
  amountInput: {
    fontSize: ms(18),
    fontWeight: '700',
    color: colors.primary,
    paddingVertical: 0,
    minHeight: rs(28),
  },
  amountIconCircle: {
    width: rs(36),
    height: rs(36),
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineItemsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(14),
    ...shadows.sm,
  },
  lineItemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(10),
  },
  lineItemsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  lineItemsTitle: {
    fontSize: ms(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lineItemsSub: {
    fontSize: ms(11),
    color: colors.textSecondary,
  },
  lineItemsList: {
    gap: rs(8),
  },
  lineItemRow: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineItemInfo: {
    flex: 1,
  },
  lineItemName: {
    fontSize: ms(13),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  lineItemDetails: {
    fontSize: ms(11),
    color: colors.textSecondary,
    marginTop: rs(1),
  },
  lineItemAmount: {
    fontSize: ms(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: rs(10),
    paddingTop: rs(10),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subtotalLabel: {
    fontSize: ms(13),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subtotalAmount: {
    fontSize: ms(16),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bottomActionPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(247, 249, 251, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: rs(10),
    paddingBottom: rs(20),
  },
  safetyFooterText: {
    fontSize: ms(11),
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: rs(4),
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(20),
  },
  successCard: {
    width: '100%',
    maxWidth: rs(340),
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    padding: rs(24),
    alignItems: 'center',
    ...shadows.lg,
  },
  successIconCircle: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(28),
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rs(12),
  },
  successTitle: {
    fontSize: ms(18),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  successSubtitle: {
    fontSize: ms(13),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: rs(4),
    marginBottom: rs(20),
  },
  successBtnStack: {
    width: '100%',
    gap: rs(8),
  },
  addItemSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  addItemSmallText: {
    fontSize: ms(12),
    fontWeight: '600',
    color: colors.primary,
  },
  lineItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(20),
  },
  itemEditCard: {
    width: '100%',
    maxWidth: rs(340),
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    padding: rs(20),
    ...shadows.lg,
  },
  itemEditTitle: {
    fontSize: ms(17),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rs(16),
  },
  inputGroup: {
    marginBottom: rs(12),
  },
  inputGroupLabel: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: rs(4),
  },
  modalInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    fontSize: ms(14),
    color: colors.textPrimary,
  },
  modalTwoCol: {
    flexDirection: 'row',
    gap: rs(10),
  },
  itemEditBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: rs(12),
  },
  deleteItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingVertical: rs(6),
    paddingHorizontal: rs(8),
  },
  deleteItemBtnText: {
    fontSize: ms(13),
    color: colors.error,
    fontWeight: '600',
  },
  itemEditRightBtns: {
    flexDirection: 'row',
    gap: rs(8),
    marginLeft: 'auto',
  },
  itemEditCancelBtn: {
    paddingVertical: rs(8),
    paddingHorizontal: rs(14),
    borderRadius: radii.sm,
  },
  itemEditCancelText: {
    fontSize: ms(13),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  itemEditSaveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: rs(8),
    paddingHorizontal: rs(16),
    borderRadius: radii.sm,
  },
  itemEditSaveText: {
    fontSize: ms(13),
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBackdropBottom: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    padding: rs(20),
    paddingBottom: rs(34),
    ...shadows.lg,
  },
  menuTitle: {
    fontSize: ms(17),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rs(6),
  },
  menuSubtitle: {
    fontSize: ms(13),
    color: colors.textSecondary,
    marginBottom: rs(16),
    lineHeight: ms(18),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    paddingVertical: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemDestructive: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: ms(14),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    marginTop: rs(16),
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: rs(12),
    borderRadius: radii.card,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: ms(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
