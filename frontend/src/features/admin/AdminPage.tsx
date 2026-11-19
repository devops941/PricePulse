import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { WeightBar, WeightBarItem } from '@/components/admin/WeightBar';
import { StatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/FeedbackStates';
import {
  IconBasket,
  IconBuildingStore,
  IconReceipt2,
  IconUsers,
  IconHistory,
  IconPlus,
  IconCheck,
  IconDownload,
  IconSearch,
  IconEdit,
  IconFilter,
  IconRefresh,
  IconShield,
  IconScale,
  IconEye,
  IconChevronDown,
  IconChevronRight,
  IconAlertCircle,
} from '@tabler/icons-react';
import { cn, formatINR } from '@/lib/utils';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basket' | 'markets' | 'items' | 'users' | 'audit'>('basket');
  
  // Master data states
  const [items, setItems] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [basketVersions, setBasketVersions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Basket builder state
  const [selectedBasketId, setSelectedBasketId] = useState<string>('');
  const [basketName, setBasketName] = useState('Essential Consumer Goods Basket v1.0');
  const [basePeriod, setBasePeriod] = useState('2024-W40');
  const [effectiveFrom, setEffectiveFrom] = useState('2025-01-01');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [basketLines, setBasketLines] = useState<{ item_id: string; weight: number; base_quantity: number }[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Market filters & modals
  const [marketDistrictFilter, setMarketDistrictFilter] = useState('all');
  const [marketTypeFilter, setMarketTypeFilter] = useState('all');
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [editingMarket, setEditingMarket] = useState<any>(null);
  const [marketForm, setMarketForm] = useState({ name: '', district: 'Chennai', state: 'Tamil Nadu', type: 'retail', active: true });

  // Items filters & modals
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({ name: '', category_id: '', canonical_unit: 'kg', min_plausible: 10, max_plausible: 200, active: true });

  // User provisioning modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userForm, setUserForm] = useState({ email: '', name: '', role: 'Collector', market_ids: [] as string[], temporary_password: '' });

  // Audit trail filters
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itms, mkts, cats, bskts, usrs, logs] = await Promise.all([
        apiFetch<any[]>('/items').catch(() => []),
        apiFetch<any[]>('/markets').catch(() => []),
        apiFetch<any[]>('/categories').catch(() => []),
        apiFetch<any[]>('/basket-versions').catch(() => []),
        apiFetch<any[]>('/auth/users').catch(() => []),
        apiFetch<any[]>('/audit-logs?limit=200').catch(() => []),
      ]);
      setItems(itms);
      setMarkets(mkts);
      setCategories(cats);
      setBasketVersions(bskts);
      setUsers(usrs);
      setAuditLogs(logs);

      // Determine active or first basket
      const activeB = bskts.find((b) => b.status === 'active') || bskts[0];
      if (activeB) {
        setSelectedBasketId(activeB.id);
        setBasketName(activeB.name);
        setBasePeriod(activeB.base_period || '2024-W40');
        setEffectiveFrom(activeB.effective_from || '2025-01-01');
        setFrequency(activeB.frequency || 'weekly');
        
        const rawLines = activeB.lines || activeB.items || [];
        if (rawLines.length > 0) {
          setBasketLines(rawLines.map((l: any) => ({
            item_id: l.item_id,
            weight: Number(l.weight) || 0,
            base_quantity: Number(l.base_quantity || l.quantity) || 1.0,
          })));
        } else if (itms.length > 0) {
          const eqW = Number((1.0 / itms.length).toFixed(4));
          setBasketLines(itms.map((it) => ({ item_id: it.id, weight: eqW, base_quantity: 1.0 })));
        }
      } else if (itms.length > 0) {
        const eqW = Number((1.0 / itms.length).toFixed(4));
        setBasketLines(itms.map((it) => ({ item_id: it.id, weight: eqW, base_quantity: 1.0 })));
      }
    } catch {
      toast.error('Failed to load system master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Switch basket version selection
  const handleSelectBasketVersion = (bId: string) => {
    setSelectedBasketId(bId);
    const b = basketVersions.find((x) => x.id === bId);
    if (!b) return;
    setBasketName(b.name);
    setBasePeriod(b.base_period || '2024-W40');
    setEffectiveFrom(b.effective_from || '2025-01-01');
    setFrequency(b.frequency || 'weekly');
    const rawLines = b.lines || b.items || [];
    if (rawLines.length > 0) {
      setBasketLines(rawLines.map((l: any) => ({
        item_id: l.item_id,
        weight: Number(l.weight) || 0,
        base_quantity: Number(l.base_quantity || l.quantity) || 1.0,
      })));
    }
    toast.info(`Loaded basket configuration: ${b.name}`);
  };

  // Normalise weights to strictly sum to 1.0000 (100.0%)
  const autoNormaliseWeights = () => {
    const total = basketLines.reduce((sum, l) => sum + (Number(l.weight) || 0), 0);
    if (total === 0) return;
    const normalised = basketLines.map((l) => ({
      ...l,
      weight: Number(((Number(l.weight) || 0) / total).toFixed(4)),
    }));
    // Adjust rounding difference on the last item so sum is strictly 1.0000
    const sumNorm = normalised.reduce((s, l) => s + l.weight, 0);
    const diff = Number((1.0 - sumNorm).toFixed(4));
    if (normalised.length > 0) {
      normalised[normalised.length - 1].weight = Number(
        (normalised[normalised.length - 1].weight + diff).toFixed(4)
      );
    }
    setBasketLines(normalised);
    toast.success('Weights normalised to strictly 1.00 (100.0%)');
  };

  const handleWeightChange = (itemId: string, newWeight: number) => {
    setBasketLines((prev) =>
      prev.map((l) => (l.item_id === itemId ? { ...l, weight: Math.max(0, Math.min(1, newWeight)) } : l))
    );
  };

  const handleSaveBasket = async (activateImmediately = false) => {
    const total = basketLines.reduce((sum, l) => sum + Number(l.weight), 0);
    if (Math.abs(total - 1.0) > 0.005) {
      toast.error(`Weights must sum to 1.00 (Current total: ${(total * 100).toFixed(2)}%). Please click 'Auto-Normalise to 100%'.`);
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

      if (activateImmediately && created?.id) {
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

  // Market handlers
  const handleSaveMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMarket) {
        await apiFetch<any>(`/markets/${editingMarket.id}`, {
          method: 'PATCH',
          body: JSON.stringify(marketForm),
        });
        toast.success(`Market '${marketForm.name}' updated!`);
      } else {
        await apiFetch<any>('/markets', {
          method: 'POST',
          body: JSON.stringify(marketForm),
        });
        toast.success(`Market '${marketForm.name}' created!`);
      }
      setShowMarketModal(false);
      setEditingMarket(null);
      setMarketForm({ name: '', district: 'Chennai', state: 'Tamil Nadu', type: 'retail', active: true });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving market');
    }
  };

  const handleToggleMarketActive = async (market: any) => {
    try {
      await apiFetch<any>(`/markets/${market.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !market.active }),
      });
      toast.success(`Market '${market.name}' status updated`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update market status');
    }
  };

  // Item handlers
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemForm.min_plausible >= itemForm.max_plausible) {
      toast.error('Min plausible price must be strictly less than Max plausible price');
      return;
    }
    try {
      if (editingItem) {
        await apiFetch<any>(`/items/${editingItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify(itemForm),
        });
        toast.success(`Item '${itemForm.name}' updated!`);
      } else {
        await apiFetch<any>('/items', {
          method: 'POST',
          body: JSON.stringify(itemForm),
        });
        toast.success(`Item '${itemForm.name}' created!`);
      }
      setShowItemModal(false);
      setEditingItem(null);
      setItemForm({ name: '', category_id: categories[0]?.id || '', canonical_unit: 'kg', min_plausible: 10, max_plausible: 200, active: true });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving item');
    }
  };

  const handleToggleItemActive = async (item: any) => {
    try {
      await apiFetch<any>(`/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      });
      toast.success(`Item '${item.name}' active state updated`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle item');
    }
  };

  // User handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch<any>('/auth/users', {
        method: 'POST',
        body: JSON.stringify(userForm),
      });
      toast.success(`User '${userForm.name}' provisioned successfully!`);
      setShowUserModal(false);
      setUserForm({ email: '', name: '', role: 'Collector', market_ids: [], temporary_password: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error provisioning user');
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await apiFetch<any>(`/auth/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`User '${user.name}' status set to ${newStatus}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change user status');
    }
  };

  // Audit export
  const handleExportAuditCSV = () => {
    if (auditLogs.length === 0) {
      toast.error('No audit events to export');
      return;
    }
    const headers = ['Timestamp', 'Actor', 'Action', 'Resource', 'Details'];
    const rows = filteredAuditLogs.map((log) => [
      `"${log.created_at || ''}"`,
      `"${log.actor || ''}"`,
      `"${log.action || ''}"`,
      `"${log.resource || ''}"`,
      `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PricePulse_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit log CSV exported successfully');
  };

  // Group items by category for Basket Builder
  const groupedBasketItems = useMemo(() => {
    const map: Record<string, { category: any; lines: any[]; subtotalWeight: number }> = {};
    categories.forEach((cat) => {
      map[cat.id] = { category: cat, lines: [], subtotalWeight: 0 };
    });

    basketLines.forEach((line) => {
      const it = items.find((i) => i.id === line.item_id);
      const catId = it?.category_id || categories[0]?.id || 'other';
      if (!map[catId]) {
        map[catId] = {
          category: { id: catId, name: it?.category_name || 'General Goods' },
          lines: [],
          subtotalWeight: 0,
        };
      }
      map[catId].lines.push({ ...line, item: it });
      map[catId].subtotalWeight += Number(line.weight) || 0;
    });

    return Object.values(map).filter((g) => g.lines.length > 0);
  }, [categories, basketLines, items]);

  const totalCalculatedWeight = basketLines.reduce((sum, l) => sum + (Number(l.weight) || 0), 0);
  const isWeightBalanced = Math.abs(totalCalculatedWeight - 1.0) <= 0.002;

  const weightBarItems: WeightBarItem[] = basketLines.map((line) => {
    const it = items.find((i) => i.id === line.item_id);
    return {
      id: line.item_id,
      name: it ? it.name : line.item_id,
      weight: Number(line.weight) || 0,
    };
  });

  // Filtered lists
  const filteredMarkets = markets.filter((m) => {
    const matchesDistrict = marketDistrictFilter === 'all' || m.district.toLowerCase() === marketDistrictFilter.toLowerCase();
    const matchesType = marketTypeFilter === 'all' || m.type.toLowerCase() === marketTypeFilter.toLowerCase();
    return matchesDistrict && matchesType;
  });

  const filteredItems = items.filter((it) => {
    const matchesCat = itemCategoryFilter === 'all' || it.category_id === itemCategoryFilter;
    const matchesSearch = !itemSearchQuery || it.name.toLowerCase().includes(itemSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredUsers = users.filter((u) => {
    return userRoleFilter === 'all' || u.role.toLowerCase() === userRoleFilter.toLowerCase();
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesAction = auditActionFilter === 'all' || (log.action && log.action.startsWith(auditActionFilter));
    const matchesSearch = !auditSearchQuery ||
      (log.actor && log.actor.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
      (log.resource && log.resource.toLowerCase().includes(auditSearchQuery.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      {/* Title & Navigation Tabs Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-cocoa">
              System Administration
            </h1>
            <span className="rounded-full bg-shelf px-2.5 py-0.5 font-mono text-[10px] font-bold text-muted uppercase">
              Super Admin Cockpit
            </span>
          </div>
          <p className="text-xs text-muted font-sans mt-0.5">
            Configure basket versions, expenditure weights, regional markets, items, users & regulatory audit trail.
          </p>
        </div>

        {/* Tab switch tags (§10.5) */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-shelf p-1 rounded-xl border border-hairline shadow-2xs">
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
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-sans transition-all shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-cocoa text-white font-semibold shadow-xs'
                    : 'text-muted hover:text-ink hover:bg-tile'
                )}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* TAB 1: BASKET BUILDER & VERSION GOVERNANCE                     */}
          {/* ============================================================== */}
          {activeTab === 'basket' && (
            <div className="space-y-6">
              {/* Basket Version Header & Weight Bar Tile */}
              <BentoTile
                title="Active Basket Version & Proportional Weight Allocation"
                subtitle="Weights represent canonical expenditure shares and must total strictly 1.00 (100.0%)"
                colSpan="col-span-12"
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Version Selector Dropdown */}
                    <div className="flex items-center gap-1 bg-shelf px-2.5 py-1 rounded-lg border border-hairline text-xs font-sans">
                      <span className="text-muted text-[11px] font-mono">Version:</span>
                      <select
                        value={selectedBasketId}
                        onChange={(e) => handleSelectBasketVersion(e.target.value)}
                        className="bg-transparent font-serif font-bold text-cocoa focus:outline-none cursor-pointer text-xs"
                      >
                        {basketVersions.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.status === 'active' ? 'Active' : 'Draft'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={autoNormaliseWeights}
                      className="px-3 py-1.5 rounded-lg border border-hairline bg-white hover:bg-shelf text-xs font-sans font-semibold text-cocoa transition-colors shadow-2xs cursor-pointer"
                    >
                      Auto-Normalise to 100%
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveBasket(false)}
                      className="px-3 py-1.5 rounded-lg border border-hairline bg-white hover:bg-shelf text-xs font-sans font-semibold text-ink transition-colors shadow-2xs cursor-pointer"
                    >
                      Save Draft
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveBasket(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-cocoa hover:bg-cocoa/90 text-white text-xs font-sans font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Activate New Version
                    </button>
                  </div>
                }
              >
                {/* Visual Proportional Segmented Bar */}
                <div className="py-2">
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-muted">Proportional Basket Weight Bar (§10.6)</span>
                    <span className={cn(
                      "font-bold px-2 py-0.5 rounded text-[11px]",
                      isWeightBalanced ? "bg-[#E7F3EE] text-[#2D6A4F]" : "bg-[#FDF3F0] text-[#8F2D17]"
                    )}>
                      Total: {(totalCalculatedWeight * 100).toFixed(1)}% {isWeightBalanced ? '(Balanced 100%)' : '(Unbalanced)'}
                    </span>
                  </div>
                  <WeightBar items={weightBarItems} />
                </div>

                {/* Category Weight Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-hairline/60">
                  {groupedBasketItems.map((g) => (
                    <div key={g.category.id} className="p-2.5 rounded-xl border border-hairline bg-shelf/40">
                      <span className="font-mono text-[10px] uppercase text-muted block truncate font-bold">
                        {g.category.name}
                      </span>
                      <div className="font-serif text-lg font-bold text-cocoa mt-0.5">
                        {(g.subtotalWeight * 100).toFixed(1)}%
                      </div>
                      <span className="text-[10px] text-shelf-muted font-sans block mt-0.5">
                        {g.lines.length} items included
                      </span>
                    </div>
                  ))}
                </div>

                {/* Metadata controls */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-hairline/60">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-muted mb-1">
                      Basket Version Name
                    </label>
                    <input
                      type="text"
                      value={basketName}
                      onChange={(e) => setBasketName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-serif font-bold text-cocoa border border-hairline rounded-lg bg-shelf focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-muted mb-1">
                      Base Period (t0)
                    </label>
                    <input
                      type="text"
                      value={basePeriod}
                      onChange={(e) => setBasePeriod(e.target.value)}
                      placeholder="e.g. 2024-W40"
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-hairline rounded-lg bg-shelf focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-muted mb-1">
                      Effective From Date
                    </label>
                    <input
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-hairline rounded-lg bg-shelf focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-muted mb-1">
                      Index Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs font-sans font-semibold border border-hairline rounded-lg bg-shelf focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="weekly">Weekly Series (52 Weeks)</option>
                      <option value="monthly">Monthly Series (12 Months)</option>
                    </select>
                  </div>
                </div>
              </BentoTile>

              {/* Category-Grouped Items & Weights Table */}
              <div className="bg-tile rounded-2xl border border-hairline p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-cocoa">
                      Basket Items & Weights Editor
                    </h3>
                    <p className="text-xs text-muted font-sans">
                      Standardized canonical consumption basket across all 15 essential goods grouped by category.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-muted bg-shelf px-3 py-1 rounded-full border border-hairline">
                    15 Canonical Goods Configured
                  </span>
                </div>

                <div className="space-y-4">
                  {groupedBasketItems.map((group) => {
                    const isCollapsed = collapsedCategories[group.category.id];
                    return (
                      <div key={group.category.id} className="rounded-xl border border-hairline overflow-hidden bg-white">
                        {/* Category Group Header */}
                        <div
                          onClick={() => setCollapsedCategories((p) => ({ ...p, [group.category.id]: !p[group.category.id] }))}
                          className="flex items-center justify-between px-4 py-2.5 bg-shelf/60 border-b border-hairline cursor-pointer hover:bg-shelf transition"
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
                            <span className="font-serif font-bold text-cocoa text-sm">
                              {group.category.name}
                            </span>
                            <span className="text-xs font-mono text-muted">
                              ({group.lines.length} items)
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-cocoa">
                              Category Subtotal: {(group.subtotalWeight * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Items Sub-table */}
                        {!isCollapsed && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs font-sans">
                              <thead className="bg-shelf/20 border-b border-hairline font-bold text-muted uppercase text-[10px]">
                                <tr>
                                  <th className="py-2.5 px-4">Commodity Item</th>
                                  <th className="py-2.5 px-3">Canonical Unit</th>
                                  <th className="py-2.5 px-3">Base Quantity (q0)</th>
                                  <th className="py-2.5 px-3">Expenditure Weight (wi)</th>
                                  <th className="py-2.5 px-3">Share (%)</th>
                                  <th className="py-2.5 px-4 text-right">Plausible Corridor</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-hairline font-mono">
                                {group.lines.map((line) => {
                                  const item = line.item;
                                  const weightPct = ((Number(line.weight) || 0) * 100).toFixed(2);
                                  return (
                                    <tr key={line.item_id} className="hover:bg-cocoa/5 transition-colors">
                                      <td className="py-2.5 px-4 font-sans font-medium text-cocoa">
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
                                          className="w-20 px-2 py-1 rounded border border-hairline bg-shelf text-xs font-bold focus:bg-white"
                                        />
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <input
                                          type="number"
                                          step="0.005"
                                          min="0.001"
                                          max="1.0"
                                          value={line.weight}
                                          onChange={(e) => handleWeightChange(line.item_id, parseFloat(e.target.value) || 0)}
                                          className="w-24 px-2 py-1 rounded border border-hairline bg-shelf text-xs font-bold text-cocoa focus:bg-white"
                                        />
                                      </td>
                                      <td className="py-2.5 px-3 font-bold text-cocoa">
                                        {weightPct}%
                                      </td>
                                      <td className="py-2.5 px-4 text-right text-muted text-[11px]">
                                        ₹{item?.min_plausible || 10} – ₹{item?.max_plausible || 200}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: REGIONAL MARKETS MANAGEMENT                             */}
          {/* ============================================================== */}
          {activeTab === 'markets' && (
            <div className="space-y-4">
              {/* Markets Filter & Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-tile p-4 rounded-xl border border-hairline shadow-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-sans text-muted">
                    <IconFilter size={15} />
                    <span>District:</span>
                    <select
                      value={marketDistrictFilter}
                      onChange={(e) => setMarketDistrictFilter(e.target.value)}
                      className="rounded border border-hairline bg-shelf px-2 py-1 font-semibold text-cocoa text-xs cursor-pointer"
                    >
                      <option value="all">All Districts (3)</option>
                      <option value="chennai">Chennai</option>
                      <option value="coimbatore">Coimbatore</option>
                      <option value="madurai">Madurai</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-sans text-muted">
                    <span>Type:</span>
                    <select
                      value={marketTypeFilter}
                      onChange={(e) => setMarketTypeFilter(e.target.value)}
                      className="rounded border border-hairline bg-shelf px-2 py-1 font-semibold text-cocoa text-xs cursor-pointer"
                    >
                      <option value="all">All Market Types</option>
                      <option value="retail">Retail Center</option>
                      <option value="wholesale">Wholesale Mandi</option>
                      <option value="online">Online Delivery</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingMarket(null);
                    setMarketForm({ name: '', district: 'Chennai', state: 'Tamil Nadu', type: 'retail', active: true });
                    setShowMarketModal(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-cocoa px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cocoa/90 transition shadow-xs cursor-pointer"
                >
                  <IconPlus size={15} />
                  <span>Add New Market</span>
                </button>
              </div>

              {/* Markets Table */}
              <div className="bg-tile rounded-2xl border border-hairline overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-shelf/60 border-b border-hairline text-muted uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-4">Market Center</th>
                      <th className="py-3 px-4">District</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4">Hub Type</th>
                      <th className="py-3 px-4">Operational Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {filteredMarkets.map((m) => (
                      <tr key={m.id} className="hover:bg-cocoa/5 transition">
                        <td className="py-3 px-4 font-bold text-cocoa">
                          {m.name}
                        </td>
                        <td className="py-3 px-4 font-medium text-ink">{m.district}</td>
                        <td className="py-3 px-4 text-muted">{m.state}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
                            m.type === 'wholesale' ? "bg-cocoa text-white" : "bg-shelf text-cocoa"
                          )}>
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusPill status={m.active ? 'active' : 'archived'} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMarket(m);
                                setMarketForm({
                                  name: m.name,
                                  district: m.district,
                                  state: m.state || 'Tamil Nadu',
                                  type: m.type || 'retail',
                                  active: m.active,
                                });
                                setShowMarketModal(true);
                              }}
                              className="p-1 rounded text-muted hover:text-cocoa hover:bg-shelf transition cursor-pointer"
                              title="Edit Market"
                            >
                              <IconEdit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleMarketActive(m)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer",
                                m.active ? "text-warn hover:bg-warn/10" : "text-fall hover:bg-fall/10"
                              )}
                            >
                              {m.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: ITEMS & PLAUSIBLE RANGES                                */}
          {/* ============================================================== */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              {/* Category Filter Pills & Search */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-tile p-4 rounded-xl border border-hairline shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-cocoa mr-1">Category:</span>
                  <button
                    type="button"
                    onClick={() => setItemCategoryFilter('all')}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-sans transition cursor-pointer",
                      itemCategoryFilter === 'all' ? "bg-cocoa text-white font-bold" : "bg-shelf text-muted hover:text-ink"
                    )}
                  >
                    All Goods ({items.length})
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setItemCategoryFilter(c.id)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-sans transition cursor-pointer",
                        itemCategoryFilter === c.id ? "bg-cocoa text-white font-bold" : "bg-shelf text-muted hover:text-ink"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <IconSearch size={14} className="absolute left-2.5 top-2.5 text-muted" />
                    <input
                      type="text"
                      placeholder="Search commodities..."
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs font-sans rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setItemForm({
                        name: '',
                        category_id: categories[0]?.id || '',
                        canonical_unit: 'kg',
                        min_plausible: 10,
                        max_plausible: 200,
                        active: true,
                      });
                      setShowItemModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-cocoa px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cocoa/90 transition shadow-xs cursor-pointer"
                  >
                    <IconPlus size={15} />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Items Table with Plausible Price Bounds */}
              <div className="bg-tile rounded-2xl border border-hairline overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-shelf/60 border-b border-hairline text-muted uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-4">Commodity Item</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Canonical Unit</th>
                      <th className="py-3 px-4">Plausible Price Range (₹)</th>
                      <th className="py-3 px-4">Visual Range Corridor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {filteredItems.map((it) => (
                      <tr key={it.id} className="hover:bg-cocoa/5 transition">
                        <td className="py-3 px-4 font-bold text-cocoa">
                          {it.name}
                        </td>
                        <td className="py-3 px-4 text-muted">{it.category_name || 'General'}</td>
                        <td className="py-3 px-4 font-mono font-semibold">{it.canonical_unit}</td>
                        <td className="py-3 px-4 font-mono font-bold text-cocoa">
                          ₹{it.min_plausible} – ₹{it.max_plausible}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-32 bg-hairline h-2 rounded-full overflow-hidden flex items-center">
                            <div className="h-full bg-cocoa/40 w-full rounded-full" />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusPill status={it.active ? 'active' : 'archived'} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(it);
                                setItemForm({
                                  name: it.name,
                                  category_id: it.category_id || categories[0]?.id || '',
                                  canonical_unit: it.canonical_unit || 'kg',
                                  min_plausible: it.min_plausible || 10,
                                  max_plausible: it.max_plausible || 200,
                                  active: it.active,
                                });
                                setShowItemModal(true);
                              }}
                              className="p-1 rounded text-muted hover:text-cocoa hover:bg-shelf transition cursor-pointer"
                              title="Edit Item Bounds"
                            >
                              <IconEdit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleItemActive(it)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer",
                                it.active ? "text-warn hover:bg-warn/10" : "text-fall hover:bg-fall/10"
                              )}
                            >
                              {it.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: USERS & ROLE GOVERNANCE                                 */}
          {/* ============================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* User Roster Filter & Provision Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-tile p-4 rounded-xl border border-hairline shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-cocoa">Filter Role:</span>
                  {['all', 'admin', 'analyst', 'collector', 'viewer'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setUserRoleFilter(role)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-sans uppercase font-bold transition cursor-pointer",
                        userRoleFilter === role ? "bg-cocoa text-white" : "bg-shelf text-muted hover:text-ink"
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUserForm({ email: '', name: '', role: 'Collector', market_ids: [], temporary_password: '' });
                    setShowUserModal(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-cocoa px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cocoa/90 transition shadow-xs cursor-pointer"
                >
                  <IconPlus size={15} />
                  <span>Provision New User</span>
                </button>
              </div>

              {/* Live Users Table */}
              <div className="bg-tile rounded-2xl border border-hairline overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-shelf/60 border-b border-hairline text-muted uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Role Assigned</th>
                      <th className="py-3 px-4">Assigned Markets</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Security Policy</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted">
                          No users match selected role filter.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-cocoa/5 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-cocoa">{u.name}</div>
                            <div className="font-mono text-[11px] text-muted">{u.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              "rounded px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                              u.role === 'Admin' ? "bg-cocoa text-white" :
                              u.role === 'Analyst' ? "bg-blue-600 text-white" :
                              u.role === 'Collector' ? "bg-amber-600 text-white" : "bg-slate-500 text-white"
                            )}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted">
                            {u.role === 'Admin' ? (
                              <span className="font-mono text-[11px] text-cocoa font-bold">All Regional Markets</span>
                            ) : u.market_ids && u.market_ids.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {u.market_ids.map((mId: string) => {
                                  const mObj = markets.find((m) => m.id === mId);
                                  return (
                                    <span key={mId} className="bg-shelf px-2 py-0.5 rounded text-[10px] font-mono">
                                      {mObj ? mObj.name : mId}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="italic text-[11px]">Unrestricted</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <StatusPill status={u.status === 'active' ? 'active' : 'archived'} size="sm" />
                          </td>
                          <td className="py-3 px-4">
                            {u.must_change_password ? (
                              <span className="rounded bg-[#FEF7EC] px-2 py-0.5 font-mono text-[10px] font-bold text-[#D97706]">
                                First Login Reset
                              </span>
                            ) : (
                              <span className="rounded bg-[#E7F3EE] px-2 py-0.5 font-mono text-[10px] font-bold text-[#2D6A4F]">
                                Verified
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.email !== 'admin@gmail.com' && (
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u)}
                                className={cn(
                                  "px-2.5 py-1 rounded text-xs font-sans font-semibold transition cursor-pointer",
                                  u.status === 'active' ? "text-warn hover:bg-warn/10" : "text-fall hover:bg-fall/10"
                                )}
                              >
                                {u.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: REGULATORY AUDIT TRAIL                                  */}
          {/* ============================================================== */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {/* Audit Filter Strip & CSV Export */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-tile p-4 rounded-xl border border-hairline shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-cocoa">Action Category:</span>
                  {['all', 'BASKET', 'MARKET', 'ITEM', 'USER', 'OUTLIER', 'BOOTSTRAP'].map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setAuditActionFilter(act)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-sans uppercase font-bold transition cursor-pointer",
                        auditActionFilter === act ? "bg-cocoa text-white" : "bg-shelf text-muted hover:text-ink"
                      )}
                    >
                      {act}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <IconSearch size={14} className="absolute left-2.5 top-2.5 text-muted" />
                    <input
                      type="text"
                      placeholder="Search actor or resource..."
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs font-sans rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExportAuditCSV}
                    className="flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3.5 py-1.5 text-xs font-bold text-cocoa hover:bg-shelf transition shadow-2xs cursor-pointer"
                  >
                    <IconDownload size={15} />
                    <span>Export Audit CSV</span>
                  </button>
                </div>
              </div>

              {/* Audit Table */}
              <div className="bg-tile rounded-2xl border border-hairline overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-shelf/60 border-b border-hairline text-muted uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-4">Timestamp (UTC)</th>
                      <th className="py-3 px-4">Authorized Actor</th>
                      <th className="py-3 px-4">Action Event</th>
                      <th className="py-3 px-4">Resource Target</th>
                      <th className="py-3 px-4">Logged Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline font-mono text-[11px]">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted font-sans">
                          No audit events recorded for current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-cocoa/5 transition">
                          <td className="py-3 px-4 text-muted whitespace-nowrap">
                            {log.created_at || 'Just now'}
                          </td>
                          <td className="py-3 px-4 font-sans font-medium text-cocoa">
                            {log.actor}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-cocoa/10 text-cocoa font-bold">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted">
                            {log.resource}
                          </td>
                          <td className="py-3 px-4 text-shelf-muted truncate max-w-xs">
                            {JSON.stringify(log.metadata || {})}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT MARKET                                       */}
      {/* ============================================================== */}
      {showMarketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white border border-hairline p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-cocoa">
              {editingMarket ? 'Edit Market Hub' : 'Add New Regional Market'}
            </h3>
            <form onSubmit={handleSaveMarket} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-bold text-muted uppercase text-[10px] mb-1">Market Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Koyambedu Wholesale Mandi"
                  value={marketForm.name}
                  onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted uppercase text-[10px] mb-1">District</label>
                  <select
                    value={marketForm.district}
                    onChange={(e) => setMarketForm({ ...marketForm, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="Chennai">Chennai</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Madurai">Madurai</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-muted uppercase text-[10px] mb-1">Hub Type</label>
                  <select
                    value={marketForm.type}
                    onChange={(e) => setMarketForm({ ...marketForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="retail">Retail Center</option>
                    <option value="wholesale">Wholesale Mandi</option>
                    <option value="online">Online Delivery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-muted uppercase text-[10px] mb-1">State</label>
                <input
                  type="text"
                  value={marketForm.state}
                  onChange={(e) => setMarketForm({ ...marketForm, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="marketActive"
                  checked={marketForm.active}
                  onChange={(e) => setMarketForm({ ...marketForm, active: e.target.checked })}
                  className="rounded text-cocoa"
                />
                <label htmlFor="marketActive" className="text-xs text-cocoa font-semibold cursor-pointer">
                  Market Active & Accepting Observations
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowMarketModal(false)}
                  className="px-4 py-2 rounded-lg border border-hairline text-muted hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cocoa text-white font-bold hover:bg-cocoa/90 cursor-pointer shadow-xs"
                >
                  Save Market
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT ITEM                                         */}
      {/* ============================================================== */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white border border-hairline p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-cocoa">
              {editingItem ? 'Edit Item Plausible Corridor' : 'Add New Commodity Item'}
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-bold text-muted uppercase text-[10px] mb-1">Commodity Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tomato Local"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted uppercase text-[10px] mb-1">Category</label>
                  <select
                    value={itemForm.category_id}
                    onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-muted uppercase text-[10px] mb-1">Canonical Unit</label>
                  <select
                    value={itemForm.canonical_unit}
                    onChange={(e) => setItemForm({ ...itemForm, canonical_unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none cursor-pointer font-mono"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="dozen">dozen</option>
                    <option value="piece">piece</option>
                    <option value="cylinder">cylinder</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted uppercase text-[10px] mb-1">Min Plausible Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={itemForm.min_plausible}
                    onChange={(e) => setItemForm({ ...itemForm, min_plausible: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-muted uppercase text-[10px] mb-1">Max Plausible Price (₹)</label>
                  <input
                    type="number"
                    min="2"
                    step="0.5"
                    value={itemForm.max_plausible}
                    onChange={(e) => setItemForm({ ...itemForm, max_plausible: parseFloat(e.target.value) || 2 })}
                    className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="itemActive"
                  checked={itemForm.active}
                  onChange={(e) => setItemForm({ ...itemForm, active: e.target.checked })}
                  className="rounded text-cocoa"
                />
                <label htmlFor="itemActive" className="text-xs text-cocoa font-semibold cursor-pointer">
                  Active in Essential Goods Basket
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-lg border border-hairline text-muted hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cocoa text-white font-bold hover:bg-cocoa/90 cursor-pointer shadow-xs"
                >
                  Save Item Bounds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PROVISION NEW USER                                      */}
      {/* ============================================================== */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white border border-hairline p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-cocoa">
              Provision Staff Account
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-bold text-muted uppercase text-[10px] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-muted uppercase text-[10px] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. collector.chennai@pricepulse.gov"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted uppercase text-[10px] mb-1">Role Allocation</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none cursor-pointer font-bold text-cocoa"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Analyst">Analyst</option>
                    <option value="Collector">Collector</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-muted uppercase text-[10px] mb-1">Temp Password</label>
                  <input
                    type="text"
                    placeholder="Auto: Admin@123"
                    value={userForm.temporary_password}
                    onChange={(e) => setUserForm({ ...userForm, temporary_password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-hairline bg-shelf focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {userForm.role === 'Collector' && (
                <div>
                  <label className="block font-bold text-muted uppercase text-[10px] mb-1">
                    Assign Collection Markets
                  </label>
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-hairline bg-shelf p-2 space-y-1">
                    {markets.map((m) => {
                      const isChecked = userForm.market_ids.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserForm({ ...userForm, market_ids: [...userForm.market_ids, m.id] });
                              } else {
                                setUserForm({ ...userForm, market_ids: userForm.market_ids.filter((id) => id !== m.id) });
                              }
                            }}
                            className="rounded text-cocoa"
                          />
                          <span className="font-sans text-ink">{m.name} ({m.district})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted italic pt-1">
                User will be required to configure a private password upon first sign-in.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-lg border border-hairline text-muted hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cocoa text-white font-bold hover:bg-cocoa/90 cursor-pointer shadow-xs"
                >
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
