import React, { useState } from 'react';
import { X, ReceiptText, Calendar, Building2, Search, Printer } from 'lucide-react';

export default function TransferHistoryModal({ isOpen, onClose, transferLogs = [], branches = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  if (!isOpen) return null;

  // Safe parser for items (handles JSON strings or raw arrays)
  const parseItems = (items) => {
    if (!items) return [];
    if (Array.isArray(items)) return items;
    if (typeof items === 'string') {
      try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const filteredLogs = transferLogs.filter(log => {
    const refMatch = (log.transfer_ref || '').toLowerCase().includes(searchQuery.toLowerCase());
    const authorMatch = (log.created_by || '').toLowerCase().includes(searchQuery.toLowerCase());
    return refMatch || authorMatch;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col justify-between space-y-4">
        
        {/* HEADER */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-zinc-900 text-amber-400 rounded-xl">
              <ReceiptText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 uppercase">
                Transfer History & Receipts
              </h3>
              <p className="text-xs text-gray-500">
                Administrative traceability of HQ dispatches to branches
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input 
            type="text" 
            placeholder="Search by reference (e.g., TRF-...) or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#0f172a]"
          />
        </div>

        {/* LOGS TABLE / RECEIPT VIEW */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {selectedReceipt ? (
            /* PRINTABLE RECEIPT CARD */
            <div className="bg-amber-50/30 p-6 rounded-2xl border border-amber-200/60 space-y-5 print:p-0">
              <div className="flex justify-between items-start border-b pb-4 border-amber-200">
                <div>
                  <h4 className="font-black text-sm text-gray-900 uppercase">Stock Transfer Slip</h4>
                  <p className="text-xs text-amber-900 font-mono font-bold mt-1">Ref: {selectedReceipt.transfer_ref}</p>
                </div>
                <div className="text-right text-xs text-gray-500 space-y-1">
                  <p className="flex items-center justify-end gap-1">
                    <Calendar className="w-3.5 h-3.5" /> 
                    {selectedReceipt.created_at ? new Date(selectedReceipt.created_at).toLocaleString() : 'Date N/A'}
                  </p>
                  <p className="font-medium">Issued by: <strong>{selectedReceipt.created_by || 'Admin'}</strong></p>
                </div>
              </div>

              <div className="border border-amber-200/80 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-100/50 font-bold text-gray-700 border-b border-amber-200">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Batch</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3">Target Branch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parseItems(selectedReceipt.items).map((item, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/20">
                        <td className="p-3 font-bold text-gray-900">{item.product_name || item.name}</td>
                        <td className="p-3 font-mono text-gray-500 uppercase">{item.batch_reference || 'N/A'}</td>
                        <td className="p-3 text-center font-black text-indigo-700">{item.qty || item.quantity} unit(s)</td>
                        <td className="p-3 font-bold text-emerald-800">🏪 {item.target_branch_name || 'Branch'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                >
                  ← Back to table
                </button>
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2 bg-zinc-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4 text-amber-400" /> Print Receipt
                </button>
              </div>
            </div>
          ) : (
            /* LOGS LIST */
            filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Building2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="font-bold text-sm">No transfer slips found</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600">
                    <tr>
                      <th className="p-3">Transfer Ref</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Author</th>
                      <th className="p-3 text-center">Total Volume</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map(log => {
                      const itemsList = parseItems(log.items);
                      const totalQty = itemsList.reduce((acc, i) => acc + (Number(i.qty || i.quantity) || 0), 0);
                      return (
                        <tr key={log.id || log.transfer_ref} className="hover:bg-gray-50">
                          <td className="p-3 font-mono font-bold text-indigo-700">{log.transfer_ref}</td>
                          <td className="p-3 text-gray-500">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : 'Date N/A'}
                          </td>
                          <td className="p-3 font-semibold text-gray-800">{log.created_by || 'Admin'}</td>
                          <td className="p-3 text-center font-black text-gray-900">{totalQty} item(s)</td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => setSelectedReceipt(log)}
                              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-900 text-amber-400 font-bold rounded-lg text-[11px]"
                            >
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
}