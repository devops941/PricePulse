import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ItemTag, BasketItemSummary } from './ItemTag';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface ShelfStripProps {
  items: BasketItemSummary[];
  selectedItemIds: string[];
  onToggleSelectItem: (id: string) => void;
  onClearItemSelection: () => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  className?: string;
}

export const ShelfStrip: React.FC<ShelfStripProps> = ({
  items,
  selectedItemIds,
  onToggleSelectItem,
  onClearItemSelection,
  selectedCategory = 'All',
  onSelectCategory,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(items.map((it) => it.category)))];

  // Filter items by category chip if active
  const filteredItems =
    selectedCategory === 'All'
      ? items
      : items.filter((it) => it.category === selectedCategory);

  // Drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const scrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className={cn('bg-shelf border-b border-hairline py-2 px-4 sm:px-6 select-none', className)}>
      <div className="max-w-[1400px] mx-auto">
        
        {/* Category chips row above strip (§10.5.2) */}
        <div className="flex items-center justify-between gap-2 mb-2 overflow-x-auto scrollbar-none pb-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-muted mr-1 font-sans">
              Basket Shelf:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(cat)}
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-sans transition-all duration-150',
                  selectedCategory === cat
                    ? 'bg-cocoa text-white font-medium shadow-sm'
                    : 'bg-tile text-muted hover:text-ink border border-hairline hover:bg-cocoa-wash/40'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick scroll arrows */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <button
              onClick={() => scrollBy(-240)}
              className="p-1 rounded-full border border-hairline bg-tile hover:bg-cocoa-wash/40 text-muted hover:text-ink transition-colors"
              title="Scroll left"
            >
              <IconChevronLeft size={14} />
            </button>
            <button
              onClick={() => scrollBy(240)}
              className="p-1 rounded-full border border-hairline bg-tile hover:bg-cocoa-wash/40 text-muted hover:text-ink transition-colors"
              title="Scroll right"
            >
              <IconChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Horizontal Drag-Scrollable Shelf Strip */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className={cn(
            'flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none',
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
        >
          {/* "All Items" Tag at the start (§10.5.2) */}
          <div
            onClick={onClearItemSelection}
            className={cn(
              'price-tag-shape shrink-0 p-2.5 min-w-[130px] border rounded-sm transition-all duration-150 cursor-pointer select-none relative flex flex-col justify-between h-[66px]',
              selectedItemIds.length === 0
                ? 'bg-cocoa text-white border-cocoa-deep shadow-sm font-semibold'
                : 'bg-tile border-hairline hover:border-cocoa/50 text-ink shadow-shelf'
            )}
          >
            <div
              className={cn(
                'price-tag-hole absolute top-1 left-1',
                selectedItemIds.length === 0 ? 'bg-cocoa-wash/80 border-cocoa-deep' : 'bg-shelf border-hairline'
              )}
            />
            <span className="text-xs font-sans pl-2 tracking-wide">All Basket Items</span>
            <span className="text-[11px] font-mono pl-2 opacity-80">
              {items.length} goods tracked
            </span>
          </div>

          {/* Individual Item Tags */}
          {filteredItems.map((item) => (
            <ItemTag
              key={item.id}
              item={item}
              isSelected={selectedItemIds.includes(item.id)}
              onToggleSelect={onToggleSelectItem}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
