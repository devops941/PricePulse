import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { WeightBar, WeightBarItem } from '@/components/admin/WeightBar';
import { StatusPill } from '@/components/ui/StatusPill';
import { Skeleton, EmptyState } from '@/components/ui/FeedbackStates';
import {
  IconBasket,
  IconBuildingStore,
  IconReceipt2,
  IconUsers,
  IconHistory,
  IconPlus,
  IconCheck,
  IconChecklist
} from '@tabler/icons-react';
import { cn, formatNumberIN } from '@/lib/utils';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basket' | 'markets' | 'items' | 'users' | 'audit'>('basket');
  
  // Data states
  const [items, setItems] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [basketVersions, setBasketVersions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Basket builder state
  const [basketName, setBasketName] = useState('Essential Consumer Goods Basket v1.0');
  const [basePeriod, setBasePeriod] = useState('2025-W40');
  const [effectiveFrom, setEffectiveFrom] = useState('2026-01-01');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [basketLines, setBasketLines] = useState<{ item_id: string; weight: number; base_quantity: number }[]>([]);

  // Modals / forms
  const [showMarketForm, setShowMarketForm] = useState(false);
  const [marketForm, setMarketForm] = useState({ name: '', district: '', state: 'Tamil Nadu', type: 'retail', active: true });

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', category_id: '', canonical_unit: 'kg', min_plausible: 10, max_plausible: 200, active: true });

  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', name: '', role: 'Collector', market_ids: [] as string[] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itms, mkts, cats, bskts, logs] = await Promise.all([
        apiFetch<any[]>('/items').catch(() => []),
        apiFetch<any[]>('/markets').catch(() => []),
        apiFetch<any[]>('/categories').catch(() => []),
        apiFetch<any[]>('/basket-versions').catch(() => []),
        apiFetch<any[]>('/audit-logs').catch(() => []),
      ]);
      setItems(itms);
      setMarkets(mkts);
      setCategories(cats);
      setBasketVersions(bskts);
      setAuditLogs(logs);

      // If active basket exists, initialize lines from it; else distribute equal weights across items
      const activeB = bskts.find((b) => b.status === 'active');
      if (activeB && activeB.lines?.length) {
        setBasketLines(activeB.lines);
        setBasketName(activeB.name);
        setBasePeriod(activeB.base_period);
        setFrequency(activeB.frequency);
      } else if (itms.length > 0) {
        const equalW = Number((1.0 / itms.length).toFixed(4));
        setBasketLines(itms.map((it) => ({ item_id: it.id, weight: equalW, base_quantity: 1.0 })));
      }
    } catch (err: any) {
      toast.error('Failed to load master configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Normalise weights to sum to exactly 1.00
  const autoNormaliseWeights = () => {
    const total = basketLines.reduce((sum, l) => sum + (Number(l.weight) || 0), 0);
    if (total === 0) return;
    const normalised = basketLines.map((l) => ({
      ...l,
      weight: Number(((Number(l.weight) || 0) / total).toFixed(4)),
    }));
    // Adjust last line difference so sum is strictly 1.0000
    const sumNorm = normalised.reduce((s, l) => s + l.weight, 0);
    const diff = Number((1.0 - sumNorm).toFixed(4));
    if (normalised.length > 0) {
      normalised[normalised.length - 1].weight = Number(
        (normalised[normalised.length - 1].weight + diff).toFixed(4)
      );
    }
    setBasketLines(normalised);
    toast.success('Weights normalised to exactly 1.00 (100%)');
  };

  const handleWeightChange = (itemId: string, newWeight: number) => {
    setBasketLines((prev) =>
      prev.map((l) => (l.item_id === itemId ? { ...l, weight: newWeight } : l))
    );
  };

  const handleSaveBasket = async (activateImmediately: boolean = false) => {
    const total = basketLines.reduce((sum, l) => sum + Number(l.weight), 0);
    if (Math.abs(total - 1.0) > 0.001) {
      toast.error(`Weights must sum to 1.00 (Current total: ${(total * 100).toFixed(1)}%). Please normalise.`);
      return;
    }

    try {
      const created = await apiFetch<any>('/basket-versions', {
        method: 'POST',
        body: JSON.stringify({
          name: basketName,
          base_period: basePeriod,
          frequency,
          lines: basketLines,
          effective_from: effectiveFrom,
        }),
      });

      if (activateImmediately) {
        await apiFetch<any>(`/basket-versions/${created.id}/activate`, { method: 'POST' });
        toast.success(`Basket version '${basketName}' created and activated!`);
      } else {
        toast.success(`Basket draft '${basketName}' saved!`);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving basket version');
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch<any>('/markets', { method: 'POST', body: JSON.stringify(marketForm) });
      toast.success(`Market '${marketForm.name}' created!`);
      setShowMarketForm(false);
      setMarketForm({ name: '', district: '', state: 'Tamil Nadu', type: 'retail', active: true });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error creating market');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch<any>('/items', { method: 'POST', body: JSON.stringify(itemForm) });
      toast.success(`Item '${itemForm.name}' created!`);
      setShowItemForm(false);
      setItemForm({ name: '', category_id: categories[0]?.id || '', canonical_unit: 'kg', min_plausible: 10, max_plausible: 200, active: true });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error creating item');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch<any>('/auth/users', { method: 'POST', body: JSON.stringify(userForm) });
      toast.success(`User '${userForm.name}' created!`);
      setShowUserForm(false);
      setUserForm({ email: '', name: '', role: 'Collector', market_ids: [] });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error creating user');
    }
  };

  const weightBarItems: WeightBarItem[] = basketLines.map((line) => {
    const it = items.find((i) => i.id === line.item_id);
    return {
      id: line.item_id,
      name: it ? it.name : line.item_id,
      weight: Number(line.weight) || 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="font-serif text-3xl text-ink font-normal">System Administration</h1>
          <p className="text-xs text-muted font-sans mt-0.5">
            Configure basket versions, assign expenditure weights, manage markets, items and user roles.
          </p>
        </div>

        {/* Tab switch tags (§10.5) */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-shelf p-1 rounded-lg border border-hairline">
          {[
            { id: 'basket', label: 'Basket Builder', icon: IconBasket },
            { id: 'markets', label: 'Markets', icon: IconBuildingStore },
            { id: 'items', label: 'Items & Ranges', icon: IconReceipt2 },
            { id: 'users', label: 'Users & Roles', icon: IconUsers },
            { id: 'audit', label: 'Audit Trail', icon: IconHistory },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-colors shrink-0',
                  isActive
                    ? 'bg-cocoa text-white font-medium shadow-shelf'
                    : 'text-muted hover:text-ink hover:bg-tile'
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* TAB 1: BASKET BUILDER */}
          {activeTab === 'basket' && (
            <div className="space-y-6">
              {/* Proportional Weight Bar Tile */}
              <BentoTile
                title="Active Basket Version & Proportional Weight Allocation"
                subtitle="Weights represent expenditure shares and must total exactly 1.00 (100%)"
                colSpan="col-span-12"
                action={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={autoNormaliseWeights}
                      className="px-3 py-1.5 rounded border border-hairline bg-tile hover:bg-cocoa-wash/40 text-xs font-sans text-cocoa transition-colors"
                    >
                      Auto-Normalise to 100%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveBasket(false)}
                      className="px-3 py-1.5 rounded border border-hairline bg-tile hover:bg-cocoa-wash/40 text-xs font-sans text-ink transition-colors"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveBasket(true)}
                      className="px-3 py-1.5 rounded bg-cocoa hover:bg-cocoa-deep text-white text-xs font-sans font-medium transition-colors shadow-shelf"
                    >
                      Activate New Version
                    </button>
                  </div>
                }
              >
                <div className="py-2">
                  <WeightBar items={weightBarItems} />
                </div>

                {/* Metadata controls */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-hairline/60">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted mb-1">
                      Basket Version Name
                    </label>
                    <input
                      type="text"
                      value={basketName}
                      onChange={(e) => setBasketName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-sans border border-hairline rounded bg-shelf"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted mb-1">
                      Base Period (0)
                    </label>
                    <input
                      type="text"
                      value={basePeriod}
                      onChange={(e) => setBasePeriod(e.target.value)}
                      placeholder="e.g. 2025-W40"
                      className="w-full px-3 py-1.5 text-xs font-mono border border-hairline rounded bg-shelf"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted mb-1">
                      Effective From Date
                    </label>
                    <input
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-hairline rounded bg-shelf"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted mb-1">
                      Index Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs font-sans border border-hairline rounded bg-shelf"
                    >
                      <option value="weekly">Weekly Series (52 Weeks)</option>
                      <option value="monthly">Monthly Series (12 Months)</option>
                    </select>
                  </div>
                </div>
              </BentoTile>

              {/* Items & Weights Table */}
              <div className="bg-tile rounded-tile border border-hairline p-5 shadow-shelf">
                <h3 className="font-serif text-lg text-ink mb-3 font-normal">Basket Items & Weights Editor</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-shelf/60 border-b border-hairline font-semibold text-muted uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3">Canonical Unit</th>
                        <th className="py-2.5 px-3">Base Quantity (q0)</th>
                        <th className="py-2.5 px-3">Expenditure Weight (wi)</th>
                        <th className="py-2.5 px-3">Share (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline font-mono">
                      {basketLines.map((line) => {
                        const item = items.find((it) => it.id === line.item_id);
                        const weightPct = ((Number(line.weight) || 0) * 100).toFixed(1);
                        return (
                          <tr key={line.item_id} className="hover:bg-cocoa-wash/30 transition-colors">
                            <td className="py-2.5 px-3 font-sans font-medium text-ink">
                              {item ? item.name : line.item_id}
                            </td>
                            <td className="py-2.5 px-3 text-muted">
                              {item ? item.canonical_unit : 'unit'}
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={line.base_quantity}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 1.0;
                                  setBasketLines((prev) =>
                                    prev.map((l) =>
                                      l.item_id === line.item_id ? { ...l, base_quantity: val } : l
                                    )
                                  );
                                }}
                                className="w-20 px-2 py-1 rounded border border-hairline bg-shelf text-xs"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0.001"
                                max="1.0"
                                value={line.weight}
                                onChange={(e) => handleWeightChange(line.item_id, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 rounded border border-hairline bg-shelf text-xs font-semibold text-ink"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-cocoa">
                              {weightPct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MARKETS */}
          {activeTab === 'markets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-sans font-medium">
                  {markets.length} configured market centers across districts
                </span>
                <button
                  type="button"
                  onClick={() => setShowMarketForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cocoa text-white text-xs font-medium hover:bg-cocoa-deep shadow-shelf"
                >
                  <IconPlus size={14} />
                  <span>Add New Market</span>
                </button>
              </div>

              {showMarketForm && (
                <form onSubmit={handleCreateMarket} className="bg-tile border border-hairline p-5 rounded-tile shadow-shelf space-y-3">
                  <h4 className="font-serif text-base text-ink font-normal">Add Retail/Wholesale Market</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Market Name (e.g. T. Nagar Retail)"
                      value={marketForm.name}
                      onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })}
                      className="px-3 py-1.5 text-xs font-sans rounded border border-hairline bg-shelf"
                    />
                    <input
                      type="text"
                      required
                      placeholder="District (e.g. Chennai)"
                      value={marketForm.district}
                      onChange={(e) => setMarketForm({ ...marketForm, district: e.target.value })}
                      className="px-3 py-1.5 text-xs font-sans rounded border border-hairline bg-shelf"
                    />
                    <select
                      value={marketForm.type}
                      onChange={(e) => setMarketForm({ ...marketForm, type: e.target.value })}
                      className="px-3 py-1.5 text-xs font-sans rounded border border-hairline bg-shelf"
                    >
                      <option value="retail">Retail Center</option>
                      <option value="wholesale">Wholesale Mandi</option>
                      <option value="online">Online Delivery</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-cocoa text-white text-xs font-medium hover:bg-cocoa-deep"
                    >
                      Save Market
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-tile rounded-tile border border-hairline overflow-hidden shadow-shelf">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-shelf/60 border-b border-hairline text-muted uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Market Name</th>
                      <th className="py-2.5 px-4">District</th>
                      <th className="py-2.5 px-4">State</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {markets.map((m) => (
                      <tr key={m.id} className="hover:bg-cocoa-wash/20">
                        <td className="py-2.5 px-4 font-medium text-ink">{m.name}</td>
                        <td className="py-2.5 px-4 text-muted">{m.district}</td>
                        <td className="py-2.5 px-4 text-muted">{m.state}</td>
                        <td className="py-2.5 px-4 uppercase font-mono text-[11px]">{m.type}</td>
                        <td className="py-2.5 px-4">
                          <StatusPill status={m.active ? 'active' : 'archived'} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ITEMS & PLAUSIBLE RANGES */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-sans font-medium">
                  {items.length} goods in the master catalogue with plausible bounds
                </span>
                <button
                  type="button"
                  onClick={() => setShowItemForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cocoa text-white text-xs font-medium hover:bg-cocoa-deep shadow-shelf"
                >
                  <IconPlus size={14} />
                  <span>Add New Item</span>
                </button>
              </div>

              {showItemForm && (
                <form onSubmit={handleCreateItem} className="bg-tile border border-hairline p-5 rounded-tile shadow-shelf space-y-3">
                  <h4 className="font-serif text-base text-ink font-normal">Add Catalog Item & Plausible Range</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Item Name (e.g. Rice)"
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      className="px-3 py-1.5 text-xs font-sans rounded border border-hairline bg-shelf"
                    />
                    <select
                      value={itemForm.category_id}
                      onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                      className="px-3 py-1.5 text-xs font-sans rounded border border-hairline bg-shelf"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select
                      value={itemForm.canonical_unit}
                      onChange={(e) => setItemForm({ ...itemForm, canonical_unit: e.target.value })}
                      className="px-3 py-1.5 text-xs font-mono rounded border border-hairline bg-shelf"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="mL">mL</option>
                      <option value="dozen">dozen</option>
                      <option value="piece">piece</option>
                      <option value="cylinder">cylinder</option>
                    </select>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        placeholder="Min ₹"
                        value={itemForm.min_plausible}
                        onChange={(e) => setItemForm({ ...itemForm, min_plausible: parseFloat(e.target.value) || 0 })}
                        className="w-1/2 px-2 py-1.5 text-xs font-mono rounded border border-hairline bg-shelf"
                      />
                      <input
                        type="number"
                        placeholder="Max ₹"
                        value={itemForm.max_plausible}
                        onChange={(e) => setItemForm({ ...itemForm, max_plausible: parseFloat(e.target.value) || 0 })}
                        className="w-1/2 px-2 py-1.5 text-xs font-mono rounded border border-hairline bg-shelf"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-cocoa text-white text-xs font-medium hover:bg-cocoa-deep"
                    >
                      Save Item
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-tile rounded-tile border border-hairline overflow-hidden shadow-shelf">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-shelf/60 border-b border-hairline text-muted uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Item Name</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Canonical Unit</th>
                      <th className="py-2.5 px-4">Plausible Range (₹)</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {items.map((it) => (
                      <tr key={it.id} className="hover:bg-cocoa-wash/20">
                        <td className="py-2.5 px-4 font-medium text-ink">{it.name}</td>
                        <td className="py-2.5 px-4 text-muted">{it.category_name || 'General'}</td>
                        <td className="py-2.5 px-4 font-mono">{it.canonical_unit}</td>
                        <td className="py-2.5 px-4 font-mono text-cocoa">
                          ₹{it.min_plausible} – ₹{it.max_plausible}
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusPill status={it.active ? 'active' : 'archived'} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: USERS & ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-sans font-medium">
                  Role-based access accounts (Admin, Analyst, Collector, Viewer)
                </span>
                <button
                  type="button"
                  onClick={() => setShowUserForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cocoa text-white text-xs font-medium hover:bg-cocoa-deep shadow-shelf"
                >
                  <IconPlus size={14} />
                  <span>Provision User</span>
                </button>
              </div>

              {showUserForm && (
                <form onSubmit={handleCreateUser} className="bg-tile border border-hairline p-5 rounded-tile shadow-shelf space-y-3">
                  <h4 className="font-serif text-base text-ink font-normal">Provision New User Account</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="px-3 py-1.5 text-xs font-sans rounded border border-hairline bg-shelf"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="px-3 py-1.5 text-xs font-mono rounded border border-hairline bg-shelf"
                    />
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      className="px-3 py-1.5 text-xs font-sans rounded border border-hairline bg-shelf"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Analyst">Analyst</option>
                      <option value="Collector">Collector</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-cocoa text-white text-xs font-medium hover:bg-cocoa-deep"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-tile rounded-tile border border-hairline p-4 shadow-shelf text-xs text-muted">
                Users provisioned by Admin receive a temporary password and are automatically prompted to set a new password on their first login via the flipped tag screen (§10.6).
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-tile rounded-tile border border-hairline overflow-hidden shadow-shelf">
              <div className="p-4 border-b border-hairline bg-shelf/40 flex items-center justify-between">
                <span className="font-serif text-base text-ink font-normal">System Audit Trail</span>
                <span className="text-xs font-mono text-muted">{auditLogs.length} logged events</span>
              </div>
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-shelf/60 border-b border-hairline text-muted uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp (UTC)</th>
                    <th className="py-2.5 px-4">Actor</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Resource</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline font-mono text-[11px]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted font-sans">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-cocoa-wash/20">
                        <td className="py-2 px-4 text-muted">{log.created_at || 'Just now'}</td>
                        <td className="py-2 px-4 font-sans font-medium text-ink">{log.actor}</td>
                        <td className="py-2 px-4">
                          <span className="px-1.5 py-0.5 rounded bg-cocoa-wash text-cocoa font-semibold">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-muted">{log.resource}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
