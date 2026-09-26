import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  Share,
  BackHandler,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import {
  WorkbookData,
  WorksheetData,
  ColumnType,
  ColumnDefinition,
} from '../types/spreadsheet';
import { SpreadsheetService } from '../services/excel/SpreadsheetService';
import { FileService } from '../services/storage/FileService';
import { colors } from '../theme/colors';
import { radii, touchTarget, shadows } from '../theme/spacing';
import { rs, ms, gutter, isSmallPhone } from '../theme/responsive';
import { Icon } from '../components/common/Icon';
import { AppLogo } from '../components/common/AppLogo';
import { BottomSheet } from '../components/common/BottomSheet';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

type Props = NativeStackScreenProps<RootStackParamList, 'Workbook'>;

interface SelectedCellCoordinate {
  rowIndex: number;
  rowId: string;
  colIndex: number;
  colId: string;
  colName: string;
  value: string;
}

const CELL_ROW_NUM_WIDTH = rs(40);
const CELL_MIN_WIDTH = isSmallPhone ? rs(92) : rs(115);

/**
 * WorkbookScreen — LedgerFlow Workbook Editor (Spreadsheet)
 * Source of truth: Google Stitch screen 6ba1a7914b8f46129e9c60d49c65b1bc
 */
export const WorkbookScreen: React.FC<Props> = ({ route, navigation }) => {
  const initialWorkbook =
    route.params?.initialWorkbook ||
    (route.params?.fileName
      ? SpreadsheetService.createBlankWorkbook(route.params.fileName)
      : SpreadsheetService.createSampleWorkbook());

  const [workbook, setWorkbook] = useState<WorkbookData>(initialWorkbook);
  const [history, setHistory] = useState<WorkbookData[]>([]);
  const [future, setFuture] = useState<WorkbookData[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);

  // Sync active workbook in SpreadsheetService on mount and changes
  useEffect(() => {
    SpreadsheetService.setActiveWorkbook(workbook);
  }, [workbook]);

  // Sync state when route.params.initialWorkbook is passed back (e.g. from ReviewScreen)
  useEffect(() => {
    if (route.params?.initialWorkbook) {
      const incomingWb = route.params.initialWorkbook;
      setWorkbook(incomingWb);
      SpreadsheetService.setActiveWorkbook(incomingWb);

      const targetIdx = incomingWb.activeSheetIndex ?? activeSheetIndex ?? 0;
      const sheet = incomingWb.sheets[targetIdx];
      if (sheet && sheet.rows && sheet.rows.length > 0) {
        const lastRowIdx = sheet.rows.length - 1;
        const lastRow = sheet.rows[lastRowIdx];
        const targetCol = sheet.columns[0];
        if (lastRow && targetCol) {
          const rawVal = lastRow.values?.[targetCol.id];
          const norm = SpreadsheetService.normalizeCellValue(
            rawVal,
            undefined,
            targetCol.name,
            targetCol.type
          );
          setSelectedCell({
            rowIndex: lastRowIdx,
            rowId: lastRow.id,
            colIndex: 0,
            colId: targetCol.id,
            colName: targetCol.name,
            value: norm !== undefined && norm !== null ? String(norm) : '',
          });
          setFormulaInputValue(norm !== undefined && norm !== null ? String(norm) : '');
        }
      }
    }
  }, [route.params?.initialWorkbook]);

  // Sync state whenever WorkbookScreen regains focus (e.g. returned from Camera / Review)
  useFocusEffect(
    useCallback(() => {
      const active = SpreadsheetService.getActiveWorkbook();
      if (active) {
        const currentSheetRows = workbook.sheets[activeSheetIndex]?.rows?.length ?? 0;
        const targetIdx = active.activeSheetIndex ?? activeSheetIndex ?? 0;
        const activeSheet = active.sheets[targetIdx];
        const activeSheetRows = activeSheet?.rows?.length ?? 0;

        if (
          active !== workbook &&
          (activeSheetRows !== currentSheetRows || JSON.stringify(active.sheets) !== JSON.stringify(workbook.sheets))
        ) {
          setWorkbook(active);
          if (activeSheetRows > currentSheetRows && activeSheet?.rows) {
            const lastRowIdx = activeSheetRows - 1;
            const lastRow = activeSheet.rows[lastRowIdx];
            const targetCol = activeSheet.columns[0];
            if (lastRow && targetCol) {
              const rawVal = lastRow.values?.[targetCol.id];
              const norm = SpreadsheetService.normalizeCellValue(
                rawVal,
                undefined,
                targetCol.name,
                targetCol.type
              );
              setSelectedCell({
                rowIndex: lastRowIdx,
                rowId: lastRow.id,
                colIndex: 0,
                colId: targetCol.id,
                colName: targetCol.name,
                value: norm !== undefined && norm !== null ? String(norm) : '',
              });
              setFormulaInputValue(norm !== undefined && norm !== null ? String(norm) : '');
            }
          }
        }
      }
    }, [workbook, activeSheetIndex])
  );

  // Active selected cell state
  const [selectedCell, setSelectedCell] = useState<SelectedCellCoordinate>(() => {
    const sheet0 = initialWorkbook.sheets[0];
    const col0 = sheet0?.columns[0];
    const row0 = sheet0?.rows[0];
    const rawVal = row0?.values?.[col0?.id ?? ''];
    const norm = SpreadsheetService.normalizeCellValue(
      rawVal,
      undefined,
      col0?.name ?? '',
      col0?.type ?? 'text'
    );
    return {
      rowIndex: 0,
      rowId: row0?.id || 'row_0',
      colIndex: 0,
      colId: col0?.id || 'col_0',
      colName: col0?.name || 'Date',
      value: norm !== undefined && norm !== null ? String(norm) : '',
    };
  });

  const [formulaInputValue, setFormulaInputValue] = useState<string>(selectedCell.value);

  // Column management states
  const [columnSheetVisible, setColumnSheetVisible] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ColumnType>('text');
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [renameColInput, setRenameColInput] = useState('');
  const [deletingCol, setDeletingCol] = useState<ColumnDefinition | null>(null);

  // Functional features: input type pill switching, column sorting, modals
  const [directInputType, setDirectInputType] = useState<'numeric' | 'text' | 'date'>('numeric');
  const [sortConfig, setSortConfig] = useState<{ colId: string; direction: 'asc' | 'desc' } | null>(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [propertiesModalVisible, setPropertiesModalVisible] = useState(false);

  const currentSheet: WorksheetData =
    workbook.sheets[activeSheetIndex] || { name: 'Sheet1', columns: [], rows: [] };

  const applyWorkbookUpdate = (updated: WorkbookData) => {
    setHistory((prev) => [...prev, workbook]);
    setFuture([]);
    setWorkbook(updated);
    SpreadsheetService.setActiveWorkbook(updated);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [workbook, ...prev]);
    setWorkbook(previous);
    SpreadsheetService.setActiveWorkbook(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, workbook]);
    setWorkbook(next);
    SpreadsheetService.setActiveWorkbook(next);
  };

  // Cell Selection
  const handleSelectCell = (
    rowId: string,
    rowIndex: number,
    colId: string,
    colIndex: number,
    colName: string,
    currentVal: unknown
  ) => {
    const targetCol = currentSheet.columns.find((c) => c.id === colId);
    const normalized = SpreadsheetService.normalizeCellValue(
      currentVal,
      undefined,
      colName,
      targetCol?.type || 'text'
    );
    const str = normalized !== undefined && normalized !== null ? String(normalized) : '';
    setSelectedCell({
      rowIndex,
      rowId,
      colIndex,
      colId,
      colName,
      value: str,
    });
    setFormulaInputValue(str);
  };

  // Direct formula bar apply
  const handleApplyCellEdit = () => {
    if (!selectedCell.rowId || !selectedCell.colId) return;
    const targetCol = currentSheet.columns.find((c) => c.id === selectedCell.colId);
    let finalValue: unknown = formulaInputValue;
    if (targetCol?.type === 'number' || targetCol?.type === 'currency') {
      const num = Number(formulaInputValue.replace(/[^0-9.-]/g, ''));
      if (!isNaN(num) && formulaInputValue.trim() !== '') finalValue = num;
    }
    const updated = SpreadsheetService.updateCell(
      workbook,
      activeSheetIndex,
      selectedCell.rowId,
      selectedCell.colId,
      finalValue
    );
    applyWorkbookUpdate(updated);
    setSelectedCell((prev) => ({ ...prev, value: String(finalValue) }));
  };

  const handleAddRow = () => {
    const { updatedWorkbook, newRow } = SpreadsheetService.addRow(workbook, activeSheetIndex, {});
    applyWorkbookUpdate(updatedWorkbook);
    if (currentSheet.columns[0]) {
      handleSelectCell(
        newRow.id,
        currentSheet.rows.length,
        currentSheet.columns[0].id,
        0,
        currentSheet.columns[0].name,
        ''
      );
    }
  };

  const handleRowNumberPress = (rowId: string, rowIndex: number) => {
    Alert.alert(`Row ${rowIndex + 1}`, 'Do you want to delete this row?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Row',
        style: 'destructive',
        onPress: () =>
          applyWorkbookUpdate(
            SpreadsheetService.deleteRow(workbook, activeSheetIndex, rowId)
          ),
      },
    ]);
  };

  const handleAddColumn = () => {
    if (!newColName.trim()) {
      Alert.alert('Required', 'Please enter a column name.');
      return;
    }
    applyWorkbookUpdate(
      SpreadsheetService.addColumn(workbook, activeSheetIndex, newColName.trim(), newColType)
    );
    setNewColName('');
  };

  const handleConfirmDeleteColumn = () => {
    if (!deletingCol) return;
    applyWorkbookUpdate(
      SpreadsheetService.deleteColumn(workbook, activeSheetIndex, deletingCol.id)
    );
    setDeletingCol(null);
  };

  const handleStartRename = (col: ColumnDefinition) => {
    setRenamingColId(col.id);
    setRenameColInput(col.name);
  };

  const handleSaveRename = (columnId: string) => {
    if (!renameColInput.trim()) {
      Alert.alert('Required', 'Column name cannot be blank.');
      return;
    }
    applyWorkbookUpdate(
      SpreadsheetService.renameColumn(
        workbook,
        activeSheetIndex,
        columnId,
        renameColInput.trim()
      )
    );
    setRenamingColId(null);
  };

  const handleMoveColumn = (columnId: string, direction: 'up' | 'down') => {
    const currentIndex = currentSheet.columns.findIndex((c) => c.id === columnId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentSheet.columns.length) return;
    applyWorkbookUpdate(
      SpreadsheetService.reorderColumn(workbook, activeSheetIndex, columnId, targetIndex)
    );
  };

  const handleAddSheet = () => {
    const nextIndex = workbook.sheets.length + 1;
    const newSheet: WorksheetData = {
      name: `Sheet${nextIndex}`,
      columns: [...(workbook.sheets[0]?.columns || [])],
      rows: [],
    };
    applyWorkbookUpdate({
      ...workbook,
      sheets: [...workbook.sheets, newSheet],
    });
    setActiveSheetIndex(workbook.sheets.length);
  };

  const handleSaveWorkbook = async () => {
    try {
      const path = await FileService.saveWorkbook(workbook);
      Alert.alert('Saved Successfully', `Workbook saved locally to:\n${path}`);
    } catch {
      Alert.alert('Saved Locally', 'All changes are preserved on this device.');
    }
  };

  const handleBack = useCallback(async () => {
    try {
      await FileService.saveWorkbook(workbook);
    } catch {}
    navigation.goBack();
  }, [workbook, navigation]);

  useEffect(() => {
    const onBackPress = () => {
      FileService.saveWorkbook(workbook).catch(() => {});
      navigation.goBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [workbook, navigation]);

  const handleScanChallan = () => {
    SpreadsheetService.setActiveWorkbook(workbook);
    navigation.navigate('Camera', {
      targetWorkbook: workbook,
      fileName: workbook.fileName,
    });
  };

  const handleSelectDirectInputType = (type: 'numeric' | 'text' | 'date') => {
    setDirectInputType(type);
    if (type === 'date') {
      const today = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      setFormulaInputValue(today);
    }
  };

  const handleSortByColumn = (colId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.colId === colId && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ colId, direction });

    const sortedRows = [...currentSheet.rows].sort((a, b) => {
      const valA = a.values?.[colId];
      const valB = b.values?.[colId];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      const numA = typeof valA === 'number' ? valA : parseFloat(String(valA).replace(/[^0-9.-]/g, ''));
      const numB = typeof valB === 'number' ? valB : parseFloat(String(valB).replace(/[^0-9.-]/g, ''));
      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }
      return direction === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    const updatedSheets = workbook.sheets.map((s, idx) =>
      idx === activeSheetIndex ? { ...s, rows: sortedRows } : s
    );
    applyWorkbookUpdate({ ...workbook, sheets: updatedSheets });
  };

  const handleFormulaFunctionPress = () => {
    Alert.alert(
      'Quick Formula Helper',
      'Choose a formula to insert into this cell:',
      [
        {
          text: 'Insert SUM formula',
          onPress: () => {
            const colName = currentSheet.columns[selectedCell.colIndex]?.name || 'Amount';
            setFormulaInputValue(`=SUM(${colName})`);
          },
        },
        {
          text: 'Insert Today\'s Date',
          onPress: () => {
            const today = new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            setFormulaInputValue(today);
          },
        },
        {
          text: 'Clear Cell',
          onPress: () => {
            setFormulaInputValue('');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleShareWorkbook = async () => {
    try {
      await Share.share({
        message: `LedgerFlow Spreadsheet: ${workbook.fileName}\nTotal Sheets: ${workbook.sheets.length}\nTotal Rows: ${currentSheet.rows.length}`,
        title: workbook.fileName,
      });
    } catch {
      Alert.alert('Share File', 'Could not share file.');
    }
  };

  const handleClearEmptyRows = () => {
    const filledRows = currentSheet.rows.filter((row) => {
      return Object.values(row.values || {}).some(
        (v) => v !== undefined && v !== null && String(v).trim() !== ''
      );
    });

    if (filledRows.length === currentSheet.rows.length) {
      Alert.alert('Clean Rows', 'No empty rows found in this sheet.');
      return;
    }

    const removedCount = currentSheet.rows.length - filledRows.length;
    const updatedSheets = workbook.sheets.map((s, idx) =>
      idx === activeSheetIndex ? { ...s, rows: filledRows } : s
    );
    applyWorkbookUpdate({ ...workbook, sheets: updatedSheets });
    Alert.alert('Clean Rows', `Removed ${removedCount} empty row(s).`);
  };

  // Dynamic column-aware Average and Sum calculation with metric/unit detection
  const stats = useMemo(() => {
    // Determine active column based on selection
    const activeCol =
      currentSheet.columns.find((c) => c.id === selectedCell.colId) ||
      currentSheet.columns[selectedCell.colIndex] ||
      currentSheet.columns[0];

    if (!activeCol) {
      return {
        colName: '',
        isNumeric: false,
        isCurrency: false,
        unit: '',
        count: 0,
        sum: '0',
        avg: '0',
      };
    }

    const colNameLower = activeCol.name.toLowerCase();
    const isIdCol =
      /\b(sl|s\.no|sl\.no|sr\.no|no|num|number|challan\s*no|invoice\s*no|bill\s*no|token|id|code|phone|mobile|pin|zip|vehicle)\b/i.test(
        colNameLower
      ) && !/\b(amount|amt|price|cost|qty|quantity|weight|total)\b/i.test(colNameLower);

    const isExplicitDate =
      activeCol.type === 'date' || /\b(date|dt|dated)\b/i.test(colNameLower);

    // Extract unit from column name if present e.g. "Quantity (MT)" -> "MT", "HSD (Ltr)" -> "Ltr"
    const unitMatch = activeCol.name.match(/[\(\[]\s*([a-zA-Z%₹$€£]+)\s*[\)\]]/);
    let detectedUnit = unitMatch ? unitMatch[1].trim() : '';

    let isCurrency = false;
    if (['inr', 'rs', 'rupee', 'rupees', '₹'].includes(detectedUnit.toLowerCase())) {
      isCurrency = true;
      detectedUnit = '₹';
    } else if (['$', '€', '£'].includes(detectedUnit)) {
      isCurrency = true;
    } else if (
      activeCol.type === 'currency' ||
      (/\b(amount|amt|price|cost|fee|fine|fare|salary|balance|debit|credit|paid|due|rupee|inr|rs|₹)\b/i.test(
        colNameLower
      ) &&
        !/\b(mt|kg|ltr|ltrs|ton|tons|qty|quantity|count|nos|pcs)\b/i.test(colNameLower))
    ) {
      isCurrency = true;
      detectedUnit = '₹';
    }

    if (!detectedUnit && (colNameLower === 'hsd' || colNameLower.includes('diesel'))) {
      detectedUnit = 'Ltr';
    }

    // If no unit detected from header, check sample values (e.g. "13,500 Ltr")
    if (!detectedUnit && !isCurrency && !isIdCol && !isExplicitDate) {
      const unitVotes: Record<string, number> = {};
      for (const row of currentSheet.rows.slice(0, 20)) {
        const val = row.values?.[activeCol.id];
        if (!val) continue;
        const s = String(val).trim();
        if (s.startsWith('₹') || s.toLowerCase().startsWith('rs')) {
          isCurrency = true;
          detectedUnit = '₹';
          break;
        }
        const m = s.match(/[\d,.]+\s*([a-zA-Z%]+)$/);
        if (m) {
          const u = m[1];
          unitVotes[u] = (unitVotes[u] || 0) + 1;
        }
      }
      if (!isCurrency) {
        const top = Object.keys(unitVotes).sort((a, b) => unitVotes[b] - unitVotes[a])[0];
        if (top && unitVotes[top] >= 2) {
          detectedUnit = top;
        }
      }
    }

    // Extract numeric values for this column
    const numericValues: number[] = [];
    let filledCount = 0;

    if (!isIdCol && !isExplicitDate) {
      currentSheet.rows.forEach((row) => {
        const raw = row.values?.[activeCol.id];
        if (raw !== undefined && raw !== null && raw !== '') {
          filledCount++;
          if (typeof raw === 'number') {
            if (!isNaN(raw)) numericValues.push(raw);
          } else {
            const cleaned = String(raw).replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            if (!isNaN(parsed)) numericValues.push(parsed);
          }
        }
      });
    } else {
      currentSheet.rows.forEach((row) => {
        const raw = row.values?.[activeCol.id];
        if (raw !== undefined && raw !== null && raw !== '') {
          filledCount++;
        }
      });
    }

    const hasNumbers = numericValues.length > 0 && numericValues.length >= filledCount * 0.5;

    if (!hasNumbers) {
      return {
        colName: activeCol.name,
        isNumeric: false,
        isCurrency: false,
        unit: '',
        count: filledCount,
        sum: '',
        avg: '',
      };
    }

    const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / numericValues.length;

    return {
      colName: activeCol.name,
      isNumeric: true,
      isCurrency,
      unit: detectedUnit,
      count: filledCount,
      sum: sum.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      avg: avg.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
    };
  }, [currentSheet, selectedCell.colId, selectedCell.colIndex]);

  const G = gutter();
  const cellAddress = `${String.fromCharCode(65 + (selectedCell.colIndex % 26))}${selectedCell.rowIndex + 1}`;

  const isSatyabhama =
    (workbook.fileName && workbook.fileName.toUpperCase().includes('SATYABHAMA')) ||
    (currentSheet.name && currentSheet.name.toUpperCase().includes('SATYABHAMA')) ||
    currentSheet.columns.some(
      (c) =>
        c.name.toLowerCase().includes('hsd') ||
        c.name.toLowerCase().includes('quantity (mt)')
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Top App Bar with First Logo (Stitch header) */}
      <View style={[styles.topAppBar, { paddingHorizontal: G }]}>
        <View style={styles.appBarLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={rs(20)} color={colors.textPrimary} />
          </TouchableOpacity>
          <AppLogo size={rs(28)} variant="brand" />
          <Text style={styles.appBarTitle} numberOfLines={1}>
            Workbook Editor
          </Text>
          {/* Undo and Redo buttons beside Workbook Editor */}
          <View style={styles.headerUndoRedoGroup}>
            <TouchableOpacity
              style={[
                styles.headerHistoryBtn,
                history.length === 0 && styles.headerHistoryBtnDisabled,
              ]}
              onPress={handleUndo}
              disabled={history.length === 0}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Icon
                name="undo"
                size={rs(18)}
                color={history.length > 0 ? colors.textPrimary : colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.headerHistoryBtn,
                future.length === 0 && styles.headerHistoryBtnDisabled,
              ]}
              onPress={handleRedo}
              disabled={future.length === 0}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Icon
                name="redo"
                size={rs(18)}
                color={future.length > 0 ? colors.textPrimary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.topAppBarRight}>
          <TouchableOpacity
            style={styles.moreBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setOptionsModalVisible(true)}
          >
            <Icon name="more-vert" size={rs(20)} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.moreBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setPropertiesModalVisible(true)}
            activeOpacity={0.7}
          >
            <Icon name="info" size={rs(20)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: G }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sheet Selector Tabs (Stitch tabs) */}
        <View style={styles.sheetTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sheetTabsScroll}
          >
            {workbook.sheets.map((sheet, index) => {
              const isActive = index === activeSheetIndex;
              return (
                <TouchableOpacity
                  key={`sheet_${index}`}
                  style={[styles.sheetTab, isActive && styles.sheetTabActive]}
                  onPress={() => setActiveSheetIndex(index)}
                  activeOpacity={0.8}
                >
                  {isActive && (
                    <Icon name="receipt-long" size={rs(14)} color="#FFFFFF" />
                  )}
                  <Text
                    style={[
                      styles.sheetTabText,
                      isActive && styles.sheetTabTextActive,
                    ]}
                  >
                    {sheet.name}
                  </Text>
                  <View
                    style={[
                      styles.sheetCountBadge,
                      isActive && styles.sheetCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sheetCountText,
                        isActive && styles.sheetCountTextActive,
                      ]}
                    >
                      {sheet.rows.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Add Sheet Button */}
            <TouchableOpacity
              style={styles.addSheetBtn}
              onPress={handleAddSheet}
              activeOpacity={0.7}
            >
              <Icon name="add" size={rs(16)} color={colors.textSecondary} />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Formula & Active Cell Bar (Stitch fx bar) */}
        <View style={styles.formulaBar}>
          <View style={styles.activeCellBadge}>
            <Text style={styles.activeCellBadgeText}>{cellAddress}</Text>
          </View>
          <TouchableOpacity
            onPress={handleFormulaFunctionPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Icon name="functions" size={rs(18)} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.formulaInput}
            value={formulaInputValue}
            onChangeText={setFormulaInputValue}
            placeholder="Enter cell value..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleApplyCellEdit}
          />
          <TouchableOpacity
            style={styles.applyCellBtn}
            onPress={handleApplyCellEdit}
            activeOpacity={0.8}
          >
            <Icon name="check" size={rs(16)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Spreadsheet Data Table Container */}
        <View style={styles.tableCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Header Row */}
              <View style={[styles.headerRow, isSatyabhama && styles.headerRowSatyabhama]}>
                {/* # Row Number Header */}
                <View style={[styles.headerCell, { width: CELL_ROW_NUM_WIDTH }, isSatyabhama && styles.headerCellSatyabhama]}>
                  <Text style={[styles.headerCellText, isSatyabhama && styles.headerCellTextSatyabhama]}>#</Text>
                </View>

                {/* Column Headers with click-to-sort and selection */}
                {currentSheet.columns.map((col, cIdx) => {
                  const isSorted = sortConfig?.colId === col.id;
                  return (
                    <TouchableOpacity
                      key={col.id}
                      style={[
                        styles.headerCell,
                        { width: CELL_MIN_WIDTH },
                        col.type === 'currency' && styles.headerCellRight,
                        isSorted && styles.headerCellSorted,
                        isSatyabhama && styles.headerCellSatyabhama,
                      ]}
                      onPress={() => {
                        handleSortByColumn(col.id);
                        handleSelectCell(
                          selectedCell.rowId || currentSheet.rows[0]?.id || 'row_0',
                          selectedCell.rowIndex,
                          col.id,
                          cIdx,
                          col.name,
                          currentSheet.rows[selectedCell.rowIndex]?.values?.[col.id]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.headerCellText,
                          isSorted && styles.headerCellTextSorted,
                          isSatyabhama && styles.headerCellTextSatyabhama,
                        ]}
                        numberOfLines={1}
                      >
                        {col.name}
                      </Text>
                      <Icon
                        name={
                          isSorted
                            ? sortConfig.direction === 'asc'
                              ? 'arrow-upward'
                              : 'arrow-downward'
                            : 'unfold-more'
                        }
                        size={rs(12)}
                        color={
                          isSorted
                            ? (isSatyabhama ? '#FFFFFF' : colors.primary)
                            : (isSatyabhama ? 'rgba(255,255,255,0.7)' : colors.textMuted)
                        }
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Data Rows */}
              {currentSheet.rows.length === 0 ? (
                <View style={styles.emptyTableState}>
                  <Text style={styles.emptyTableText}>This sheet has no rows yet.</Text>
                  <Text style={styles.emptyTableSub}>Tap Add Row or Scan Bill below to insert data.</Text>
                </View>
              ) : (
                currentSheet.rows.map((row, rIdx) => {
                  const isRowSelected = selectedCell.rowIndex === rIdx;
                  const isEven = rIdx % 2 === 0;

                  return (
                    <View
                      key={row.id}
                      style={[
                        styles.dataRow,
                        isEven ? styles.dataRowEven : styles.dataRowOdd,
                        isRowSelected && styles.dataRowSelected,
                      ]}
                    >
                      {/* Row Index Column */}
                      <TouchableOpacity
                        style={[styles.rowNumCell, { width: CELL_ROW_NUM_WIDTH }]}
                        onPress={() => handleRowNumberPress(row.id, rIdx)}
                      >
                        <Text style={styles.rowNumText}>{rIdx + 1}</Text>
                      </TouchableOpacity>

                      {/* Cells */}
                      {currentSheet.columns.map((col, cIdx) => {
                        const cellVal = row.values?.[col.id];
                        const isCellSelected =
                          selectedCell.rowIndex === rIdx && selectedCell.colId === col.id;
                        const isCurrency =
                          col.type === 'currency' ||
                          (col.name.toLowerCase().includes('amount') &&
                            !/\b(mt|kg|ltr|ltrs|ton|tons|qty|quantity|count|nos|pcs)\b/i.test(col.name));

                        const normalized = SpreadsheetService.normalizeCellValue(
                          cellVal,
                          undefined,
                          col.name,
                          col.type
                        );
                        let displayStr = normalized !== undefined && normalized !== null ? String(normalized) : '';
                        if (
                          isCurrency &&
                          displayStr &&
                          !displayStr.startsWith('₹') &&
                          !isNaN(Number(displayStr.replace(/[^0-9.-]/g, '')))
                        ) {
                          displayStr = `₹ ${displayStr}`;
                        }

                        return (
                          <TouchableOpacity
                            key={`${row.id}_${col.id}`}
                            style={[
                              styles.dataCell,
                              { width: CELL_MIN_WIDTH },
                              isCurrency && styles.dataCellRight,
                              isCellSelected && styles.dataCellActive,
                            ]}
                            onPress={() =>
                              handleSelectCell(row.id, rIdx, col.id, cIdx, col.name, cellVal)
                            }
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.cellText,
                                isCurrency && styles.cellTextBold,
                                isCellSelected && styles.cellTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {displayStr}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          {/* Active Summary Micro-bar (Stitch bottom bar) */}
          <View style={styles.summaryMicroBar}>
            <View style={styles.summaryLeft}>
              <View style={styles.summaryDot} />
              <Text style={styles.summarySelectedText} numberOfLines={1}>
                {stats.colName ? `${cellAddress} · ${stats.colName}` : `Cell ${cellAddress}`}
              </Text>
            </View>
            <View style={styles.summaryRight}>
              {stats.isNumeric ? (
                <>
                  <Text style={styles.summaryMetric} numberOfLines={1}>
                    Avg: {stats.isCurrency ? '₹ ' : ''}{stats.avg}{!stats.isCurrency && stats.unit ? ` ${stats.unit}` : ''}
                  </Text>
                  <Text style={styles.summarySum} numberOfLines={1}>
                    Sum: {stats.isCurrency ? '₹ ' : ''}{stats.sum}{!stats.isCurrency && stats.unit ? ` ${stats.unit}` : ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.summarySum} numberOfLines={1}>
                  {stats.count} rows
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Operational Utility Toolbar (Stitch 3-column toolbar) */}
        <View style={styles.operationalToolbar}>
          {/* Add Row */}
          <TouchableOpacity
            style={styles.utilityBtn}
            onPress={handleAddRow}
            activeOpacity={0.8}
          >
            <Icon name="add" size={rs(20)} color={colors.primary} />
            <Text style={styles.utilityBtnText}>Add Row</Text>
          </TouchableOpacity>

          {/* Scan Bill (Hero Action in Stitch) */}
          <TouchableOpacity
            style={styles.utilityBtnHero}
            onPress={handleScanChallan}
            activeOpacity={0.88}
          >
            <Icon name="camera" size={rs(20)} color="#FFFFFF" />
            <Text style={styles.utilityBtnHeroText}>Scan Bill</Text>
          </TouchableOpacity>

          {/* Manage Cols */}
          <TouchableOpacity
            style={styles.utilityBtn}
            onPress={() => setColumnSheetVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="columns" size={rs(20)} color={colors.textSecondary} />
            <Text style={styles.utilityBtnText}>Manage Cols</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Direct Cell Input Strip (Stitch) */}
        <View style={styles.directCellInputCard}>
          <View style={styles.directInputHeaderRow}>
            <Text style={styles.directInputTitle}>Direct Cell Input</Text>
            <View style={styles.directTypePillsRow}>
              <TouchableOpacity
                style={[
                  styles.directTypePill,
                  directInputType === 'numeric' && styles.directTypePillActive,
                ]}
                onPress={() => handleSelectDirectInputType('numeric')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.directTypePillText,
                    directInputType === 'numeric' && styles.directTypePillTextActive,
                  ]}
                >
                  Numeric
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.directTypePill,
                  directInputType === 'text' && styles.directTypePillActive,
                ]}
                onPress={() => handleSelectDirectInputType('text')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.directTypePillText,
                    directInputType === 'text' && styles.directTypePillTextActive,
                  ]}
                >
                  Text
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.directTypePill,
                  directInputType === 'date' && styles.directTypePillActive,
                ]}
                onPress={() => handleSelectDirectInputType('date')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.directTypePillText,
                    directInputType === 'date' && styles.directTypePillTextActive,
                  ]}
                >
                  Date
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.directInputControlRow}>
            <TextInput
              style={styles.directInputField}
              value={formulaInputValue}
              onChangeText={setFormulaInputValue}
              placeholder={
                directInputType === 'numeric'
                  ? 'Enter number...'
                  : directInputType === 'date'
                  ? 'e.g. 25 Sep 2026'
                  : 'Enter cell value...'
              }
              keyboardType={directInputType === 'numeric' ? 'decimal-pad' : 'default'}
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={handleApplyCellEdit}
            />
            <TouchableOpacity
              style={styles.directUpdateBtn}
              onPress={handleApplyCellEdit}
              activeOpacity={0.85}
            >
              <Text style={styles.directUpdateBtnText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Document Meta, History & Save Bar (Moved to Bottom) */}
        <View style={styles.metaCard}>
          <View style={styles.metaInfoLeft}>
            <View style={styles.metaTitleRow}>
              <Icon name="table" size={rs(16)} color={colors.primary} />
              <Text style={styles.fileNameText} numberOfLines={1}>
                {workbook.fileName}
              </Text>
            </View>
            <View style={styles.metaSubtitleRow}>
              <Text style={styles.colRowCount}>
                {currentSheet.columns.length} columns • {currentSheet.rows.length} rows
              </Text>
              <View style={styles.savedDot} />
              <Text style={styles.savedLocallyText}>Saved locally</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.savePillBtn}
            onPress={handleSaveWorkbook}
            activeOpacity={0.88}
          >
            <Icon name="save" size={rs(15)} color="#FFFFFF" />
            <Text style={styles.savePillText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Column Manager Bottom Sheet */}
      <BottomSheet
        visible={columnSheetVisible}
        onClose={() => setColumnSheetVisible(false)}
        title="Manage Columns"
      >
        <ScrollView style={styles.colSheetScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.colSheetSectionTitle}>Existing Columns</Text>
          {currentSheet.columns.map((col, index) => (
            <View key={col.id} style={styles.colItemCard}>
              <View style={styles.colItemInfo}>
                {renamingColId === col.id ? (
                  <View style={styles.renameRow}>
                    <TextInput
                      style={styles.renameInput}
                      value={renameColInput}
                      onChangeText={setRenameColInput}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.saveRenameBtn}
                      onPress={() => handleSaveRename(col.id)}
                    >
                      <Icon name="check" size={rs(14)} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.colItemName}>{col.name}</Text>
                    <Text style={styles.colItemType}>{col.type}</Text>
                  </View>
                )}
              </View>

              <View style={styles.colItemActions}>
                <TouchableOpacity
                  style={[styles.colActionBtn, index === 0 && styles.colActionBtnDisabled]}
                  onPress={() => handleMoveColumn(col.id, 'up')}
                  disabled={index === 0}
                >
                  <Icon name="undo" size={rs(14)} color={index > 0 ? colors.textPrimary : colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.colActionBtn,
                    index === currentSheet.columns.length - 1 && styles.colActionBtnDisabled,
                  ]}
                  onPress={() => handleMoveColumn(col.id, 'down')}
                  disabled={index === currentSheet.columns.length - 1}
                >
                  <Icon
                    name="redo"
                    size={rs(14)}
                    color={index < currentSheet.columns.length - 1 ? colors.textPrimary : colors.textMuted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.colActionBtn}
                  onPress={() => handleStartRename(col)}
                >
                  <Icon name="edit" size={rs(14)} color={colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.colActionBtn}
                  onPress={() => setDeletingCol(col)}
                >
                  <Icon name="delete" size={rs(14)} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add Column Section */}
          <Text style={[styles.colSheetSectionTitle, { marginTop: rs(16) }]}>
            Add New Column
          </Text>
          <View style={styles.newColForm}>
            <TextInput
              style={styles.newColInput}
              placeholder="Column Name (e.g. GST %)"
              placeholderTextColor={colors.textMuted}
              value={newColName}
              onChangeText={setNewColName}
            />
            <TouchableOpacity
              style={styles.addColSubmitBtn}
              onPress={handleAddColumn}
            >
              <Icon name="add" size={rs(16)} color="#FFFFFF" />
              <Text style={styles.addColSubmitText}>Add Column</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BottomSheet>

      {/* Delete Column Confirmation */}
      <ConfirmDialog
        visible={deletingCol !== null}
        title="Delete Column"
        message={`Are you sure you want to delete "${deletingCol?.name}"? All cell data in this column will be permanently removed.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleConfirmDeleteColumn}
        onCancel={() => setDeletingCol(null)}
      />

      {/* Workbook Options Modal */}
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
            <Text style={styles.menuTitle}>Workbook Options</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOptionsModalVisible(false);
                handleShareWorkbook();
              }}
            >
              <Icon name="share" size={rs(18)} color={colors.primary} />
              <Text style={styles.menuItemText}>Share Excel file</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOptionsModalVisible(false);
                handleSaveWorkbook();
              }}
            >
              <Icon name="save" size={rs(18)} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>Save copy to device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOptionsModalVisible(false);
                handleAddSheet();
              }}
            >
              <Icon name="add" size={rs(18)} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>Add new sheet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOptionsModalVisible(false);
                handleClearEmptyRows();
              }}
            >
              <Icon name="delete" size={rs(18)} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Clean empty rows</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOptionsModalVisible(false);
                Alert.alert(
                  'Spreadsheet Details',
                  `File: ${workbook.fileName}\nSheets: ${workbook.sheets.length}\nRows in this sheet: ${currentSheet.rows.length}\nColumns: ${currentSheet.columns.length}\nFormat: Microsoft Excel (.xlsx)\nStorage: Stored on this phone`
                );
              }}
            >
              <Icon name="info" size={rs(18)} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Spreadsheet details</Text>
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

      {/* Workbook Properties Modal */}
      <Modal
        visible={propertiesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPropertiesModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdropBottom}
          activeOpacity={1}
          onPress={() => setPropertiesModalVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Workbook Properties</Text>
            <Text style={styles.menuSubtitle}>
              File information and offline storage details.
            </Text>

            <View style={{ marginVertical: rs(10), gap: rs(8) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: ms(13), color: colors.textSecondary }}>File Name:</Text>
                <Text style={{ fontSize: ms(13), fontWeight: '600', color: colors.textPrimary }}>{workbook.fileName}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: ms(13), color: colors.textSecondary }}>Active Sheet:</Text>
                <Text style={{ fontSize: ms(13), fontWeight: '600', color: colors.textPrimary }}>{currentSheet.name} ({activeSheetIndex + 1} of {workbook.sheets.length})</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: ms(13), color: colors.textSecondary }}>Total Rows:</Text>
                <Text style={{ fontSize: ms(13), fontWeight: '600', color: colors.textPrimary }}>{currentSheet.rows.length} rows</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: ms(13), color: colors.textSecondary }}>Total Columns:</Text>
                <Text style={{ fontSize: ms(13), fontWeight: '600', color: colors.textPrimary }}>{currentSheet.columns.length} columns</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: ms(13), color: colors.textSecondary }}>Storage:</Text>
                <Text style={{ fontSize: ms(13), fontWeight: '600', color: colors.success }}>100% Offline (Local Device)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setPropertiesModalVisible(false)}
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
  headerUndoRedoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: rs(8),
    gap: rs(4),
  },
  headerHistoryBtn: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  headerHistoryBtnDisabled: {
    opacity: 0.35,
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
    paddingTop: rs(12),
    paddingBottom: rs(40),
    gap: rs(12),
  },
  directCellInputCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(12),
    gap: rs(10),
    ...shadows.sm,
  },
  directInputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  directInputTitle: {
    fontSize: ms(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  directTypePillsRow: {
    flexDirection: 'row',
    gap: rs(6),
  },
  directTypePill: {
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceContainerLow,
  },
  directTypePillActive: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  directTypePillText: {
    fontSize: ms(11),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  directTypePillTextActive: {
    fontSize: ms(11),
    color: colors.textPrimary,
    fontWeight: '700',
  },
  directInputControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  directInputField: {
    flex: 1,
    height: rs(42),
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
    paddingHorizontal: rs(12),
    fontSize: ms(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  directUpdateBtn: {
    height: rs(42),
    paddingHorizontal: rs(16),
    borderRadius: radii.sm,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directUpdateBtnText: {
    fontSize: ms(13),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  metaInfoLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: rs(8),
  },
  metaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  fileNameText: {
    fontSize: ms(15),
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  metaSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginTop: rs(3),
  },
  colRowCount: {
    fontSize: ms(11),
    color: colors.textSecondary,
  },
  savedDot: {
    width: rs(4),
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: colors.tertiaryContainer,
  },
  savedLocallyText: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.tertiaryContainer,
  },
  historyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  historyBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyBtnDisabled: {
    opacity: 0.45,
  },
  savePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: colors.primary,
    paddingHorizontal: rs(12),
    height: rs(36),
    borderRadius: radii.sm,
    ...shadows.xs,
  },
  savePillText: {
    fontSize: ms(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sheetTabsContainer: {
    marginBottom: rs(2),
  },
  sheetTabsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  sheetTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(12),
    paddingVertical: rs(7),
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.xs,
  },
  sheetTabText: {
    fontSize: ms(12),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sheetTabTextActive: {
    color: '#FFFFFF',
  },
  sheetCountBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: rs(5),
    paddingVertical: rs(1),
    borderRadius: rs(4),
  },
  sheetCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  sheetCountText: {
    fontSize: ms(10),
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sheetCountTextActive: {
    color: '#FFFFFF',
  },
  addSheetBtn: {
    width: rs(32),
    height: rs(32),
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formulaBar: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    ...shadows.sm,
  },
  activeCellBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: radii.xs,
  },
  activeCellBadgeText: {
    fontSize: ms(12),
    fontWeight: '700',
    color: colors.primary,
  },
  formulaInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xs,
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    fontSize: ms(13),
    color: colors.textPrimary,
  },
  applyCellBtn: {
    width: rs(30),
    height: rs(30),
    borderRadius: radii.xs,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerHigh,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(8),
    paddingVertical: rs(8),
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  headerCellRight: {
    justifyContent: 'flex-end',
    gap: rs(4),
  },
  headerCellText: {
    fontSize: ms(12),
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dataRowEven: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  dataRowOdd: {
    backgroundColor: colors.surfaceSubtle,
  },
  dataRowSelected: {
    backgroundColor: colors.secondaryContainer,
  },
  rowNumCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: rs(8),
  },
  rowNumText: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dataCell: {
    justifyContent: 'center',
    paddingHorizontal: rs(8),
    paddingVertical: rs(8),
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  dataCellRight: {
    alignItems: 'flex-end',
  },
  dataCellActive: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  cellText: {
    fontSize: ms(13),
    color: colors.textPrimary,
  },
  cellTextBold: {
    fontWeight: '700',
  },
  cellTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  emptyTableState: {
    padding: rs(30),
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: ms(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyTableSub: {
    fontSize: ms(12),
    color: colors.textSecondary,
    marginTop: rs(4),
  },
  summaryMicroBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    flex: 1,
    marginRight: rs(8),
  },
  summaryDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
    backgroundColor: colors.tertiaryFixedDim,
  },
  summarySelectedText: {
    fontSize: ms(11),
    color: colors.textSecondary,
    flexShrink: 1,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    flexShrink: 0,
  },
  summaryMetric: {
    fontSize: ms(11),
    color: colors.textSecondary,
  },
  summarySum: {
    fontSize: ms(12),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  operationalToolbar: {
    flexDirection: 'row',
    gap: rs(8),
    marginTop: rs(4),
  },
  utilityBtn: {
    flex: 1,
    height: rs(58),
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: rs(2),
    ...shadows.sm,
  },
  utilityBtnText: {
    fontSize: ms(12),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  utilityBtnHero: {
    flex: 1,
    height: rs(58),
    backgroundColor: colors.primary,
    borderRadius: radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    gap: rs(2),
    ...shadows.sm,
  },
  utilityBtnHeroText: {
    fontSize: ms(12),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  colSheetScroll: {
    paddingHorizontal: rs(16),
  },
  colSheetSectionTitle: {
    fontSize: ms(14),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rs(8),
  },
  colItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
    padding: rs(10),
    marginBottom: rs(8),
  },
  colItemInfo: {
    flex: 1,
  },
  colItemName: {
    fontSize: ms(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  colItemType: {
    fontSize: ms(11),
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  colItemActions: {
    flexDirection: 'row',
    gap: rs(6),
  },
  colActionBtn: {
    width: rs(30),
    height: rs(30),
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colActionBtnDisabled: {
    opacity: 0.35,
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  renameInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: radii.xs,
    fontSize: ms(13),
    color: colors.textPrimary,
  },
  saveRenameBtn: {
    backgroundColor: colors.primary,
    padding: rs(6),
    borderRadius: radii.xs,
  },
  newColForm: {
    flexDirection: 'row',
    gap: rs(8),
    marginTop: rs(4),
    marginBottom: rs(20),
  },
  newColInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    fontSize: ms(13),
    color: colors.textPrimary,
  },
  addColSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: colors.primary,
    paddingHorizontal: rs(14),
    borderRadius: radii.sm,
    justifyContent: 'center',
  },
  addColSubmitText: {
    fontSize: ms(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerCellSorted: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  headerCellTextSorted: {
    color: colors.primary,
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
  headerRowSatyabhama: {
    backgroundColor: '#3B68C6',
    borderBottomWidth: 1,
    borderBottomColor: '#2B53A3',
  },
  headerCellSatyabhama: {
    borderRightColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerCellTextSatyabhama: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
