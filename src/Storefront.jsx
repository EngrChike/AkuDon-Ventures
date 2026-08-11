import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { ShoppingCart, Smartphone, Star, Heart, Video, Search, X, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const shuffleArray = (array) => {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Storefront() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const WHATSAPP_NUMBER = '+2349032690028'; 
  const FACEBOOK_URL = 'https://facebook.com/profile.php?id=61590626370497'; 
  const TIKTOK_URL = 'https://tiktok.com/@your-profile'; 

  useEffect(() => {
    fetchProducts();
    logPageVisit();
  }, []);

  // NEW LOGIC: Page Visit Tracking
  const logPageVisit = async () => {
    if (sessionStorage.getItem('akudon_visited')) return; 

    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      
      await supabase.from('page_visits').insert([{
        ip_address: data.ip,
        city: data.city,
        country: data.country_name
      }]);
      
      sessionStorage.setItem('akudon_visited', 'true');
    } catch (err) {
      console.warn("Analytics tracking bypassed due to adblocker or network issue.");
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (!error && data) {
        setProducts(shuffleArray(data));
      }
    } catch (err) {
      console.error("Fetch Error: ", err);
    }
  };

  const addToCart = (product) => {
    const stockAvailable = product.quantity !== null ? product.quantity : (product.stock_status ? 999 : 0);
    if (stockAvailable <= 0) return;

    setCart(curr => {
      const found = curr.find(item => item.id === product.id);
      if (found) {
        return curr.map(item => item.id === product.id ? { ...item, quantity: item.quantity < stockAvailable ? item.quantity + 1 : item.quantity } : item);
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

  // NEW LOGIC: Database insertion before WhatsApp
  const handleWhatsAppCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    try {
      // 1. Create the Order Record
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ total_amount: cartTotal }])
        .select()
        .single();

      if (!orderError && orderData) {
        // 2. Create the Order Items linked to the Order ID
        const orderItems = cart.map(item => ({
          order_id: orderData.id,
          product_id: item.id,
          quantity: item.quantity,
          price_at_purchase: item.price
        }));
        await supabase.from('order_items').insert(orderItems);
      }
    } catch (error) {
      console.error("Order logging failed, proceeding to WhatsApp anyway:", error);
    }

    // 3. Construct WhatsApp Message and Redirect
    let msg = '✨ *AKUDON VENTURE - NEW ORDER* ✨\n------------------------------------------\n\n';
    cart.forEach((item, idx) => {
      msg += `🛍️ *${idx + 1}. ${item.name}*\n  Price: #${item.price.toLocaleString()}\n  Qty: ${item.quantity}\n------------------------------------------\n`;
    });
    msg += `\n🎯 *GRAND TOTAL:* #${cartTotal.toLocaleString()}\n\nConfirming availability for immediate dispatch!`;
    
    setIsCheckingOut(false);
    setIsCartOpen(false);
    setCart([]); // Clear cart locally
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredProducts = products.filter(product => {
    const pName = product.name ? product.name.toLowerCase() : '';
    const pDesc = product.description ? product.description.toLowerCase() : '';
    const query = searchTerm.toLowerCase();
    return pName.includes(query) || pDesc.includes(query);
  });

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 font-sans antialiased relative">
      
      {/* RESTORED: MOBILE & LAPTOP ANIMATION STYLES */}
      <style>{`
        @keyframes mobileBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .mobile-alive-img {
          animation: mobileBreathe 8s infinite ease-in-out;
        }
        @media (min-width: 768px) {
          .mobile-alive-img {
            animation: none;
          }
        }
      `}</style>

      <header className="bg-white text-black sticky top-0 z-40 shadow-sm border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2.5 cursor-pointer shrink-0 group select-none">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md p-1.5">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
                <path d="M30 25 C30 25, 45 15, 50 15 C55 15, 70 25, 70 25 C70 45, 60 75, 50 85 C40 75, 30 45, 30 25 Z" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="50" cy="42" r="7" fill="currentColor" />
                <path d="M40 60 C45 65, 55 65, 60 60" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-black text-base sm:text-xl tracking-wider uppercase text-zinc-900 leading-none">AKUDON VENTURES</span>
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-500 tracking-[0.25em] uppercase leading-tight mt-0.5">COSMETICS</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 ml-auto">
            <div className="flex items-center space-x-1 sm:space-x-2 border-r border-gray-200 pr-2 sm:pr-4 shrink-0">
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-green-50 text-green-600">
                <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
              <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">f</a>
              <a href={TIKTOK_URL} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-zinc-50 text-zinc-900">
                <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            </div>

            <button onClick={() => navigate('/admin')} className="px-2 py-1.5 text-xs rounded-xl font-bold border border-gray-200 text-gray-700 flex items-center space-x-1 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-[#f68b1e]" />
              <span className="hidden md:inline">Admin Portal</span>
            </button>

            <button onClick={() => setIsCartOpen(true)} className="relative bg-black text-white p-2.5 rounded-xl flex items-center space-x-2 shrink-0">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="bg-[#f68b1e] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-4 md:py-8">
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950 text-white rounded-2xl p-6 md:p-8 mb-6 border border-zinc-800 flex flex-col md:flex-row justify-between items-center">
          <div>
            <span className="bg-[#f68b1e]/10 text-[#f68b1e] text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-[#f68b1e]/20 inline-block">✨ Best Store Experience</span>
            <h1 className="text-xl md:text-3xl font-black mt-2.5 tracking-tight">AKUDON VENTURES</h1>
            <p className="text-zinc-400 text-xs mt-1">Select your items and place your order instantly via WhatsApp.</p>
          </div>
        </div>

        <div className="max-w-md mx-auto mb-8 relative px-1">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search for items, brands, cleansers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white text-sm text-black border border-gray-200 pl-10 pr-10 py-2.5 rounded-xl focus:outline-none focus:border-[#f68b1e]"
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 p-1 rounded-full text-gray-400"><X className="w-3.5 h-3.5" /></button>}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {filteredProducts.map((p) => {
            const itemQtyInCart = getProductCartQty(p.id);
            const isOutOfStock = p.quantity !== null ? p.quantity <= 0 : !p.stock_status;

            return (
              <div 
                key={p.id} 
                className="bg-white rounded-xl border border-gray-200/60 overflow-hidden flex flex-col justify-between group md:hover:shadow-2xl md:hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 relative cursor-pointer"
              >
                {/* Heart Icon */}
                <button className="absolute top-2 right-2 z-20 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-gray-400 md:hover:text-red-500 active:text-red-500 active:scale-110 md:hover:scale-110 transition-all duration-300">
                  <Heart className="w-3.5 h-3.5" />
                </button>

                <div className="relative bg-gray-50 aspect-[4/5] w-full overflow-hidden flex items-center justify-center border-b border-gray-100">
                  
                  {/* Image scaling & mobile breathing animation restored */}
                  <img 
                    src={p.image_url} 
                    alt={p.name} 
                    className="object-cover w-full h-full transition-transform duration-700 ease-out md:group-hover:scale-110 mobile-alive-img" 
                  />
                  
                  {/* Gradient overlay for luxury depth on desktop hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-700 z-10 pointer-events-none"></div>

                  <div className="absolute bottom-2 left-2 z-20 transition-transform duration-500 md:group-hover:-translate-y-1">
                    <span className="bg-[#f68b1e] text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-lg">
                      {p.quantity > 0 ? `${p.quantity} Items Left` : 'Out of Stock'}
                    </span>
                  </div>

                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                      <span className="bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded shadow-xl">SOLD OUT</span>
                    </div>
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between bg-white relative z-20">
                  <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="font-extrabold text-xs text-zinc-900 md:group-hover:text-[#f68b1e] transition-colors duration-300">AKUDON</span>
                      <span className="text-blue-500 text-[10px] font-bold">✔</span>
                    </div>
                    <h3 className="text-xs text-gray-600 line-clamp-2 min-h-[2rem] leading-tight font-medium">
                      {p.name} {p.description && `• ${p.description}`}
                    </h3>
                    
                    {/* Rating Stars */}
                    <div className="flex items-center space-x-1 mt-1.5">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">(4.9)</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm font-black text-[#f68b1e] tracking-tight">#{p.price.toLocaleString()}</p>
                    <div className="mt-2.5">
                      {isOutOfStock ? (
                        <button disabled className="w-full bg-gray-100 text-gray-400 text-[11px] font-bold py-1.5 rounded-lg cursor-not-allowed">Out of Stock</button>
                      ) : itemQtyInCart > 0 ? (
                        <div className="flex items-center justify-between border border-[#f68b1e] rounded-lg overflow-hidden bg-white h-7 shadow-sm">
                          <button onClick={(e) => { e.stopPropagation(); changeQuantity(p, -1); }} className="bg-[#f68b1e]/5 text-[#f68b1e] active:bg-[#f68b1e]/20 md:hover:bg-[#f68b1e]/10 transition-colors w-8 h-full flex items-center justify-center font-bold">-</button>
                          <span className="w-full text-center text-xs font-black text-black">{itemQtyInCart}</span>
                          <button onClick={(e) => { e.stopPropagation(); changeQuantity(p, 1); }} className="bg-[#f68b1e]/5 text-[#f68b1e] active:bg-[#f68b1e]/20 md:hover:bg-[#f68b1e]/10 transition-colors w-8 h-full flex items-center justify-center font-bold">+</button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); addToCart(p); }} 
                          className="w-full bg-[#f68b1e] md:hover:bg-[#e07a16] text-white font-bold py-1.5 rounded-lg text-xs tracking-wide transition-all duration-300 active:scale-95 shadow-md md:hover:shadow-lg"
                        >
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
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50">
          <div className="w-full max-w-sm bg-white h-full p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-bold text-gray-900 uppercase text-xs">Your Bag ({cartCount})</h3>
                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 text-xl">&times;</button>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[75vh]">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border">
                    <div className="flex items-center space-x-2.5">
                      <img src={item.image_url} alt="" className="w-10 h-10 object-cover rounded bg-white border" />
                      <div>
                        <h4 className="text-xs font-bold line-clamp-1">{item.name}</h4>
                        <p className="text-xs font-bold text-[#f68b1e]">#{item.price.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-white border rounded p-0.5">
                      <button onClick={() => changeQuantity(item, -1)} className="px-2 font-bold">-</button>
                      <span className="text-xs font-bold px-1">{item.quantity}</span>
                      <button onClick={() => changeQuantity(item, 1)} className="px-2 font-bold">+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {cart.length > 0 && (
              <div className="border-t pt-3">
                <div className="flex justify-between items-baseline font-bold mb-3">
                  <span className="text-gray-400 text-xs uppercase">Total:</span>
                  <span className="text-lg font-black">#{cartTotal.toLocaleString()}</span>
                </div>
                <button 
                  onClick={handleWhatsAppCheckout} 
                  disabled={isCheckingOut}
                  className="w-full bg-green-600 md:hover:bg-green-700 transition-colors text-white py-3 rounded-xl font-bold text-xs uppercase text-center shadow-lg"
                >
                  {isCheckingOut ? 'Processing...' : 'Order via WhatsApp'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}