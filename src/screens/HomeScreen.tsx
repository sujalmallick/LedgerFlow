import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { DatabaseService, RecentFile } from '../services/storage/DatabaseService';
import { SpreadsheetService } from '../services/excel/SpreadsheetService';
import { WorkbookData } from '../types/spreadsheet';
import { FileService } from '../services/storage/FileService';
import { PermissionService } from '../services/permissions/PermissionService';
import { colors } from '../theme/colors';
import { spacing, radii, typography, touchTarget, shadows } from '../theme/spacing';
import { rs, ms, gutter, vgutter, isSmallPhone, wp } from '../theme/responsive';
import { Icon } from '../components/common/Icon';
import { AppLogo } from '../components/common/AppLogo';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

interface FileItem {
  id: string;
  fileName: string;
  filePath: string;
  lastOpened: string;
  lastOpenedTs: number;
  rowCount: number;
}

/**
 * HomeScreen — LedgerFlow Main Dashboard
 * Source of truth: Google Stitch screens 2c776cc5006b4394bccedffaf079e8be & b76915d82df84d15bb63ef46add1eb41
 */
function formatDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [selectedFileForMenu, setSelectedFileForMenu] = useState<FileItem | null>(null);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const firstMount = useRef(true);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      if (firstMount.current) {
        PermissionService.requestInitialPermissions();
        FileService.cleanStaleTempFiles().catch((e) =>
          console.warn('Temp clean error:', e)
        );
        firstMount.current = false;
      }
      DatabaseService.getRecentFiles().then(setRecentFiles);
    }, [])
  );

  const [templateModalVisible, setTemplateModalVisible] = useState(false);

  const handleCreateNew = () => {
    setTemplateModalVisible(true);
  };

  const handleSelectTemplate = (
    templateType: 'SATYABHAMA' | 'CHALLANS' | 'INVOICES' | 'BLANK'
  ) => {
    setTemplateModalVisible(false);
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();

    let wb: WorkbookData;
    if (templateType === 'SATYABHAMA') {
      const defaultName = `CHALLAN_SATYABHAMA_${month}_${year}.xlsx`;
      wb = SpreadsheetService.createSatyabhamaWorkbook(defaultName, 'CHALLAN_SATYABHAMA');
    } else if (templateType === 'INVOICES') {
      const defaultName = `Invoices_${month}_${year}.xlsx`;
      wb = SpreadsheetService.createInvoiceWorkbook(defaultName);
    } else if (templateType === 'CHALLANS') {
      const defaultName = `Challans_${month}_${year}.xlsx`;
      wb = SpreadsheetService.createBlankWorkbook(defaultName);
    } else {
      const defaultName = `Workbook_${month}_${year}.xlsx`;
      wb = SpreadsheetService.createBlankWorkbook(defaultName, 'Sheet1', [
        { id: 'col_a_0', name: 'A', type: 'text' },
        { id: 'col_b_1', name: 'B', type: 'text' },
        { id: 'col_c_2', name: 'C', type: 'text' },
      ]);
    }

    SpreadsheetService.setActiveWorkbook(wb);
    navigation.navigate('Workbook', {
      initialWorkbook: wb,
      fileName: wb.fileName,
    });
  };

  const handleOpenExisting = async () => {
    const hasStorage = await PermissionService.requestStoragePermission();
    if (!hasStorage) {
      PermissionService.showSettingsAlert('Storage');
      return;
    }

    try {
      setLoading(true);
      const parsedWb = await FileService.pickAndReadXlsx();
      setLoading(false);
      if (parsedWb) {
        await DatabaseService.addOrUpdateRecentFile({
          fileName: parsedWb.fileName,
          filePath: parsedWb.fileUri || '',
          lastOpenedTs: Date.now(),
          lastOpened: formatDate(new Date()),
          rowCount: parsedWb.sheets[0]?.rows?.length || 0,
        });
        const updatedFiles = await DatabaseService.getRecentFiles();
        setRecentFiles(updatedFiles);
        navigation.navigate('Workbook', {
          initialWorkbook: parsedWb,
          fileName: parsedWb.fileName,
        });
      }
    } catch {
      setLoading(false);
      Alert.alert(
        'Open File',
        'Could not load selected file. Please select a valid Excel (.xlsx) file.'
      );
    }
  };

  const handleOpenSample = () => {
    const sampleWb = SpreadsheetService.createSampleWorkbook();
    navigation.navigate('Workbook', {
      initialWorkbook: sampleWb,
      fileName: sampleWb.fileName,
    });
  };

  const handleScanBill = async () => {
    const hasCamera = await PermissionService.requestCameraPermission();
    if (!hasCamera) {
      PermissionService.showSettingsAlert('Camera');
      return;
    }
    const activeFileName = recentFiles[0]?.fileName;
    navigation.navigate('Camera', activeFileName ? { fileName: activeFileName } : undefined);
  };

  const handleOpenRecent = async (item: FileItem) => {
    const fallback = () => {
      const sampleWb = SpreadsheetService.createSampleWorkbook();
      navigation.navigate('Workbook', {
        initialWorkbook: { ...sampleWb, fileName: item.fileName },
        fileName: item.fileName,
      });
    };

    if (!item.filePath) {
      fallback();
      return;
    }

    try {
      setLoading(true);
      const RNFS = require('react-native-fs');
      const exists = await RNFS.exists(item.filePath);
      if (!exists) {
        setLoading(false);
        fallback();
        return;
      }

      const base64Content = await RNFS.readFile(item.filePath, 'base64');
      if (!base64Content) throw new Error('empty file');

      const parsedWb = SpreadsheetService.parseXlsx(base64Content, item.fileName, 'base64');
      parsedWb.fileUri = item.filePath;
      SpreadsheetService.setActiveWorkbook(parsedWb);

      setLoading(false);

      await DatabaseService.addOrUpdateRecentFile({
        ...item,
        lastOpenedTs: Date.now(),
        lastOpened: formatDate(new Date()),
        rowCount: parsedWb.sheets[0]?.rows?.length || 0,
      });
      const updatedFiles = await DatabaseService.getRecentFiles();
      setRecentFiles(updatedFiles);

      navigation.navigate('Workbook', {
        initialWorkbook: parsedWb,
        fileName: parsedWb.fileName,
      });
    } catch {
      setLoading(false);
      fallback();
    }
  };

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [autoCropSetting, setAutoCropSetting] = useState(true);
  const [soundSetting, setSoundSetting] = useState(false);
  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const handleShareFile = async (item: FileItem) => {
    try {
      await Share.share({
        message: `LedgerFlow Spreadsheet: ${item.fileName} (${item.rowCount} rows)`,
        title: item.fileName,
      });
    } catch {
      Alert.alert('Share File', 'Could not share file.');
    }
  };

  const handleStartRename = (item: FileItem) => {
    setRenamingFile(item);
    setRenameInput(item.fileName.replace(/\.xlsx$/i, ''));
  };

  const handleSaveRename = async () => {
    if (!renamingFile || !renameInput.trim()) return;
    const clean = renameInput.trim().replace(/[\\/:*?"<>|]/g, '_');
    const newName = clean.endsWith('.xlsx') ? clean : `${clean}.xlsx`;

    let updatedPath = renamingFile.filePath;
    if (renamingFile.filePath) {
      try {
        const RNFS = require('react-native-fs');
        const oldPath = renamingFile.filePath;
        const lastSlash = oldPath.lastIndexOf('/');
        if (lastSlash >= 0) {
          const dir = oldPath.substring(0, lastSlash);
          const newPath = `${dir}/${newName}`;
          if (await RNFS.exists(oldPath)) {
            await RNFS.moveFile(oldPath, newPath);
            updatedPath = newPath;
          }
        }
      } catch (fsErr) {
        console.warn('Rename file on disk error:', fsErr);
      }
    }

    await DatabaseService.renameRecentFile(renamingFile.id, newName, updatedPath);

    setRecentFiles((prev) =>
      prev.map((f) => (f.id === renamingFile.id ? { ...f, fileName: newName, filePath: updatedPath } : f))
    );
    setRenamingFile(null);
  };

  const handleClearAllRecent = () => {
    Alert.alert(
      'Clear Recent Files',
      'Remove all files from the recent list? Files will still remain on your phone storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear List',
          style: 'destructive',
          onPress: async () => {
            await DatabaseService.clearAllRecent();
            setRecentFiles([]);
            setOptionsModalVisible(false);
          },
        },
      ]
    );
  };

  const displayedFiles = recentFiles.filter((f) =>
    f.fileName.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleRemoveFile = async (id: string) => {
    await DatabaseService.removeRecentFile(id);
    setRecentFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const hPadding = gutter();
  const vPadding = vgutter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Top App Bar with First Geometric Logo (Stitch header) */}
      <View style={[styles.topAppBar, { paddingHorizontal: hPadding, paddingTop: insets.top, height: 56 + insets.top }]}>
        <View style={styles.brandRow}>
          <AppLogo size={rs(34)} variant="brand" />
          <View style={styles.brandTextCol}>
            <Text style={styles.brandSubtitle}>LEDGERFLOW</Text>
            <Text style={styles.brandTitle}>Dashboard</Text>
          </View>
        </View>

        <View style={styles.topAppBarRight}>
          <TouchableOpacity
            style={styles.appBarIconBtn}
            onPress={() => setSearchActive((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Icon name="search" size={rs(20)} color={searchActive ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userAvatarCircle}
            onPress={() => navigation.navigate('HowToUse')}
            activeOpacity={0.75}
          >
            <Icon name="person" size={rs(16)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Interactive Search Bar Strip */}
      {searchActive && (
        <View style={[styles.searchBarRow, { marginHorizontal: hPadding }]}>
          <Icon name="search" size={rs(16)} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search files by name..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={rs(16)} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setSearchActive(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: hPadding, paddingTop: vPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Status & Mode Row */}
        <View style={styles.statusRow}>
          <View style={styles.offlineStatusChip}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.offlineStatusText}>Offline • On-device</Text>
          </View>
          <TouchableOpacity
            style={styles.optionsBtn}
            onPress={() => setOptionsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Icon name="more-vert" size={rs(20)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Top Greeting & Tagline */}
        <View style={styles.greetingSection}>
          <Text style={styles.mainTitle}>LedgerFlow</Text>
          <Text style={styles.mainSubtitle}>Turn paper into organized data.</Text>
        </View>

        {/* Primary Action Hero: Scan a Bill (Thumb-reachable Hero Target) */}
        <TouchableOpacity
          style={styles.heroScanCard}
          onPress={handleScanBill}
          activeOpacity={0.92}
        >
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>Scan a Bill</Text>
            <Text style={styles.heroSubtitle}>
              Capture a bill or challan and add it to Excel
            </Text>
          </View>
          <View style={styles.heroIconBox}>
            <Icon name="camera" size={rs(26)} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Secondary Actions: 2-Column Side-by-side Utilities */}
        <View style={styles.utilityGrid}>
          {/* Open Excel File */}
          <TouchableOpacity
            style={styles.utilityCard}
            onPress={handleOpenExisting}
            activeOpacity={0.85}
          >
            <View style={styles.utilityIconBox}>
              <Icon name="folder" size={rs(22)} color={colors.primary} />
            </View>
            <View style={styles.utilityTextCol}>
              <Text style={styles.utilityTitle}>Open Excel File</Text>
              <Text style={styles.utilitySubtitle} numberOfLines={1}>
                Browse device storage
              </Text>
            </View>
          </TouchableOpacity>

          {/* New Workbook */}
          <TouchableOpacity
            style={styles.utilityCard}
            onPress={handleCreateNew}
            activeOpacity={0.85}
          >
            <View style={styles.utilityIconBox}>
              <Icon name="add" size={rs(22)} color={colors.primary} />
            </View>
            <View style={styles.utilityTextCol}>
              <Text style={styles.utilityTitle}>New Workbook</Text>
              <Text style={styles.utilitySubtitle} numberOfLines={1}>
                Start with blank sheet
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Discreet Try Sample File Row */}
        <TouchableOpacity
          style={styles.sampleFileRow}
          onPress={handleOpenSample}
          activeOpacity={0.85}
        >
          <View style={styles.sampleLeft}>
            <Icon name="document" size={rs(18)} color={colors.secondary} />
            <Text style={styles.sampleLabel}>Try Sample File</Text>
          </View>
          <View style={styles.sampleRight}>
            <Text style={styles.sampleFileName}>Challan_Sample.xlsx</Text>
            <Icon name="arrow-forward" size={rs(14)} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Recent Files Section */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Files</Text>
            <Text style={styles.sectionSubtitle}>
              {searchQuery ? `${displayedFiles.length} match` : 'On this phone'}
            </Text>
          </View>

          {displayedFiles.length === 0 ? (
            searchQuery ? (
              <View style={styles.emptySearchContainer}>
                <Text style={styles.emptySearchText}>No files match "{searchQuery}"</Text>
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchBtnText}>Clear search</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Card style={styles.emptyCard} variant="outlined">
                <View style={styles.emptyIconBox}>
                  <Icon name="document" size={rs(26)} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No recent files</Text>
                <Text style={styles.emptySubtitle}>
                  Create a new sheet or open an Excel file to get started.
                </Text>
                <Button
                  label="New Workbook"
                  variant="primary"
                  icon="add"
                  onPress={handleCreateNew}
                  style={{ marginTop: rs(12), minWidth: wp(50) }}
                />
              </Card>
            )
          ) : (
            displayedFiles.map((item) => (
              <View key={item.id} style={styles.fileCard}>
                <TouchableOpacity
                  style={styles.fileCardClickable}
                  onPress={() => handleOpenRecent(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.fileIconBox}>
                    <Icon name="document" size={rs(20)} color={colors.primary} />
                  </View>
                  <View style={styles.fileInfoCol}>
                    <Text style={styles.fileNameText} numberOfLines={1}>
                      {item.fileName}
                    </Text>
                    <Text style={styles.fileMetaText}>
                      {item.lastOpened} · {item.rowCount} rows
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fileMenuBtn}
                  onPress={() => setSelectedFileForMenu(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="more-vert" size={rs(18)} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Offline Footer Reassurance */}
        <View style={styles.offlineFooterNotice}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.offlineFooterText}>
            Offline mode — Your files and scanned data stay on this device.
          </Text>
        </View>
      </ScrollView>

      {/* Loading Modal */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Opening spreadsheet...</Text>
          </View>
        </View>
      )}

      {/* File Context Menu Modal */}
      <Modal
        visible={selectedFileForMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedFileForMenu(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedFileForMenu(null)}
        >
          <View style={styles.menuSheet}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle} numberOfLines={1}>
                {selectedFileForMenu?.fileName}
              </Text>
              <Text style={styles.menuSubtitle}>
                {selectedFileForMenu?.lastOpened} · {selectedFileForMenu?.rowCount} rows
              </Text>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                const f = selectedFileForMenu;
                setSelectedFileForMenu(null);
                if (f) handleOpenRecent(f);
              }}
            >
              <Icon name="open-in-new" size={rs(18)} color={colors.primary} />
              <Text style={styles.menuItemText}>Open Sheet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                const f = selectedFileForMenu;
                setSelectedFileForMenu(null);
                if (f) handleShareFile(f);
              }}
            >
              <Icon name="share" size={rs(18)} color={colors.primary} />
              <Text style={styles.menuItemText}>Share File</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                const f = selectedFileForMenu;
                setSelectedFileForMenu(null);
                if (f) handleStartRename(f);
              }}
            >
              <Icon name="edit" size={rs(18)} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Rename File</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDestructive]}
              onPress={() => {
                const f = selectedFileForMenu;
                setSelectedFileForMenu(null);
                if (f) handleRemoveFile(f.id);
              }}
            >
              <Icon name="delete" size={rs(18)} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Remove from Recent
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Account & Storage Info Modal */}
      <Modal
        visible={accountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAccountModalVisible(false)}
        >
          <View style={styles.menuSheet}>
            <View style={styles.modalIconCenter}>
              <View style={styles.avatarLargeCircle}>
                <Icon name="person" size={rs(26)} color="#FFFFFF" />
              </View>
              <Text style={styles.modalSheetTitle}>Device & Storage</Text>
              <Text style={styles.modalSheetSub}>LedgerFlow is 100% offline</Text>
            </View>

            <View style={styles.infoRowBlock}>
              <View style={styles.infoRowItem}>
                <Icon name="check" size={rs(16)} color={colors.success} />
                <Text style={styles.infoRowText}>All files stay on your phone</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Icon name="lock" size={rs(16)} color={colors.primary} />
                <Text style={styles.infoRowText}>No accounts or internet needed</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Icon name="table" size={rs(16)} color={colors.secondary} />
                <Text style={styles.infoRowText}>{recentFiles.length} recent spreadsheets</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setAccountModalVisible(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Options Dropdown Modal */}
      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Dashboard Options</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOptionsModalVisible(false);
                Alert.alert(
                  'How to Scan Bills',
                  '1. Lay the paper bill flat under good light.\n2. Hold your phone steady within the green frame.\n3. Tap the round shutter button to capture.\n4. Check the extracted details and tap "Add to Excel Sheet".'
                );
              }}
            >
              <Icon name="info" size={rs(18)} color={colors.primary} />
              <Text style={styles.menuItemText}>Tips for scanning bills</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDestructive]}
              onPress={() => {
                setOptionsModalVisible(false);
                handleClearAllRecent();
              }}
            >
              <Icon name="delete" size={rs(18)} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Clear recent files list
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

      {/* Rename File Modal */}
      <Modal
        visible={renamingFile !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingFile(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.renameDialogCard}>
            <Text style={styles.renameDialogTitle}>Rename File</Text>
            <Text style={styles.renameDialogSub}>Enter a new name for this spreadsheet</Text>
            <TextInput
              style={styles.renameInput}
              value={renameInput}
              onChangeText={setRenameInput}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.renameBtnRow}>
              <TouchableOpacity
                style={styles.renameCancelBtn}
                onPress={() => setRenamingFile(null)}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.renameSaveBtn}
                onPress={handleSaveRename}
              >
                <Text style={styles.renameSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Template Selection Modal */}
      <Modal
        visible={templateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setTemplateModalVisible(false)}
        >
          <View style={styles.templateSheet}>
            <View style={styles.templateSheetHeader}>
              <View style={styles.templateSheetHandle} />
              <View style={styles.templateSheetTitleRow}>
                <View style={styles.templateIconCircle}>
                  <Icon name="table" size={rs(20)} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.templateSheetTitle}>Choose a Template</Text>
                  <Text style={styles.templateSheetSub}>
                    Select layout to create your new spreadsheet
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.templateCloseBtn}
                  onPress={() => setTemplateModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close" size={rs(18)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.templateListScroll} showsVerticalScrollIndicator={false}>
              {/* Featured: CHALLAN_SATYABHAMA */}
              <TouchableOpacity
                style={styles.featuredTemplateCard}
                onPress={() => handleSelectTemplate('SATYABHAMA')}
                activeOpacity={0.88}
              >
                <View style={styles.featuredBadgeRow}>
                  <View style={styles.mostUsedBadge}>
                    <Icon name="star" size={rs(11)} color="#FFFFFF" />
                    <Text style={styles.mostUsedBadgeText}>MOST USED</Text>
                  </View>
                  <Text style={styles.templateColCountText}>6 Columns · Mining & Transport</Text>
                </View>

                <Text style={styles.featuredTemplateTitle}>CHALLAN_SATYABHAMA</Text>
                <Text style={styles.featuredTemplateSub}>
                  Standard delivery challan register with diesel & weight tracking
                </Text>

                {/* Visual Header Preview matching user's image */}
                <View style={styles.satyabhamaPreviewContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.satyabhamaHeaderBar}>
                      <View style={styles.satyaCell}>
                        <Text style={styles.satyaCellText}>Date</Text>
                      </View>
                      <View style={styles.satyaCell}>
                        <Text style={styles.satyaCellText}>Sl. No.</Text>
                      </View>
                      <View style={styles.satyaCell}>
                        <Text style={styles.satyaCellText}>Challan No.</Text>
                      </View>
                      <View style={styles.satyaCell}>
                        <Text style={styles.satyaCellText}>Vehicle No.</Text>
                      </View>
                      <View style={styles.satyaCell}>
                        <Text style={styles.satyaCellText}>Quantity (MT)</Text>
                      </View>
                      <View style={[styles.satyaCell, { borderRightWidth: 0 }]}>
                        <Text style={styles.satyaCellText}>HSD</Text>
                      </View>
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.useTemplateActionRow}>
                  <Text style={styles.useTemplateActionText}>Create CHALLAN_SATYABHAMA</Text>
                  <Icon name="arrow-forward" size={rs(16)} color={colors.primary} />
                </View>
              </TouchableOpacity>

              {/* Template 2: Delivery Challan Register */}
              <TouchableOpacity
                style={styles.standardTemplateCard}
                onPress={() => handleSelectTemplate('CHALLANS')}
                activeOpacity={0.82}
              >
                <View style={styles.standardTemplateTop}>
                  <View style={styles.standardTemplateIconBox}>
                    <Icon name="receipt-long" size={rs(18)} color={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.standardTemplateTitle}>Delivery Challan Register</Text>
                    <Text style={styles.standardTemplateSub}>
                      Challan No · Date · Vehicle · Driver · Amount
                    </Text>
                  </View>
                </View>
                <View style={styles.pillsRow}>
                  {['Challan No', 'Date', 'Vehicle Number', 'Driver Name', 'Amount'].map((c, i) => (
                    <View key={i} style={styles.previewPill}>
                      <Text style={styles.previewPillText}>{c}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>

              {/* Template 3: Bill & Purchase Invoices */}
              <TouchableOpacity
                style={styles.standardTemplateCard}
                onPress={() => handleSelectTemplate('INVOICES')}
                activeOpacity={0.82}
              >
                <View style={styles.standardTemplateTop}>
                  <View style={styles.standardTemplateIconBox}>
                    <Icon name="document" size={rs(18)} color={colors.tertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.standardTemplateTitle}>Bill & Purchase Invoices</Text>
                    <Text style={styles.standardTemplateSub}>
                      Invoice No · Date · Vendor · GSTIN · Tax · Total
                    </Text>
                  </View>
                </View>
                <View style={styles.pillsRow}>
                  {['Invoice No', 'Date', 'Vendor Name', 'GSTIN', 'Tax Amount', 'Total Amount'].map((c, i) => (
                    <View key={i} style={styles.previewPill}>
                      <Text style={styles.previewPillText}>{c}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>

              {/* Template 4: Blank Spreadsheet */}
              <TouchableOpacity
                style={[styles.standardTemplateCard, { marginBottom: rs(16) }]}
                onPress={() => handleSelectTemplate('BLANK')}
                activeOpacity={0.82}
              >
                <View style={styles.standardTemplateTop}>
                  <View style={styles.standardTemplateIconBox}>
                    <Icon name="add" size={rs(18)} color={colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.standardTemplateTitle}>Blank Spreadsheet</Text>
                    <Text style={styles.standardTemplateSub}>
                      Start clean with default customizable columns
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSettingsModalVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Settings</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Offline Mode</Text>
                <Text style={styles.settingDesc}>All processing stays 100% on your device</Text>
              </View>
              <View style={styles.activeCheckPill}>
                <Icon name="check" size={rs(14)} color="#FFFFFF" />
                <Text style={styles.activeCheckText}>Always On</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setAutoCropSetting((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Auto-crop Camera</Text>
                <Text style={styles.settingDesc}>Automatically find document edges</Text>
              </View>
              <View style={[styles.togglePill, autoCropSetting ? styles.togglePillOn : styles.togglePillOff]}>
                <Text style={autoCropSetting ? styles.toggleTextOn : styles.toggleTextOff}>
                  {autoCropSetting ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setSoundSetting((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Sound on scan</Text>
                <Text style={styles.settingDesc}>Play audio chime when a bill is read</Text>
              </View>
              <View style={[styles.togglePill, soundSetting ? styles.togglePillOn : styles.togglePillOff]}>
                <Text style={soundSetting ? styles.toggleTextOn : styles.toggleTextOff}>
                  {soundSetting ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.settingRow}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Currency</Text>
                <Text style={styles.settingDesc}>Indian Rupee (₹)</Text>
              </View>
              <Text style={styles.settingValueStatic}>₹ INR</Text>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Navigation Bar (Stitch Home bar) */}
      <View style={[styles.bottomNavBar, { paddingBottom: Math.max(insets.bottom, rs(8)), height: rs(60) + insets.bottom }]}>
        <TouchableOpacity
          style={styles.bottomNavTab}
          onPress={() => {
            setSearchQuery('');
            setSearchActive(false);
          }}
          activeOpacity={0.8}
        >
          <Icon name="grid-view" size={rs(20)} color={colors.primary} />
          <Text style={[styles.bottomNavLabel, { color: colors.primary, fontWeight: '700' }]}>
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavTab}
          onPress={handleOpenExisting}
          activeOpacity={0.8}
        >
          <Icon name="folder" size={rs(20)} color={colors.textSecondary} />
          <Text style={styles.bottomNavLabel}>Files</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavTab}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <Icon name="settings" size={rs(20)} color={colors.textSecondary} />
          <Text style={styles.bottomNavLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  brandTextCol: {
    flexDirection: 'column',
  },
  brandSubtitle: {
    fontSize: ms(10),
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  brandTitle: {
    fontSize: ms(16),
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  topAppBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  appBarIconBtn: {
    width: rs(38),
    height: rs(38),
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarCircle: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: rs(2),
  },
  optionsBtn: {
    width: rs(36),
    height: rs(36),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.full,
  },
  offlineStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  greenPulseDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
    backgroundColor: colors.tertiaryContainer,
  },
  offlineStatusText: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 90,
    gap: rs(16),
  },
  bottomNavBar: {
    height: rs(60),
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: rs(16),
  },
  bottomNavTab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(2),
    minWidth: rs(56),
    paddingVertical: rs(4),
  },
  bottomNavLabel: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  greetingSection: {
    marginTop: rs(4),
  },
  mainTitle: {
    fontSize: ms(24),
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  mainSubtitle: {
    fontSize: ms(14),
    color: colors.textSecondary,
    marginTop: rs(2),
  },
  heroScanCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.card,
    padding: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(14),
    ...shadows.sm,
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontSize: ms(18),
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: ms(13),
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: rs(4),
    lineHeight: ms(18),
  },
  heroIconBox: {
    width: rs(52),
    height: rs(52),
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityGrid: {
    flexDirection: 'row',
    gap: rs(10),
  },
  utilityCard: {
    flex: 1,
    height: rs(136),
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(14),
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  utilityIconBox: {
    width: rs(40),
    height: rs(40),
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityTextCol: {},
  utilityTitle: {
    fontSize: ms(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  utilitySubtitle: {
    fontSize: ms(12),
    color: colors.textSecondary,
    marginTop: rs(2),
  },
  sampleFileRow: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: rs(14),
    paddingVertical: rs(11),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sampleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  sampleLabel: {
    fontSize: ms(13),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  sampleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  sampleFileName: {
    fontSize: ms(12),
    fontWeight: '600',
    color: colors.primary,
  },
  recentSection: {
    marginTop: rs(4),
    gap: rs(10),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: ms(18),
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: ms(12),
    color: colors.textSecondary,
  },
  fileCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
    ...shadows.sm,
  },
  fileCardClickable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    minWidth: 0,
  },
  fileIconBox: {
    width: rs(40),
    height: rs(40),
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  fileNameText: {
    fontSize: ms(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  fileMetaText: {
    fontSize: ms(12),
    color: colors.textSecondary,
    marginTop: rs(2),
  },
  fileMenuBtn: {
    width: rs(36),
    height: rs(36),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.full,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: rs(28),
    paddingHorizontal: rs(16),
  },
  emptyIconBox: {
    width: rs(50),
    height: rs(50),
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rs(8),
  },
  emptyTitle: {
    fontSize: ms(15),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: ms(13),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: rs(4),
  },
  offlineFooterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingVertical: rs(10),
    paddingHorizontal: rs(4),
  },
  offlineFooterText: {
    fontSize: ms(12),
    color: colors.textMuted,
    flex: 1,
    lineHeight: ms(16),
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  loadingBox: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    padding: rs(24),
    alignItems: 'center',
    gap: rs(12),
  },
  loadingText: {
    fontSize: ms(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: rs(20),
    paddingBottom: rs(32),
    gap: rs(4),
  },
  menuHeader: {
    paddingBottom: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: rs(6),
  },
  menuTitle: {
    fontSize: ms(15),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: ms(12),
    color: colors.textSecondary,
    marginTop: rs(2),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    paddingVertical: rs(12),
    borderRadius: radii.sm,
  },
  menuItemDestructive: {
    marginTop: rs(4),
  },
  menuItemText: {
    fontSize: ms(14),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    marginVertical: rs(8),
    gap: rs(8),
  },
  searchInput: {
    flex: 1,
    fontSize: ms(13),
    color: colors.textPrimary,
    padding: 0,
  },
  searchDoneText: {
    fontSize: ms(12),
    color: colors.primary,
    fontWeight: '600',
  },
  emptySearchContainer: {
    padding: rs(24),
    alignItems: 'center',
    gap: rs(8),
  },
  emptySearchText: {
    fontSize: ms(13),
    color: colors.textSecondary,
  },
  clearSearchBtn: {
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
  },
  clearSearchBtnText: {
    fontSize: ms(12),
    color: colors.primary,
    fontWeight: '600',
  },
  modalIconCenter: {
    alignItems: 'center',
    marginBottom: rs(16),
  },
  avatarLargeCircle: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(26),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rs(8),
  },
  modalSheetTitle: {
    fontSize: ms(16),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSheetSub: {
    fontSize: ms(12),
    color: colors.textSecondary,
    marginTop: rs(2),
  },
  infoRowBlock: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    padding: rs(14),
    gap: rs(10),
    marginBottom: rs(16),
  },
  infoRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  infoRowText: {
    fontSize: ms(13),
    color: colors.textPrimary,
    fontWeight: '500',
  },
  modalPrimaryBtn: {
    height: rs(44),
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: rs(8),
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: ms(14),
    fontWeight: '700',
  },
  modalCloseBtn: {
    height: rs(40),
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: rs(8),
  },
  modalCloseBtnText: {
    color: colors.textSecondary,
    fontSize: ms(13),
    fontWeight: '600',
  },
  renameDialogCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    marginHorizontal: rs(24),
    padding: rs(20),
    gap: rs(12),
  },
  renameDialogTitle: {
    fontSize: ms(16),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  renameDialogSub: {
    fontSize: ms(12),
    color: colors.textSecondary,
  },
  renameInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
    fontSize: ms(14),
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  renameBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: rs(10),
  },
  renameCancelBtn: {
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
  },
  renameCancelText: {
    fontSize: ms(13),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  renameSaveBtn: {
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
  },
  renameSaveText: {
    fontSize: ms(13),
    color: '#FFFFFF',
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingTextCol: {
    flex: 1,
    paddingRight: rs(12),
  },
  settingLabel: {
    fontSize: ms(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingDesc: {
    fontSize: ms(11),
    color: colors.textSecondary,
    marginTop: rs(1),
  },
  activeCheckPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: colors.success,
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: radii.full,
  },
  activeCheckText: {
    fontSize: ms(11),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  togglePill: {
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    borderRadius: radii.full,
    borderWidth: 1,
  },
  togglePillOn: {
    backgroundColor: colors.surfaceContainerHighest,
    borderColor: colors.primary,
  },
  togglePillOff: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.border,
  },
  toggleTextOn: {
    fontSize: ms(11),
    fontWeight: '700',
    color: colors.primary,
  },
  toggleTextOff: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.textMuted,
  },
  settingValueStatic: {
    fontSize: ms(13),
    fontWeight: '700',
    color: colors.textSecondary,
  },
  templateSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: rs(20),
    paddingTop: rs(12),
    paddingBottom: rs(24),
    maxHeight: '85%',
  },
  templateSheetHeader: {
    paddingBottom: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: rs(10),
  },
  templateSheetHandle: {
    width: rs(36),
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: rs(10),
  },
  templateSheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  templateIconCircle: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateSheetTitle: {
    fontSize: ms(16),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  templateSheetSub: {
    fontSize: ms(12),
    color: colors.textSecondary,
    marginTop: rs(2),
  },
  templateCloseBtn: {
    padding: rs(4),
  },
  templateListScroll: {
    paddingVertical: rs(6),
  },
  featuredTemplateCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: '#3B68C6',
    padding: rs(14),
    marginBottom: rs(12),
    ...shadows.sm,
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(6),
  },
  mostUsedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: '#3B68C6',
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: radii.full,
  },
  mostUsedBadgeText: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  templateColCountText: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  featuredTemplateTitle: {
    fontSize: ms(16),
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  featuredTemplateSub: {
    fontSize: ms(12),
    color: colors.textSecondary,
    marginTop: rs(2),
    marginBottom: rs(10),
  },
  satyabhamaPreviewContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: rs(10),
  },
  satyabhamaHeaderBar: {
    flexDirection: 'row',
    backgroundColor: '#3B68C6',
    paddingVertical: rs(6),
  },
  satyaCell: {
    paddingHorizontal: rs(10),
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  satyaCellText: {
    fontSize: ms(11),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  useTemplateActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: rs(8),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  useTemplateActionText: {
    fontSize: ms(12),
    fontWeight: '700',
    color: colors.primary,
  },
  standardTemplateCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(12),
    marginBottom: rs(10),
    ...shadows.xs,
  },
  standardTemplateTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  standardTemplateIconBox: {
    width: rs(34),
    height: rs(34),
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  standardTemplateTitle: {
    fontSize: ms(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  standardTemplateSub: {
    fontSize: ms(11),
    color: colors.textSecondary,
    marginTop: rs(1),
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(6),
    marginTop: rs(8),
    paddingLeft: rs(44),
  },
  previewPill: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
    borderRadius: radii.xs,
  },
  previewPillText: {
    fontSize: ms(10),
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
