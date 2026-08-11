import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft, Trash2, Pencil, CheckCircle, XCircle, Package, Activity, ShoppingBag } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Dashboard State
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders' | 'analytics'
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState([]);

  // Product Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAllData();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAllData();
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAllData = () => {
    fetchProducts();
    fetchOrders();
    fetchAnalytics();
  };

  // --- DATA FETCHING ---
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  };

  const fetchOrders = async () => {
    // Joins orders with their specific items and product names
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, status, total_amount, created_at,
        order_items ( quantity, price_at_purchase, products ( name ) )
      `)
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const fetchAnalytics = async () => {
    const { data } = await supabase.from('page_visits').select('*').order('visited_at', { ascending: false });
    if (data) setAnalytics(data);
  };

  // --- AUTHENTICATION ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (error) alert(error.message);
    setAuthLoading(false);
  };

  // --- ORDER MANAGEMENT (RECEIPTS) ---
  const handleCompleteOrder = async (orderId) => {
    if (!window.confirm("Mark as Complete? This will automatically deduct the items from stock.")) return;
    
    // Call the SQL Function provided earlier
    const { error } = await supabase.rpc('complete_order', { target_order_id: orderId });
    if (!error) {
      alert("Order completed and stock updated!");
      fetchAllData(); // Refresh UI
    } else {
      alert(`Error completing order: ${error.message}`);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Cancel this order? Stock will remain unchanged.")) return;
    
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    if (!error) fetchOrders();
  };

  // --- PRODUCT MANAGEMENT (PRE-EXISTING LOGIC MOVED HERE) ---
  const cancelEdit = () => { setEditingProduct(null); setName(''); setPrice(''); setQuantity(''); setDescription(''); setImageFile(null); };
  const startEditProduct = (p) => { setEditingProduct(p); setName(p.name); setPrice(p.price); setQuantity(p.quantity); setDescription(p.description || ''); };
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete item?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setUploading(true);
    let image_url = editingProduct ? editingProduct.image_url : 'https://via.placeholder.com/400';

    if (imageFile) {
      const fileName = `${Date.now()}_${imageFile.name}`;
      const { error: upErr } = await supabase.storage.from('product-images').upload(fileName, imageFile);
      if (!upErr) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        image_url = data.publicUrl;
      }
    }

    const payload = { name, description, price: parseFloat(price), image_url, quantity: parseInt(quantity) || 0, stock_status: parseInt(quantity) > 0 };

    if (editingProduct) {
      await supabase.from('products').update(payload).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert([payload]);
    }
    
    cancelEdit();
    fetchProducts();
    setUploading(false);
  };

  // --- RENDER ---
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border p-6 shadow-sm">
          <h2 className="text-lg font-bold text-center mb-4">Admin Portal Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs bg-white" required />
            <input type="password" placeholder="Password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs bg-white" required />
            <button type="submit" disabled={authLoading} className="w-full bg-zinc-950 text-white text-xs font-bold py-2.5 rounded-xl">Sign In</button>
            <button type="button" onClick={() => navigate('/')} className="w-full text-xs text-gray-500 font-bold mt-2">← Back to Shop</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Navigation */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border mb-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-black flex items-center space-x-1 text-xs font-bold"><ArrowLeft className="w-4 h-4"/> <span>Store</span></button>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex space-x-2">
              <button onClick={() => setActiveTab('products')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 ${activeTab === 'products' ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}`}><Package className="w-4 h-4"/><span>Inventory</span></button>
              <button onClick={() => setActiveTab('orders')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 ${activeTab === 'orders' ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}`}><ShoppingBag className="w-4 h-4"/><span>Orders</span></button>
              <button onClick={() => setActiveTab('analytics')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 ${activeTab === 'analytics' ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}`}><Activity className="w-4 h-4"/><span>Analytics</span></button>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-red-500 text-xs font-bold flex items-center space-x-1"><LogOut className="w-4 h-4"/><span>Logout</span></button>
        </div>

        {/* INVENTORY TAB */}
        {activeTab === 'products' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border h-fit">
              <h3 className="font-bold text-xs uppercase tracking-wide border-b pb-2 mb-4">{editingProduct ? 'Update Product' : 'Add Product'}</h3>
              <form onSubmit={handleSaveProduct} className="space-y-3">
                <input type="text" placeholder="Title" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 text-xs rounded-lg" required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} className="w-full border p-2 text-xs rounded-lg" required />
                  <input type="number" placeholder="Stock" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border p-2 text-xs rounded-lg" required />
                </div>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full text-xs" />
                <button type="submit" disabled={uploading} className="w-full bg-[#f68b1e] text-white text-xs py-2 rounded-lg font-bold">{uploading ? 'Processing...' : 'Save'}</button>
                {editingProduct && <button type="button" onClick={cancelEdit} className="w-full text-xs text-red-500 font-bold mt-2">Cancel</button>}
              </form>
            </div>
            <div className="md:col-span-2 bg-white p-5 rounded-xl border overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead><tr className="bg-gray-50 border-b"><th className="p-2">Item</th><th className="p-2">Price</th><th className="p-2">Stock</th><th className="p-2">Action</th></tr></thead>
                <tbody className="divide-y">
                  {products.map(p => (
                    <tr key={p.id}>
                      <td className="p-2 flex items-center space-x-2">
                        {/* Restored thumbnail image */}
                        <img src={p.image_url} alt="" className="w-8 h-8 object-cover rounded border" />
                        <span className="font-bold text-gray-900 line-clamp-1">{p.name}</span>
                      </td>
                      <td className="p-2">#{p.price.toLocaleString()}</td>
                      <td className="p-2">{p.quantity}</td>
                      <td className="p-2 flex space-x-2">
                        <button onClick={() => startEditProduct(p)} className="text-gray-500"><Pencil className="w-4 h-4"/></button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="bg-white p-5 rounded-xl border">
            <h3 className="font-bold text-xs uppercase mb-4">Customer Orders & Receipts</h3>
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50">
                  <div className="mb-4 md:mb-0">
                    <p className="text-[10px] text-gray-500 mb-1">Order Date: {new Date(order.created_at).toLocaleString()}</p>
                    <ul className="text-xs font-medium space-y-1">
                      {order.order_items.map((item, idx) => (
                        <li key={idx}>• {item.quantity}x {item.products?.name || 'Unknown Item'}</li>
                      ))}
                    </ul>
                    <p className="text-sm font-black mt-2">Total: #{order.total_amount.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded mb-2 uppercase ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.status}
                    </span>
                    {order.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button onClick={() => handleCompleteOrder(order.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1"><CheckCircle className="w-3.5 h-3.5"/><span>Complete</span></button>
                        <button onClick={() => handleCancelOrder(order.id)} className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1"><XCircle className="w-3.5 h-3.5"/><span>Cancel</span></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-xs text-gray-500 text-center py-6">No orders tracked yet.</p>}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="bg-white p-5 rounded-xl border">
             <h3 className="font-bold text-xs uppercase mb-4 border-b pb-2">Page Visit Tracking</h3>
             <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead><tr className="bg-gray-50 border-b"><th className="p-2">Date/Time</th><th className="p-2">Location</th><th className="p-2">IP Address</th></tr></thead>
                <tbody className="divide-y">
                  {analytics.map(visit => (
                    <tr key={visit.id}>
                      <td className="p-2">{new Date(visit.visited_at).toLocaleString()}</td>
                      <td className="p-2 font-bold text-blue-600">{visit.city}, {visit.country}</td>
                      <td className="p-2 font-mono text-gray-500">{visit.ip_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analytics.length === 0 && <p className="text-xs text-gray-500 text-center py-6">No visitors logged yet.</p>}
             </div>
          </div>
        )}

      </div>
    </div>
  );
}