import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { ShoppingCart, ShoppingBag, ShieldCheck, Smartphone, Star, Heart, Trash2, Video, Search, X } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('client'); 
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // NEW SEARCH ENGINE STATE
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // YOUR OFFICIAL LINKS & HANDLES
  const WHATSAPP_NUMBER = '2250100130109'; // Replace with your WhatsApp number
  const FACEBOOK_URL = 'https://facebook.com/your-profile'; // Replace with your Facebook link
  const TIKTOK_URL = 'https://tiktok.com/@your-profile'; // Replace with your TikTok link
  
  const ADMIN_SECRET_PASSPHRASE = 'DonChike2026';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setProducts(data);
    } catch (err) {
      console.error("Fetch Error: ", err);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === ADMIN_SECRET_PASSPHRASE) {
      setIsAdminAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid credentials.');
    }
  };

  const addToCart = (product) => {
    const stockAvailable = product.quantity !== null ? product.quantity : (product.stock_status ? 999 : 0);
    if (stockAvailable <= 0) return;

    setCart(curr => {
      const found = curr.find(item => item.id === product.id);
      if (found) {
        return curr.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity < stockAvailable ? item.quantity + 1 : item.quantity } 
            : item
        );
      }
      return [...curr, { ...product, quantity: 1 }];
    });
  };

  const getProductCartQty = (productId) => {
    const item = cart.find(i => i.id === productId);
    return item ? item.quantity : 0;
  };

  const changeQuantity = (product, delta) => {
    const currentQty = getProductCartQty(product.id);
    const newQty = currentQty + delta;
    const stockAvailable = product.quantity !== null ? product.quantity : (product.stock_status ? 999 : 0);

    if (newQty <= 0) {
      setCart(curr => curr.filter(i => i.id !== product.id));
    } else if (newQty <= stockAvailable) {
      setCart(curr => curr.map(i => i.id === product.id ? { ...i, quantity: newQty } : i));
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    let msg = '✨ *DONCHIKE COSMETICS - NEW ORDER* ✨\n------------------------------------------\n\n';
    cart.forEach((item, idx) => {
      msg += `🛍️ *${idx + 1}. ${item.name}*\n   Price: ${item.price.toLocaleString()} CFA\n   Qty: ${item.quantity}\n------------------------------------------\n`;
    });
    msg += `\n🎯 *GRAND TOTAL:* ${cartTotal.toLocaleString()} CFA\n\nConfirming availability for immediate dispatch!`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleUpdateStockVolume = async (id, newVolume) => {
    const parsedVolume = parseInt(newVolume) || 0;
    const { error } = await supabase
      .from('products')
      .update({ 
        quantity: parsedVolume,
        stock_status: parsedVolume > 0 
      })
      .eq('id', id);

    if (!error) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: parsedVolume, stock_status: parsedVolume > 0 } : p));
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this item from listing?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!name || !price || !quantity) return;
    setUploading(true);
    
    let image_url = 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80';

    try {
      if (imageFile) {
        const cleanName = imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${Date.now()}_${cleanName}`;
        
        const { error: upErr } = await supabase.storage
          .from('product-images') 
          .upload(fileName, imageFile, { cacheControl: '3600', upsert: false });

        if (!upErr) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          if (data?.publicUrl) image_url = data.publicUrl;
        }
      }

      const parsedQty = parseInt(quantity) || 0;
      const payload = {
        name: String(name).trim(),
        description: String(description || '').trim(),
        price: parseFloat(price),
        image_url: image_url,
        quantity: parsedQty,
        stock_status: parsedQty > 0
      };

      const { error: insErr } = await supabase.from('products').insert([payload]);
      if (insErr) throw insErr;

      setName('');
      setPrice('');
      setQuantity('');
      setDescription('');
      setImageFile(null);
      
      await fetchProducts();
      alert('Product published beautifully!');
    } catch (err) {
      console.error(err);
      alert(`Database Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // REALTIME SEARCH FILTER LOGIC
  const filteredProducts = products.filter(product => {
    const pName = product.name ? product.name.toLowerCase() : '';
    const pDesc = product.description ? product.description.toLowerCase() : '';
    const query = searchTerm.toLowerCase();
    return pName.includes(query) || pDesc.includes(query);
  });

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 font-sans antialiased">
      
      {/* BRAND HEADER */}
      <header className="bg-white text-black sticky top-0 z-40 shadow-sm border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => { setView('client'); setSearchTerm(''); }}>
            <span className="bg-[#f68b1e] text-white p-2 rounded-xl shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <span className="font-black text-xl tracking-tight uppercase">
              DONCHIKE<span className="text-[#f68b1e] font-light lowercase">cosmetics</span>
            </span>
          </div>
          
          {/* Action Area */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* FIXED SOCIAL ICONS GROUP (Now completely visible on mobile) */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 border-r border-gray-200 pr-3 sm:pr-4">
              <a 
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank" 
                rel="noreferrer"
                className="p-1.5 sm:p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors flex items-center justify-center"
                title="Chat on WhatsApp"
              >
                <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>

              <a 
                href={FACEBOOK_URL} 
                target="_blank" 
                rel="noreferrer"
                className="p-1.5 sm:p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs transition-colors w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center"
                title="Follow on Facebook"
              >
                f
              </a>

              <a 
                href={TIKTOK_URL} 
                target="_blank" 
                rel="noreferrer"
                className="p-1.5 sm:p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-900 transition-colors flex items-center justify-center"
                title="Follow on TikTok"
              >
                <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            </div>

            {/* Admin Portal Toggle */}
            <button 
              onClick={() => setView(view === 'client' ? 'admin' : 'client')} 
              className="px-2.5 py-1.5 text-xs rounded-xl font-bold border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center space-x-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#f68b1e]" />
              <span className="hidden md:inline">{view === 'client' ? 'Admin Portal' : 'Back to Shop'}</span>
            </button>

            {/* Cart Button */}
            {view === 'client' && (
              <button onClick={() => setIsCartOpen(true)} className="relative bg-black text-white p-2.5 rounded-xl flex items-center space-x-2 hover:bg-zinc-800 transition-colors">
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="bg-[#f68b1e] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CLIENT APP VIEW */}
      {view === 'client' && (
        <main className="max-w-7xl w-full mx-auto p-4 md:py-8">
          
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950 text-white rounded-2xl p-6 md:p-8 mb-6 border border-zinc-800 flex flex-col md:flex-row justify-between items-center">
            <div>
              <span className="bg-[#f68b1e]/10 text-[#f68b1e] text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-[#f68b1e]/20">
                ✨ Official Store Experience
              </span>
              <h1 className="text-xl md:text-3xl font-black mt-2.5 tracking-tight">Popular Cosmetics Collection</h1>
              <p className="text-zinc-400 text-xs mt-1">Select your items and complete your order instantly via WhatsApp.</p>
            </div>
            <div className="bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 mt-4 md:mt-0">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Fast Dispatch</p>
              <p className="text-[#f68b1e] font-bold text-sm flex items-center justify-center space-x-1 mt-0.5">
                <Smartphone className="w-3.5 h-3.5" /> <span>WhatsApp Checkout</span>
              </p>
            </div>
          </div>

          {/* SEARCH BOX INTERFACE */}
          <div className="max-w-md mx-auto mb-8 relative px-1">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search for items, brands, cleansers..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white text-sm text-black border border-gray-200 pl-10 pr-10 py-2.5 rounded-xl focus:outline-none focus:border-[#f68b1e] focus:ring-1 focus:ring-[#f68b1e] transition-all shadow-xs"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                Showing results for "<span className="text-zinc-700 font-medium">{searchTerm}</span>" ({filteredProducts.length} items found)
              </p>
            )}
          </div>

          {/* SEARCH RESULTS LAYOUT TARGET */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
              <p className="text-gray-400 text-sm">No cosmetics products match your search.</p>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="mt-2 text-xs text-[#f68b1e] font-bold hover:underline">
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {filteredProducts.map((p) => {
                const itemQtyInCart = getProductCartQty(p.id);
                const isOutOfStock = p.quantity !== null ? p.quantity <= 0 : !p.stock_status;

                return (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200/60 overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:shadow-lg relative">
                    
                    <button className="absolute top-2 right-2 z-10 p-1.5 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500">
                      <Heart className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative bg-gray-50 aspect-[4/5] w-full overflow-hidden flex items-center justify-center border-b border-gray-100">
                      <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" />
                      
                      <div className="absolute bottom-2 left-2 z-10">
                        <span className="bg-[#f68b1e] text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-md">
                          {p.quantity > 0 ? `${p.quantity} Items Left` : 'Out of Stock'}
                        </span>
                      </div>

                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="bg-zinc-800 text-white font-bold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded">SOLD OUT</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between bg-white">
                      <div>
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="font-extrabold text-xs text-zinc-900 group-hover:text-[#f68b1e] transition-colors">DONCHIKE</span>
                          <span className="text-blue-500 text-[10px] font-bold">✔</span>
                        </div>
                        <h3 className="text-xs text-gray-600 line-clamp-2 min-h-[2rem] leading-tight font-medium">
                          {p.name} {p.description && `• ${p.description}`}
                        </h3>
                        
                        <div className="flex items-center space-x-1 mt-1.5">
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">(4.9)</span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm font-black text-[#f68b1e] tracking-tight">{p.price.toLocaleString()} CFA</p>

                        <div className="mt-2.5">
                          {isOutOfStock ? (
                            <button disabled className="w-full bg-gray-100 text-gray-400 text-[11px] font-bold py-1.5 rounded-lg cursor-not-allowed">
                              Out of Stock
                            </button>
                          ) : itemQtyInCart > 0 ? (
                            <div className="flex items-center justify-between border border-[#f68b1e] rounded-lg overflow-hidden bg-white h-7 shadow-sm">
                              <button onClick={() => changeQuantity(p, -1)} className="bg-[#f68b1e]/5 text-[#f68b1e] w-8 h-full flex items-center justify-center font-bold">-</button>
                              <span className="w-full text-center text-xs font-black text-black">{itemQtyInCart}</span>
                              <button onClick={() => changeQuantity(p, 1)} className="bg-[#f68b1e]/5 text-[#f68b1e] w-8 h-full flex items-center justify-center font-bold">+</button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(p)} className="w-full bg-[#f68b1e] hover:bg-[#e07a16] text-white font-bold py-1.5 rounded-lg text-xs tracking-wide transition-all">
                              Add to Cart
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ADMIN CONTROL PANEL */}
      {view === 'admin' && (
        <main className="max-w-7xl w-full mx-auto p-4 py-8">
          {!isAdminAuthenticated ? (
            <div className="max-w-sm mx-auto bg-white rounded-2xl border border-gray-200 p-6 mt-10 shadow-sm">
              <div className="text-center mb-5">
                <h2 className="text-lg font-bold text-gray-900">Protected Admin System</h2>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input type="password" placeholder="Enter passphrase..." value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs bg-white text-black font-mono" required />
                <button type="submit" className="w-full bg-zinc-950 text-white text-xs font-bold py-2.5 rounded-xl uppercase">Authorize</button>
              </form>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
                <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700 pb-2 border-b mb-4">Add New Product</h3>
                <form onSubmit={handleAddProduct} className="space-y-3.5">
                  <input type="text" placeholder="Product Title" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 text-xs rounded-lg bg-white text-black" required />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Price (CFA)" value={price} onChange={e => setPrice(e.target.value)} className="w-full border p-2 text-xs rounded-lg bg-white text-black" required />
                    <input type="number" placeholder="Stock Qty" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border p-2 text-xs rounded-lg bg-white text-black" required />
                  </div>
                  <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 text-xs rounded-lg h-14 bg-white text-black" />
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full text-xs text-gray-500" />
                  <button type="submit" disabled={uploading} className="w-full bg-[#f68b1e] text-white text-xs py-2 rounded-lg font-bold uppercase">{uploading ? 'Publishing...' : 'Publish Product'}</button>
                </form>
              </div>

              <div className="md:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700 mb-4 pb-2 border-b">Operational Catalog Controller</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 font-bold border-b">
                        <th className="p-2.5">Item Info</th>
                        <th className="p-2.5">Price</th>
                        <th className="p-2.5 text-center">In-Stock Units</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="p-2.5 flex items-center space-x-2">
                            <img src={p.image_url} alt="" className="w-8 h-8 object-cover rounded border" />
                            <span className="font-bold text-gray-900 line-clamp-1">{p.name}</span>
                          </td>
                          <td className="p-2.5 font-bold text-gray-700">{p.price.toLocaleString()} CFA</td>
                          <td className="p-2.5 text-center">
                            <input 
                              type="number" 
                              value={p.quantity !== null ? p.quantity : (p.stock_status ? 10 : 0)} 
                              onChange={(e) => handleUpdateStockVolume(p.id, e.target.value)}
                              className="w-14 border text-center p-0.5 rounded font-bold text-xs bg-white text-black"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button onClick={() => handleDeleteProduct(p.id)} className="text-gray-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </main>
      )}

      {/* CART SYSTEM */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-sm bg-white h-full p-5 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-bold text-gray-900 uppercase text-xs">Your Bag ({cartCount})</h3>
                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 text-xl font-light">&times;</button>
              </div>
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-10">Your cart is empty.</p>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[75vh]">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border">
                      <div className="flex items-center space-x-2.5">
                        <img src={item.image_url} alt="" className="w-10 h-10 object-cover rounded bg-white border" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                          <p className="text-xs font-bold text-[#f68b1e]">{item.price.toLocaleString()} CFA</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 bg-white border rounded p-0.5">
                        <button onClick={() => changeQuantity(item, -1)} className="px-1.5 text-gray-500 font-bold">-</button>
                        <span className="text-xs font-bold px-1 text-black">{item.quantity}</span>
                        <button onClick={() => changeQuantity(item, 1)} className="px-1.5 text-gray-500 font-bold">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t pt-3">
                <div className="flex justify-between items-baseline font-bold mb-3">
                  <span className="text-gray-400 text-xs uppercase">Total:</span>
                  <span className="text-lg font-black text-black">{cartTotal.toLocaleString()} CFA</span>
                </div>
                <button onClick={handleWhatsAppCheckout} className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-xs uppercase text-center block">
                  Order via WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}