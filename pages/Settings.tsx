
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData, User as DBUser } from '../db.ts';
import { backupToWhatsApp, generateShopKey, reconcileStaffSales, generateMasterStockKey, generateStaffInviteKey } from '../utils/whatsapp.ts';
import pako from 'pako';
import { 
  CloudUpload, User as UserIcon, Store, Smartphone, Plus, Trash2, 
  Database, ShieldCheck, Share2, RefreshCw, HelpCircle, ChevronDown, BookOpen, Loader2, CheckCircle2,
  Moon, Sun, Key, Users, X, Send, Printer, Bluetooth, ShieldAlert, Wifi
} from 'lucide-react';
import { Role, Page } from '../types.ts';
import { BackupSuccessModal } from '../components/BackupSuccessModal.tsx';
import { useTheme } from '../ThemeContext.tsx';
import { connectBluetoothPrinter, disconnectPrinter, isPrinterReady } from '../utils/bluetoothPrinter.ts';

interface SettingsProps {
  user: DBUser;
  role: Role;
  setRole: (role: Role) => void;
  setPage: (page: Page) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, role, setRole, setPage }) => {
  const isAdmin = role === 'Admin';
  const { theme, toggleTheme } = useTheme();
  const [shopName, setShopName] = useState(() => localStorage.getItem('shop_name') || '');
  const [shopInfo, setShopInfo] = useState(() => localStorage.getItem('shop_info') || '');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'Staff' as Role });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncingStock, setIsSyncingStock] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [printerStatus, setPrinterStatus] = useState(() => isPrinterReady() ? 'Connected' : 'Disconnected');
  const [printerName, setPrinterName] = useState(() => localStorage.getItem('last_printer_name'));
  
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  
  const [importStats, setImportStats] = useState<{sales: number, inventory: number, debts: number, expenses: number} | null>(null);
  const [reconcileResult, setReconcileResult] = useState<{merged: number, skipped: number} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reconcileInputRef = useRef<HTMLInputElement>(null);

  const users = useLiveQuery(() => db.users.toArray());

  useEffect(() => {
    localStorage.setItem('shop_name', shopName);
  }, [shopName]);

  useEffect(() => {
    localStorage.setItem('shop_info', shopInfo);
  }, [shopInfo]);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const inventory = await db.inventory.toArray();
      const sales = await db.sales.toArray();
      const expenses = await db.expenses.toArray();
      const debts = await db.debts.toArray();
      const usersList = await db.users.toArray();
      const settings = await db.settings.toArray();
      
      const result = await backupToWhatsApp({ 
        inventory, 
        sales, 
        expenses, 
        debts,
        users: usersList,
        settings,
        shopName,
        shopInfo,
        timestamp: Date.now() 
      });

      if (result.success && result.method === 'DOWNLOAD') {
        setBackupFileName(result.fileName || 'NaijaShop_Backup.json.gz');
        setShowBackupSuccess(true);
      }
    } catch (err) {
      alert("Backup failed: " + (err as Error).message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handlePairPrinter = async () => {
    setIsConnectingPrinter(true);
    try {
      const name = await connectBluetoothPrinter();
      setPrinterName(name);
      setPrinterStatus('Connected');
    } catch (err: any) {
      alert("Pairing failed: " + err.message);
      setPrinterStatus('Disconnected');
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  const handleUnpairPrinter = () => {
    disconnectPrinter();
    setPrinterName(null);
    setPrinterStatus('Disconnected');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.pin) return;
    await db.users.add({
      ...newUser,
      id: `user-${Date.now()}`
    });
    setNewUser({ name: '', pin: '', role: 'Staff' as Role });
    setShowAddUser(false);
  };

  const handleReconcileMerge = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsMerging(true);
        let jsonStr = '';
        const result = event.target?.result;

        if (file.name.endsWith('.gz') || (result instanceof ArrayBuffer && new Uint8Array(result as ArrayBuffer)[0] === 0x1f)) {
          const decompressed = pako.ungzip(new Uint8Array(result as ArrayBuffer));
          jsonStr = new TextDecoder().decode(decompressed);
        } else if (typeof result === 'string') {
          jsonStr = result;
        } else {
          jsonStr = new TextDecoder().decode(result as ArrayBuffer);
        }

        const staffData = JSON.parse(jsonStr);
        const report = await reconcileStaffSales(staffData, user.name || 'Admin');
        setReconcileResult({ merged: report.merged, skipped: report.skipped });
      } catch (err) {
        alert('Reconciliation failed: ' + (err as Error).message);
      } finally {
        setIsMerging(false);
        if (reconcileInputRef.current) reconcileInputRef.current.value = '';
      }
    };

    if (file.name.endsWith('.gz')) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };
  // ... Rest of component ...
