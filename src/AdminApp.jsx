import React, { useState, useEffect, useRef } from 'react';
import { 
  Boxes, 
  UsersRound, 
  Eye, 
  EyeOff, 
  UserCog, 
  Building2, 
  ListFilter, 
  ShieldCheck, 
  Globe, 
  ShieldAlert, 
  Sparkles,
  Receipt,
  PlusCircle,
  Trash2,
  Calendar,
  Tag,
  TrendingDown,
  Scale
} from 'lucide-react';
import SalesLedger from './SalesLedger';
import InventoryManagement from './components/InventoryManagement';
import BranchManagement from './components/BranchManagement';
import BatchTransferModal from './components/BatchTransferModal';
import TransferHistoryModal from './components/TransferHistoryModal';
import StaffManagement from './StaffManagement';

const EXPENSE_CATEGORIES = [
  'Rent & Utilities',
  'Restock & Logistics',
  'Staff & Wages',
  'Marketing & Ads',
  'Packaging & Supplies',
  'Maintenance & Repairs',
  'Taxes & Fees',
  'General'
];

export default function AdminApp({ currentUser, supabase }) {
  const isAdmin = currentUser?.role === 'admin';
  
  const [activeTab, setActiveTab] = useState(isAdmin ? 'inventory' : 'customers'); 

  // Global Data states
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [transferLogs, setTransferLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // Expenses Form & Filter States
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('General');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenseBranchId, setExpenseBranchId] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [savingExpense, setSavingExpense] = useState(false);

  // Privacy / Financial Visibility States
  const [showFinancials, setShowFinancials] = useState(false);
  const autoHideTimerRef = useRef(null);

  // Secure Admin PIN Modal States
  const [adminPinModalOpen, setAdminPinModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinResolve, setAdminPinResolve] = useState(null);
  const [adminPinError, setAdminPinError] = useState('');

  // Branch Context Filters & Critical Stock Filter State
  const [viewingBranch, setViewingBranch] = useState(''); 
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Storefront Specific Branch Filter State
  const [storefrontBranch, setStorefrontBranch] = useState(() => {
    return localStorage.getItem('donchike_storefront_branch') || '';
  });
  
  // Live Public Storefront Control State (stores branch_id or '' for HQ)
  const [liveStoreBranch, setLiveStoreBranch] = useState('');

  useEffect(() => {
    localStorage.setItem('donchike_storefront_branch', storefrontBranch);
  }, [storefrontBranch]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, []);

  // Branch form states
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [editingBranch, setEditingBranch] = useState(null);

  // Staff form states
  const [staffName, setStaffName] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffRole, setStaffRole] = useState('staff');
  const [staffBranch, setStaffBranch] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);

  // Inventory forms states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [batch, setBatch] = useState('');
  const [productBranch, setProductBranch] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Batch Transfer States
  const [batchTransferOpen, setBatchTransferOpen] = useState(false);
  const [batchTransferStep, setBatchTransferStep] = useState('select'); 
  const [selectedBatchItems, setSelectedBatchItems] = useState({}); 
  const [batchTransferLoading, setBatchTransferLoading] = useState(false);
  const [batchTransferError, setBatchTransferError] = useState('');

  // Transfer History Modal State
  const [transferHistoryOpen, setTransferHistoryOpen] = useState(false);

  // Determine active branch context
  const activeBranchId = isAdmin ? viewingBranch : (currentUser?.branch_id || '');

  useEffect(() => {
    fetchBranchesFromSupabase();
    fetchProducts();
    fetchCustomersFromSupabase();
    fetchTransferLogs();
    fetchExpensesFromSupabase();
    if (isAdmin) {
      fetchStaffFromSupabase();
      fetchStoreSettings(); 
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (viewingBranch !== 'ALL') {
      setProductBranch(viewingBranch);
      setExpenseBranchId(viewingBranch);
    } else {
      setProductBranch('');
      setExpenseBranchId('');
    }
  }, [viewingBranch]);

  const fetchExpensesFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (!error && data) {
        setExpenses(data);
      }
    } catch (err) {
      console.log("Expenses table optional initialization:", err);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid expense title and an amount greater than #0.");
      return;
    }

    setSavingExpense(true);
    try {
      const payload = {
        title: expenseTitle.trim(),
        category: expenseCategory,
        amount: parsedAmount,
        notes: expenseNotes.trim() || null,
        expense_date: expenseDate || new Date().toISOString().split('T')[0],
        branch_id: expenseBranchId || null,
        recorded_by: currentUser?.full_name || 'Admin'
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setExpenses(prev => [data[0], ...prev]);
      } else {
        await fetchExpensesFromSupabase();
      }

      setExpenseTitle('');
      setExpenseAmount('');
      setExpenseNotes('');
      setExpenseCategory('General');
      alert("Expense recorded and deducted from business finances.");
    } catch (err) {
      alert(`Error saving expense: ${err.message}`);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!(await verifyAdminPinBeforeAction())) return;
    if (!window.confirm("Delete this expense record? This will restore the amount to net business finances.")) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      setExpenses(prev => prev.filter(exp => String(exp.id) !== String(expenseId)));
      alert("Expense deleted.");
    } catch (err) {
      alert(`Error deleting expense: ${err.message}`);
    }
  };

  const fetchStoreSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('active_branch')
        .single();
      
      if (!error && data) {
        setLiveStoreBranch(data.active_branch || '');
      }
    } catch (err) {
      console.log("Store settings not configured (normal on first launch).");
    }
  };

  const handleUpdateLiveBranch = async (newBranchId) => {
    if (!(await verifyAdminPinBeforeAction())) return;
    try {
      const { error } = await supabase
        .from('store_settings')
        .upsert({ id: 1, active_branch: newBranchId }, { onConflict: 'id' });
      
      if (error) throw error;
      setLiveStoreBranch(newBranchId);
      const branchObj = branches.find(b => b.id === newBranchId);
      const branchDisplayName = branchObj ? branchObj.name : 'Main Headquarters';
      alert(`Success! The client app now displays stock from: ${branchDisplayName}`);
    } catch (err) {
      alert(`Error updating live branch: ${err.message}`);
    }
  };

  const fetchBranchesFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true });
      if (!error && data) setBranches(data);
    } catch (err) { console.error("Error branches:", err); }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data) setProducts(data);
    } catch (err) { console.error("Error products:", err); }
  };

  // --- BULLETPROOF CUSTOMER & SALES FETCHING ---
  const fetchCustomersFromSupabase = async () => {
    try {
      const { data: cData } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      let rawCustomers = cData || [];

      let historyData = [];

      const [res1, res2, res3] = await Promise.all([
        supabase.from('customer_history').select('*'),
        supabase.from('sales_ledger').select('*'),
        supabase.from('sales').select('*')
      ]);

      if (res2.data && res2.data.length > 0) historyData = [...historyData, ...res2.data];
      if (res1.data && res1.data.length > 0) historyData = [...historyData, ...res1.data];
      if (res3.data && res3.data.length > 0) historyData = [...historyData, ...res3.data];

      const uniqueHistoryMap = new Map();
      historyData.forEach(item => {
        if (item.id) uniqueHistoryMap.set(item.id, item);
      });
      historyData = Array.from(uniqueHistoryMap.values());

      rawCustomers = rawCustomers.map(c => {
        const cHist = historyData.filter(h => 
          String(h.customer_id || h.customerId || h.client_id) === String(c.id)
        );
        return { ...c, customer_history: cHist };
      });

      const orphanSales = historyData.filter(h => !h.customer_id && !h.customerId && !h.client_id);
      if (orphanSales.length > 0) {
        rawCustomers.push({
          id: 'virtual_global_client',
          name: 'Direct Walk-in Sales',
          phone: '',
          branch_id: orphanSales[0].branch_id || null,
          total_debt: 0,
          customer_history: orphanSales
        });
      }

      const formatted = rawCustomers.map(c => {
        const rawHistory = c.customer_history || [];
        const formattedHistory = rawHistory.map(h => {
          let parsedItems = [];
          if (h.items) {
            if (typeof h.items === 'string') {
              try { parsedItems = JSON.parse(h.items); } catch (e) { parsedItems = []; }
            } else if (Array.isArray(h.items)) {
              parsedItems = h.items;
            }
          }

          const itemSum = parsedItems.reduce((acc, it) => {
            const pr = parseFloat(it.price || it.unit_price || 0) || 0;
            const qt = parseInt(it.qty || it.quantity || 1) || 1;
            return acc + (pr * qt);
          }, 0);

          const totalAmt = parseFloat(h.total_amount ?? h.total ?? h.amount ?? h.grand_total ?? itemSum) || itemSum;
          const paidAmt = parseFloat(h.amount_paid ?? h.paid ?? h.paid_amount ?? 0) || 0;
          let debtAmt = parseFloat(h.debt ?? h.balance ?? h.amount_due ?? 0) || 0;

          if (debtAmt === 0 && totalAmt > paidAmt && paidAmt > 0) {
            debtAmt = totalAmt - paidAmt;
          }

          return {
            ...h,
            id: h.id,
            total: totalAmt,
            total_amount: totalAmt,
            amount_paid: paidAmt,
            debt: debtAmt,
            items: parsedItems,
            productId: h.product_id || h.productId
          };
        }).sort((a, b) => b.id - a.id);

        const directDebt = parseFloat(c.total_debt ?? c.totalDebt ?? c.debt ?? c.balance ?? 0) || 0;
        const historyDebtSum = formattedHistory.reduce((acc, h) => acc + (parseFloat(h.debt) || 0), 0);

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          branch_id: c.branch_id,
          totalDebt: Math.max(directDebt, historyDebtSum),
          history: formattedHistory
        };
      });

      setCustomers(formatted);
    } catch (err) { 
      console.error("Error customers:", err.message); 
    }
  };

  const fetchStaffFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
      if (!error && data) setStaffList(data);
    } catch (err) { console.error("Error staff:", err); }
  };

  const fetchTransferLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setTransferLogs(data);
      }
    } catch (err) {
      console.log("Transfers history table optional initialization.");
    }
  };

  const verifyAdminPinBeforeAction = () => {
    return new Promise((resolve) => {
      setAdminPinInput('');
      setAdminPinError('');
      setAdminPinResolve(() => resolve);
      setAdminPinModalOpen(true);
    });
  };

  const handleToggleFinancialVisibility = async () => {
    if (showFinancials) {
      setShowFinancials(false);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    } else {
      if (await verifyAdminPinBeforeAction()) {
        setShowFinancials(true);
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = setTimeout(() => {
          setShowFinancials(false);
        }, 10 * 60 * 1000);
      }
    }
  };

  const formatMoney = (amount) => {
    if (!showFinancials) return '******';
    const numeric = Number(amount) || 0;
    const prefix = numeric < 0 ? '-#' : '#';
    return `${prefix}${Math.abs(numeric).toLocaleString()}`;
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchName) return;
    try {
      const payload = { name: branchName.trim(), location: branchLocation.trim() };
      if (editingBranch) {
        await supabase.from('branches').update(payload).eq('id', editingBranch.id);
        alert('Branch updated successfully!');
      } else {
        await supabase.from('branches').insert([payload]);
        alert('New branch created successfully!');
      }
      setBranchName(''); setBranchLocation(''); setEditingBranch(null);
      fetchBranchesFromSupabase();
    } catch (err) { alert(`Error: ${err.message}`); }
  };

  const handleDeleteBranch = async (branchId) => {
    if (!(await verifyAdminPinBeforeAction())) return;
    if (!window.confirm('Are you sure you want to delete this branch? This action is irreversible.')) return;
    try {
      const { error } = await supabase.from('branches').delete().eq('id', branchId);
      if (error) throw error;
      alert('Branch deleted successfully!');
      
      if (viewingBranch === branchId) setViewingBranch('');
      if (storefrontBranch === branchId) setStorefrontBranch('');
      
      fetchBranchesFromSupabase();
    } catch (err) {
      alert(`Error deleting branch: ${err.message}`);
    }
  };

  const handleReassignStaff = async (staffId, newBranchId) => {
    if (!(await verifyAdminPinBeforeAction())) return;
    try {
      const targetBranch = newBranchId || null;
      const { error } = await supabase.from('staff').update({ branch_id: targetBranch }).eq('id', staffId);
      if (error) throw error;
      alert('Staff reassigned successfully!');
      fetchStaffFromSupabase();
    } catch (err) {
      alert(`Error reassigning staff: ${err.message}`);
    }
  };

  const handleStartEditStaff = async (staffMember) => {
    if (!(await verifyAdminPinBeforeAction())) return;
    setEditingStaff(staffMember);
    setStaffName(String(staffMember.full_name || ''));
    setStaffPin(String(staffMember.pin_code || ''));
    setStaffRole(String(staffMember.role || 'staff'));
    setStaffBranch(String(staffMember.branch_id || ''));
    setActiveTab('staff');
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffName || !staffPin) return;
    if (!(await verifyAdminPinBeforeAction())) return;

    try {
      const payload = {
        full_name: staffName.trim(),
        pin_code: staffPin.trim(),
        role: staffRole,
        branch_id: staffBranch || null,
        is_active: true
      };
      if (editingStaff) {
        await supabase.from('staff').update(payload).eq('id', editingStaff.id);
        alert('Staff member updated!');
      } else {
        await supabase.from('staff').insert([payload]);
        alert('New staff member added!');
      }
      setStaffName(''); setStaffPin(''); setStaffRole('staff'); setStaffBranch(''); setEditingStaff(null);
      fetchStaffFromSupabase();
    } catch (err) { alert(`Error: ${err.message}`); }
  };

  const handleToggleStaffStatus = async (id, currentStatus) => {
    if (!(await verifyAdminPinBeforeAction())) return;
    try {
      const { error } = await supabase.from('staff').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      fetchStaffFromSupabase(); 
      alert(currentStatus ? 'Staff account deactivated!' : 'Staff account reactivated!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.75) => { 
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width; let height = img.height;
          if (width > height) { if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; } }
          else { if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
        };
      };
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name || !price || quantity === '' || !batch) return;
    setUploading(true);
    let image_url = editingProduct ? editingProduct.image_url : 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&q=80';
    try {
      if (imageFile) {
        let fileToUpload = await compressImage(imageFile, 800, 800, 0.75);
        const fileName = `${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('product-images').upload(fileName, fileToUpload);
        if (upErr) throw upErr;
        image_url = supabase.storage.from('product-images').getPublicUrl(fileName)?.data?.publicUrl || image_url;
      }
      
      const parsedQty = parseInt(quantity) || 0;
      const parsedInitQty = initialQuantity !== '' ? parseInt(initialQuantity) : (editingProduct ? editingProduct.initial_quantity : parsedQty);

      const payload = { 
        name: name.trim(), 
        description: description.trim(), 
        price: parseFloat(price),
        cost_price: parseFloat(costPrice) || 0,
        image_url, 
        quantity: parsedQty, 
        initial_quantity: parsedInitQty || parsedQty,
        stock_status: parsedQty > 0, 
        batch_reference: batch.trim().toUpperCase(),
        branch_id: productBranch || null,
        is_archived: false
      };

      if (editingProduct) await supabase.from('products').update(payload).eq('id', editingProduct.id);
      else await supabase.from('products').insert([payload]);

      handleCancelEditProduct();
      await fetchProducts();
      alert('Inventory saved successfully!');
    } catch (err) { alert(`Error: ${err.message}`); } finally { setUploading(false); }
  };

  const handleOpenBatchTransfer = () => {
    setSelectedBatchItems({});
    setBatchTransferStep('select');
    setBatchTransferError('');
    setBatchTransferOpen(true);
  };

  const handleOpenTransferHistory = () => {
    fetchTransferLogs();
    setTransferHistoryOpen(true);
  };

  const handleToggleBatchItemSelect = (product) => {
    setSelectedBatchItems(prev => {
      const copy = { ...prev };
      if (copy[product.id]?.selected) {
        delete copy[product.id];
      } else {
        copy[product.id] = {
          product,
          selected: true,
          targetBranch: branches[0]?.id || '',
          qty: 1
        };
      }
      return copy;
    });
  };

  const handleUpdateBatchItemDetail = (productId, field, value) => {
    setSelectedBatchItems(prev => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: value
        }
      };
    });
  };

  const handleProceedToBatchReview = () => {
    const activeItems = Object.values(selectedBatchItems).filter(item => item.selected);
    if (activeItems.length === 0) {
      setBatchTransferError("Please select at least one product to transfer.");
      return;
    }

    for (const item of activeItems) {
      if (!item.targetBranch) {
        setBatchTransferError("Please assign a target branch for all selected products.");
        return;
      }
      if (item.qty <= 0) {
        setBatchTransferError(`The quantity for "${item.product.name}" must be greater than 0.`);
        return;
      }
      if (item.qty > item.product.quantity) {
        setBatchTransferError(`Insufficient HQ stock for "${item.product.name}" (Max: ${item.product.quantity}).`);
        return;
      }
    }

    setBatchTransferError('');
    setBatchTransferStep('review');
  };

  const handleConfirmBatchTransfer = async () => {
    setBatchTransferLoading(true);
    setBatchTransferError('');

    try {
      const activeItems = Object.values(selectedBatchItems).filter(item => item.selected);
      if (activeItems.length === 0) {
        setBatchTransferError("No products selected for transfer.");
        setBatchTransferLoading(false);
        return;
      }

      for (const item of activeItems) {
        const transferQty = Number(item.qty) || 0;
        if (!item.targetBranch) {
          throw new Error(`Please select a target branch for "${item.product.name}".`);
        }
        if (transferQty <= 0) {
          throw new Error(`The transfer quantity for "${item.product.name}" must be greater than 0.`);
        }
        if (transferQty > item.product.quantity) {
          throw new Error(`Insufficient HQ stock for "${item.product.name}" (Available: ${item.product.quantity}).`);
        }
      }

      const transferRef = `TRF-${Date.now().toString().slice(-6)}`;
      const transferSummary = [];

      for (const item of activeItems) {
        const { product, targetBranch, qty } = item;
        const transferQty = Number(qty) || 0;

        const newHqQty = product.quantity - transferQty;
        const { error: hqError } = await supabase
          .from('products')
          .update({ quantity: newHqQty, stock_status: newHqQty > 0 })
          .eq('id', product.id);

        if (hqError) throw hqError;

        const existingTargetProd = products.find(p => 
          p.name.trim().toLowerCase() === product.name.trim().toLowerCase() && 
          String(p.batch_reference || '').trim().toUpperCase() === String(product.batch_reference || '').trim().toUpperCase() && 
          String(p.branch_id || '') === String(targetBranch)
        );

        if (existingTargetProd) {
          const newTargetQty = (existingTargetProd.quantity || 0) + transferQty;
          const { error: updateError } = await supabase
            .from('products')
            .update({ quantity: newTargetQty, stock_status: newTargetQty > 0 })
            .eq('id', existingTargetProd.id);

          if (updateError) throw updateError;
        } else {
          const { id, created_at, ...prodData } = product;
          prodData.branch_id = targetBranch;
          prodData.quantity = transferQty;
          prodData.initial_quantity = transferQty;
          prodData.stock_status = true;
          const { error: insertError } = await supabase.from('products').insert([prodData]);

          if (insertError) throw insertError;
        }

        const targetBranchObj = branches.find(b => String(b.id) === String(targetBranch));
        transferSummary.push({
          product_id: product.id,
          product_name: product.name,
          batch_reference: product.batch_reference || 'N/A',
          qty: transferQty,
          cost_price: product.cost_price || 0,
          price: product.price || 0,
          target_branch_id: targetBranch,
          target_branch_name: targetBranchObj?.name || 'Branch'
        });
      }

      const newLogRecord = {
        transfer_ref: transferRef,
        items: transferSummary,
        created_by: currentUser?.full_name || 'Admin HQ',
        created_at: new Date().toISOString()
      };

      setTransferLogs(prev => [newLogRecord, ...prev]);

      try {
        const { data: insertedData, error: logErr } = await supabase
          .from('stock_transfers')
          .insert([newLogRecord])
          .select();

        if (logErr) {
          console.warn("Notice: stock_transfers DB table notice:", logErr.message);
        } else if (insertedData && insertedData.length > 0) {
          setTransferLogs(prev => prev.map(l => l.transfer_ref === transferRef ? insertedData[0] : l));
        }
      } catch (logErr) {
        console.warn("Table stock_transfers not yet available in DB:", logErr);
      }

      setBatchTransferLoading(false);
      setBatchTransferOpen(false);
      
      await fetchProducts();
      await fetchTransferLogs();

      alert(`Batch transfer completed successfully! Ref: ${transferRef}`);
    } catch (err) {
      console.error("Batch transfer error:", err);
      setBatchTransferError(`Error during transfer: ${err.message}`);
      setBatchTransferLoading(false);
    }
  };

  const handleStartEditProduct = (p) => {
    if (!p) return;
    setEditingProduct(p);
    setName(String(p.name || ''));
    setPrice(p.price !== undefined && p.price !== null ? String(p.price) : '');
    setCostPrice(p.cost_price !== undefined && p.cost_price !== null ? String(p.cost_price) : '');
    setQuantity(p.quantity !== undefined && p.quantity !== null ? String(p.quantity) : '');
    setInitialQuantity(
      p.initial_quantity !== undefined && p.initial_quantity !== null
        ? String(p.initial_quantity)
        : (p.quantity !== undefined ? String(p.quantity) : '')
    );
    setDescription(String(p.description || ''));
    setBatch(String(p.batch_reference || ''));
    setImageFile(null);
    setProductBranch(String(p.branch_id || ''));
  };

  const handleCancelEditProduct = () => {
    setEditingProduct(null); setName(''); setPrice(''); setCostPrice(''); setQuantity(''); 
    setInitialQuantity(''); setDescription(''); setBatch(''); setImageFile(null); setProductBranch('');
  };

  const handleUpdateStockVolume = async (id, newVolume) => {
    const parsedVolume = parseInt(newVolume) || 0;
    await supabase.from('products').update({ quantity: parsedVolume, stock_status: parsedVolume > 0 }).eq('id', id);
    setProducts(prev => prev.map(p => String(p.id) === String(id) ? { ...p, quantity: parsedVolume, stock_status: parsedVolume > 0 } : p));
  };

  const handleArchiveProduct = async (id, archiveState = true) => {
    if (!window.confirm(archiveState ? 'Archive this product?' : 'Restore this product?')) return;
    await supabase.from('products').update({ is_archived: archiveState }).eq('id', id);
    setProducts(prev => prev.map(p => String(p.id) === String(id) ? { ...p, is_archived: archiveState } : p));
  };

  const contextProducts = products.filter(p => {
    if (activeBranchId === 'ALL' || activeBranchId === '') return true;
    return String(p.branch_id || '') === String(activeBranchId);
  });

  const contextCustomers = customers.filter(c => {
    if (activeBranchId === 'ALL' || activeBranchId === '') return true;
    return String(c.branch_id || '') === String(activeBranchId);
  });

  const contextExpenses = expenses.filter(exp => {
    if (activeBranchId === 'ALL' || activeBranchId === '') return true;
    return String(exp.branch_id || '') === String(activeBranchId);
  });

  // Critical stock threshold set to 0
  const lowStockProducts = contextProducts.filter(p => !p.is_archived && (parseInt(p.quantity) || 0) <= 0);
  const hasLowStock = lowStockProducts.length > 0;

  const totalSalesRevenue = contextCustomers.reduce((acc, c) => {
    const customerSales = (c.history || []).reduce((hAcc, h) => {
      let rev = parseFloat(h.total ?? h.total_amount ?? h.amount ?? h.grand_total ?? h.total_price ?? 0) || 0;
      
      if (rev === 0 && Array.isArray(h.items) && h.items.length > 0) {
        rev = h.items.reduce((iAcc, it) => {
          const itemPrice = parseFloat(it.price ?? it.unit_price ?? it.total ?? 0) || 0;
          const itemQty = parseInt(it.qty ?? it.quantity ?? 1) || 1;
          return iAcc + (itemPrice * itemQty);
        }, 0);
      }
      return hAcc + rev;
    }, 0);
    return acc + customerSales;
  }, 0);

  const totalGoodsSoldCost = contextCustomers.reduce((acc, c) => {
    const customerCOGS = (c.history || []).reduce((hAcc, h) => {
      const items = Array.isArray(h.items) ? h.items : [];
      if (items.length > 0) {
        const hCogs = items.reduce((iAcc, it) => {
          const matchedProd = products.find(p => 
            String(p.id) === String(it.productId || it.product_id || it.id) ||
            p.name.trim().toLowerCase() === (it.name || it.product_name || '').trim().toLowerCase()
          );

          const unitCost = parseFloat(it.cost_price ?? it.costPrice ?? matchedProd?.cost_price ?? matchedProd?.costPrice ?? 0) || 0;
          const qty = parseInt(it.qty ?? it.quantity ?? 1) || 1;
          return iAcc + (unitCost * qty);
        }, 0);
        return hAcc + hCogs;
      } else {
        const matchedProd = products.find(p => 
          String(p.id) === String(h.productId || h.product_id) ||
          p.name.trim().toLowerCase() === (h.product_name || h.name || '').trim().toLowerCase()
        );
        const unitCost = parseFloat(h.cost_price ?? h.costPrice ?? matchedProd?.cost_price ?? 0) || 0;
        const qty = parseInt(h.qty ?? h.quantity ?? 1) || 1;
        return hAcc + (unitCost * qty);
      }
    }, 0);
    return acc + customerCOGS;
  }, 0);

  const totalOutstandingDebt = contextCustomers.reduce((acc, c) => {
    const directDebt = parseFloat(c.totalDebt ?? c.total_debt ?? c.debt ?? c.balance ?? c.outstanding_debt ?? 0) || 0;
    
    const historyDebt = (c.history || []).reduce((hAcc, h) => {
      let recordDebt = parseFloat(h.debt ?? h.balance ?? h.amount_due ?? 0) || 0;
      
      if (recordDebt === 0) {
        let recordTotal = parseFloat(h.total ?? h.total_amount ?? h.amount ?? h.grand_total ?? 0) || 0;
        if (recordTotal === 0 && Array.isArray(h.items) && h.items.length > 0) {
          recordTotal = h.items.reduce((iAcc, it) => iAcc + ((parseFloat(it.price || it.unit_price) || 0) * (parseInt(it.qty || it.quantity) || 1)), 0);
        }
        const recordPaid = parseFloat(h.amount_paid ?? h.paid ?? h.paid_amount ?? 0) || 0;
        if (recordTotal > recordPaid && recordPaid > 0) {
          recordDebt = recordTotal - recordPaid;
        }
      }
      return hAcc + recordDebt;
    }, 0);

    return acc + Math.max(directDebt, historyDebt);
  }, 0);

  const totalExpenses = contextExpenses.reduce((acc, exp) => acc + (parseFloat(exp.amount) || 0), 0);

  // Net Profit after COGS and Expenses
  const netBusinessProfit = (totalSalesRevenue - totalGoodsSoldCost) - totalExpenses;

  const getProductSoldQty = (productId) => {
    return contextCustomers.reduce((acc, c) => acc + (c.history || []).reduce((hAcc, h) => {
      if (h.items && Array.isArray(h.items) && h.items.length > 0) {
        const item = h.items.find(i => String(i.productId || i.product_id || i.id) === String(productId));
        return hAcc + (item ? (parseInt(item.qty || item.quantity) || 0) : 0);
      } else {
        const isMatch = String(h.productId || h.product_id || '') === String(productId);
        return hAcc + (isMatch ? (parseInt(h.qty || h.quantity) || 1) : 0);
      }
    }, 0), 0);
  };

  const getTrueInitialQty = (p) => {
    if (p.initial_quantity !== undefined && p.initial_quantity !== null && p.initial_quantity !== '') return parseInt(p.initial_quantity);
    return (parseInt(p.quantity) || 0) + getProductSoldQty(p.id);
  };

  const totalInventoryCost = contextProducts.reduce((acc, p) => acc + ((parseFloat(p.cost_price) || 0) * getTrueInitialQty(p)), 0);
  const totalExpectedRevenue = contextProducts.reduce((acc, p) => acc + ((parseFloat(p.price) || 0) * getTrueInitialQty(p)), 0);
  const totalPotentialRetail = contextProducts.filter(p => !p.is_archived).reduce((acc, p) => acc + ((parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0)), 0);

  const uniqueBatches = ['ALL', ...new Set(contextProducts.map(p => p.batch_reference).filter(Boolean))];
  const filteredProducts = contextProducts.filter(p => {
    const matchesBatch = selectedBatchFilter === 'ALL' || p.batch_reference === selectedBatchFilter;
    const matchesArchiveState = showArchived ? p.is_archived : !p.is_archived;
    const matchesLowStock = showLowStockOnly ? (parseInt(p.quantity) || 0) <= 0 : true;
    return matchesBatch && matchesArchiveState && matchesLowStock;
  });

  const filteredExpenses = contextExpenses.filter(exp => {
    const matchesCategory = expenseCategoryFilter === 'ALL' || exp.category === expenseCategoryFilter;
    const query = expenseSearch.trim().toLowerCase();
    const matchesSearch = !query ||
      String(exp.title || '').toLowerCase().includes(query) ||
      String(exp.notes || '').toLowerCase().includes(query) ||
      String(exp.category || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const filteredExpensesTotal = filteredExpenses.reduce((acc, exp) => acc + (parseFloat(exp.amount) || 0), 0);

  const storefrontFilteredProducts = products.filter(p => {
    if (p.is_archived || parseInt(p.quantity) < 1) return false;
    if (storefrontBranch === '') {
      return !p.branch_id || p.branch_id === '';
    }
    return String(p.branch_id || '') === String(storefrontBranch);
  });

  const hqProductsForTransfer = products.filter(p => (!p.branch_id || p.branch_id === '') && !p.is_archived && parseInt(p.quantity) > 0);
  const activeSelectedArray = Object.values(selectedBatchItems).filter(i => i.selected);

  const getBranchNameById = (branchId) => {
    if (!branchId) return 'Main HQ';
    const found = branches.find(b => String(b.id) === String(branchId));
    return found ? found.name : 'Branch';
  };

  return (
    <div className="bg-[#f8fafc] text-slate-900 font-sans p-4 sm:p-6 lg:p-8 min-h-screen selection:bg-slate-900 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER NAVIGATION */}
        {isAdmin ? (
          <div className="flex flex-col gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setActiveTab('inventory')} 
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all duration-200 cursor-pointer ${
                    activeTab === 'inventory' 
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Boxes className="w-4 h-4 text-emerald-400" /> 
                  <span>Inventory</span>
                </button>

                <button 
                  onClick={() => setActiveTab('customers')} 
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all duration-200 cursor-pointer ${
                    activeTab === 'customers' 
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <UsersRound className="w-4 h-4 text-blue-400" /> 
                  <span>Sales Ledger</span>
                </button>

                <button 
                  onClick={() => setActiveTab('expenses')} 
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all duration-200 cursor-pointer ${
                    activeTab === 'expenses' 
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-4 h-4 text-rose-400" /> 
                  <span>Expenses</span>
                </button>

                <button 
                  onClick={() => setActiveTab('storefront')} 
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all duration-200 cursor-pointer ${
                    activeTab === 'storefront' 
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-4 h-4 text-indigo-400" /> 
                  <span>Storefront</span>
                </button>

                <button 
                  onClick={() => setActiveTab('staff')} 
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all duration-200 cursor-pointer ${
                    activeTab === 'staff' 
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <UserCog className="w-4 h-4 text-amber-400" /> 
                  <span>Staff</span>
                </button>

                <button 
                  onClick={() => setActiveTab('branches')} 
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all duration-200 cursor-pointer ${
                    activeTab === 'branches' 
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-purple-400" /> 
                  <span>Branches & HQ</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* CRITICAL OUT-OF-STOCK ALERT BUTTON (0) */}
                <button 
                  onClick={() => {
                    setActiveTab('inventory');
                    setShowLowStockOnly(prev => !prev);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all duration-200 cursor-pointer ${
                    hasLowStock 
                      ? (showLowStockOnly 
                          ? 'bg-rose-700 text-white ring-2 ring-rose-400' 
                          : 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300')
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={hasLowStock ? `${lowStockProducts.length} product(s) out of stock (0)` : 'No products at 0 stock'}
                >
                  <ShieldAlert className={`w-4 h-4 ${hasLowStock ? 'text-amber-200 animate-bounce' : 'text-slate-400'}`} />
                  <span>
                    {showLowStockOnly 
                      ? `Out of Stock: ${lowStockProducts.length}` 
                      : `Critical (0): ${lowStockProducts.length}`}
                  </span>
                </button>

                {/* BRANCH FILTER DROPDOWN */}
                <div className="flex items-center gap-2 border border-slate-200 px-3.5 py-2 rounded-xl bg-slate-50/80 shadow-sm">
                  <ListFilter className="w-4 h-4 text-slate-400" />
                  <select 
                    value={viewingBranch} 
                    onChange={(e) => setViewingBranch(e.target.value)} 
                    className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">HQ Main Stock (Default)</option>
                    <option value="ALL">Global View (All Branches)</option>
                    <option value="divider" disabled>──────────</option>
                    {branches.map(b => <option key={b.id} value={b.id}>View: {b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-slate-900" /> Staff Portal — {currentUser.full_name}
            </h2>
            <span className="text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-full text-blue-700 border border-blue-100">
              {branches.find(b => b.id === currentUser.branch_id)?.name || 'HQ / Main'}
            </span>
          </div>
        )}

        {/* FINANCIAL METRICS */}
        {isAdmin && (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-400" /> Financial Performance & Dashboards (Expenses Deducted)
              </span>
              <button
                onClick={handleToggleFinancialVisibility}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-all duration-200 border border-slate-200/80 shadow-sm cursor-pointer active:scale-95"
              >
                {showFinancials ? (
                  <>
                    <EyeOff className="w-4 h-4 text-rose-500" />
                    <span>Hide figures</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>Show figures (PIN required)</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Asset Cost</p>
                <p className="text-sm sm:text-base font-black text-slate-900 mt-1.5 tracking-tight">{formatMoney(totalInventoryCost)}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Expected Revenue</p>
                <p className="text-sm sm:text-base font-black text-indigo-600 mt-1.5 tracking-tight">{formatMoney(totalExpectedRevenue)}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Stock Value</p>
                <p className="text-sm sm:text-base font-black text-emerald-600 mt-1.5 tracking-tight">{formatMoney(totalPotentialRetail)}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">COGS (Sold Cost)</p>
                <p className="text-sm sm:text-base font-black text-purple-600 mt-1.5 tracking-tight">{formatMoney(totalGoodsSoldCost)}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Total Sales (Rev)</p>
                <p className="text-sm sm:text-base font-black text-blue-600 mt-1.5 tracking-tight">{formatMoney(totalSalesRevenue)}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 border-t-4 border-t-amber-500">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Total Expenses</p>
                <p className="text-sm sm:text-base font-black text-amber-700 mt-1.5 tracking-tight">{formatMoney(totalExpenses)}</p>
              </div>

              <div className={`bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 border-t-4 ${netBusinessProfit >= 0 ? 'border-t-emerald-500' : 'border-t-rose-600'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Profit (After Exp.)</p>
                <p className={`text-sm sm:text-base font-black mt-1.5 tracking-tight ${netBusinessProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatMoney(netBusinessProfit)}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 border-t-4 border-t-rose-500">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Outstanding Debts</p>
                <p className="text-sm sm:text-base font-black text-rose-600 mt-1.5 tracking-tight">{formatMoney(totalOutstandingDebt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: BRANCHES & HQ MANAGEMENT */}
        {isAdmin && activeTab === 'branches' && (
          <BranchManagement 
            branches={branches}
            branchName={branchName}
            setBranchName={setBranchName}
            branchLocation={branchLocation}
            setBranchLocation={setBranchLocation}
            editingBranch={editingBranch}
            setEditingBranch={setEditingBranch}
            handleSaveBranch={handleSaveBranch}
            handleDeleteBranch={handleDeleteBranch} 
            staffList={staffList}                   
            handleReassignStaff={handleReassignStaff} 
          />
        )}

        {/* TAB 2: INVENTORY MANAGEMENT */}
        {isAdmin && activeTab === 'inventory' && (
          <InventoryManagement 
            branches={branches}
            productBranch={productBranch}
            setProductBranch={setProductBranch}
            name={name}
            setName={setName}
            description={description}           
            setDescription={setDescription}     
            batch={batch}
            setBatch={setBatch}
            costPrice={costPrice}
            setCostPrice={setCostPrice}
            price={price}
            setPrice={setPrice}
            initialQuantity={initialQuantity}
            setInitialQuantity={setInitialQuantity}
            quantity={quantity}
            setQuantity={setQuantity}
            setImageFile={setImageFile}
            handleSaveProduct={handleSaveProduct}
            uploading={uploading}
            editingProduct={editingProduct}
            handleCancelEditProduct={handleCancelEditProduct}
            handleOpenBatchTransfer={handleOpenBatchTransfer}
            handleOpenTransferHistory={handleOpenTransferHistory}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            selectedBatchFilter={selectedBatchFilter}
            setSelectedBatchFilter={setSelectedBatchFilter}
            uniqueBatches={uniqueBatches}
            filteredProducts={filteredProducts}
            handleUpdateStockVolume={handleUpdateStockVolume}
            handleStartEditProduct={handleStartEditProduct}
            handleArchiveProduct={handleArchiveProduct}
            supabase={supabase}
            verifyAdminPinBeforeAction={verifyAdminPinBeforeAction}
            setProducts={setProducts}
          />
        )}

        {/* TAB 3: SALES LEDGER */}
        {activeTab === 'customers' && (
          <SalesLedger 
            products={contextProducts}
            customers={contextCustomers}
            fetchProducts={fetchProducts}
            fetchCustomers={fetchCustomersFromSupabase}
            supabase={supabase}
            currentUser={currentUser}
            activeBranchId={activeBranchId} 
          />
        )}

        {/* TAB 3B: EXPENSES & FINANCIAL REVIEW */}
        {isAdmin && activeTab === 'expenses' && (
          <div className="space-y-6">
            {/* Financial Impact Overview Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gross Sales Revenue</p>
                  <p className="text-xl font-black text-blue-600 mt-1">{formatMoney(totalSalesRevenue)}</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Deducted Expenses</p>
                  <p className="text-xl font-black text-amber-700 mt-1">-{formatMoney(totalExpenses)}</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Position (Sales - COGS - Exp.)</p>
                  <p className={`text-xl font-black mt-1 ${netBusinessProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatMoney(netBusinessProfit)}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${netBusinessProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  <Scale className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Expense Entry Form */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm h-fit">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-rose-500" />
                  Record New Expense
                </h3>

                <form onSubmit={handleAddExpense} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Expense Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Shop Generator Fuel, Packaging Cartons"
                      value={expenseTitle}
                      onChange={(e) => setExpenseTitle(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Amount (#)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-all font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Category</label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-all font-medium cursor-pointer"
                      >
                        {EXPENSE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Branch / HQ</label>
                      <select
                        value={expenseBranchId}
                        onChange={(e) => setExpenseBranchId(e.target.value)}
                        className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-all font-medium cursor-pointer"
                      >
                        <option value="">Main Headquarters (HQ)</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Notes / Receipt Reference (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Receipt number, vendor name, or payment details..."
                      value={expenseNotes}
                      onChange={(e) => setExpenseNotes(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-all font-medium resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingExpense}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl uppercase tracking-wide shadow-md shadow-slate-900/10 transition-all cursor-pointer active:scale-95"
                  >
                    {savingExpense ? 'Recording Expense...' : 'Save & Deduct Expense'}
                  </button>
                </form>
              </div>

              {/* Expenses Review Ledger */}
              <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Expenses Review Ledger ({filteredExpenses.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Filtered Total: <span className="font-bold text-rose-600">{formatMoney(filteredExpensesTotal)}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search expenses..."
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      className="border border-slate-200 px-3 py-1.5 text-xs rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white"
                    />
                    <select
                      value={expenseCategoryFilter}
                      onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                      className="border border-slate-200 px-3 py-1.5 text-xs rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="ALL">All Categories</option>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Receipt className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No expenses found for the current filter</p>
                    <p className="text-[11px] text-slate-400 mt-1">Use the form on the left to record a new business expense.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-100">
                        <tr>
                          <th className="p-3 font-bold text-slate-500 uppercase text-[10px]">Date</th>
                          <th className="p-3 font-bold text-slate-500 uppercase text-[10px]">Expense & Notes</th>
                          <th className="p-3 font-bold text-slate-500 uppercase text-[10px]">Category</th>
                          <th className="p-3 font-bold text-slate-500 uppercase text-[10px]">Branch</th>
                          <th className="p-3 font-bold text-slate-500 uppercase text-[10px] text-right">Amount</th>
                          <th className="p-3 font-bold text-slate-500 uppercase text-[10px] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {exp.expense_date || (exp.created_at ? new Date(exp.created_at).toISOString().split('T')[0] : '—')}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{exp.title}</p>
                              {exp.notes && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{exp.notes}</p>}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                                <Tag className="w-3 h-3 text-slate-400" />
                                {exp.category || 'General'}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap text-slate-600 font-medium">
                              {getBranchNameById(exp.branch_id)}
                            </td>
                            <td className="p-3 whitespace-nowrap text-right font-black text-rose-600">
                              -{formatMoney(exp.amount)}
                            </td>
                            <td className="p-3 whitespace-nowrap text-right">
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                                title="Delete expense (Admin PIN required)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STOREFRONT PREVIEW & GLOBAL STORE CONTROL */}
        {isAdmin && activeTab === 'storefront' && (
          <div className="space-y-6">
            
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-500/30 shadow-sm bg-gradient-to-r from-emerald-50/40 via-white to-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-emerald-950 flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-emerald-600" />
                    Public Storefront Configuration
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Select the branch whose stock will be <span className="font-bold text-emerald-700">currently visible</span> to your customers on the public link. (Admin PIN required)
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm min-w-[240px]">
                   <div className="flex flex-col w-full">
                     <span className="text-[10px] uppercase font-black text-slate-400">Active Online Branch</span>
                     <select 
                       value={liveStoreBranch}
                       onChange={(e) => handleUpdateLiveBranch(e.target.value)}
                       className="text-sm font-bold text-slate-900 bg-transparent outline-none cursor-pointer w-full mt-0.5"
                     >
                       <option value="">Main Headquarters (HQ)</option>
                       {branches.map(b => (
                         <option key={b.id} value={b.id}>{b.name}</option>
                       ))}
                     </select>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Public Storefront Catalogue Preview
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View items currently displayed to customers for the selected branch.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select 
                    value={storefrontBranch}
                    onChange={(e) => setStorefrontBranch(e.target.value)}
                    className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer w-full sm:w-auto"
                  >
                    <option value="">Preview: Main Headquarters (HQ)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>Preview: {b.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      const url = window.location.origin;
                      navigator.clipboard.writeText(url);
                      alert("Store link copied to clipboard!");
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer active:scale-95"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              {storefrontFilteredProducts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">No products available in this branch</p>
                  <p className="text-xs text-slate-500 mt-1">Add stock or transfer items to this branch to display them.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {storefrontFilteredProducts.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col group">
                      <div className="h-48 bg-slate-100 relative overflow-hidden">
                        <img 
                          src={product.image_url || 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&q=80'} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2.5 right-2.5 bg-slate-900/75 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full">
                          Stock: {product.quantity}
                        </span>
                      </div>
                      <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{product.name}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{product.description || 'No description provided.'}</p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Ref: {product.batch_reference || 'N/A'}</span>
                          <span className="text-sm font-black text-emerald-600">#{(product.price || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: STAFF MANAGEMENT */}
        {isAdmin && activeTab === 'staff' && (
          <StaffManagement 
            supabase={supabase}
            branches={branches}
            staffList={staffList}
            fetchStaffFromSupabase={fetchStaffFromSupabase}
            verifyAdminPinBeforeAction={verifyAdminPinBeforeAction}
            staffName={staffName}
            setStaffName={setStaffName}
            staffPin={staffPin}
            setStaffPin={setStaffPin}
            staffRole={staffRole}
            setStaffRole={setStaffRole}
            staffBranch={staffBranch}
            setStaffBranch={setStaffBranch}
            editingStaff={editingStaff}
            setEditingStaff={setEditingStaff}
            handleSaveStaff={handleSaveStaff}
            handleToggleStaffStatus={handleToggleStaffStatus}
            handleStartEditStaff={handleStartEditStaff}
          />
        )}
      </div>

      {/* MULTI-PRODUCT BATCH TRANSFER MODAL */}
      <BatchTransferModal 
        batchTransferOpen={batchTransferOpen}
        setBatchTransferOpen={setBatchTransferOpen}
        batchTransferStep={batchTransferStep}
        setBatchTransferStep={setBatchTransferStep}
        batchTransferError={batchTransferError}
        hqProductsForTransfer={hqProductsForTransfer}
        selectedBatchItems={selectedBatchItems}
        handleToggleBatchItemSelect={handleToggleBatchItemSelect}
        handleUpdateBatchItemDetail={handleUpdateBatchItemDetail}
        branches={branches}
        activeSelectedArray={activeSelectedArray}
        handleProceedToBatchReview={handleProceedToBatchReview}
        handleConfirmBatchTransfer={handleConfirmBatchTransfer}
        batchTransferLoading={batchTransferLoading}
      />

      {/* TRANSFER HISTORY & RECEIPTS MODAL */}
      <TransferHistoryModal 
        isOpen={transferHistoryOpen}
        onClose={() => setTransferHistoryOpen(false)}
        transferLogs={transferLogs}
        branches={branches}
      />

      {/* SECURE ADMIN PIN MODAL */}
      {adminPinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Admin Security</h3>
                <p className="text-xs text-slate-500 mt-1">Enter your PIN code (6 digits) to confirm this secure action:</p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
              const verifyingAdmin = staffList.find(s => s.pin_code === adminPinInput && s.role === 'admin' && s.is_active);
              if (!verifyingAdmin) {
                setAdminPinError("Incorrect PIN code or insufficient privileges.");
                return;
              }
              setAdminPinModalOpen(false);
              const resolver = adminPinResolve;
              setAdminPinResolve(null);
              setTimeout(() => {
                if (resolver) resolver(true);
              }, 100);
            }} className="space-y-4">
              <div>
                <input 
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    if (adminPinError) setAdminPinError('');
                  }}
                  placeholder="••••••"
                  maxLength={6}
                  autoFocus
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-center text-2xl tracking-[0.4em] font-mono font-bold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all shadow-sm"
                />
                {adminPinError && (
                  <p className="text-xs text-rose-600 mt-2 font-bold text-center">{adminPinError}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminPinModalOpen(false);
                    const resolver = adminPinResolve;
                    setAdminPinResolve(null);
                    if (resolver) resolver(false);
                  }}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-slate-900/20 transition-all cursor-pointer active:scale-95"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}