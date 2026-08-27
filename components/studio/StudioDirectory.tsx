'use client';

import React, { useState } from 'react';
import { Units } from '@/lib/units';
import type { TableItem, HallElement, StudioSelectedItem } from '@/types';

interface StudioDirectoryProps {
  tables: TableItem[];
  elements: HallElement[];
  selectedItem: StudioSelectedItem | null;
  onSelectItem: (type: 'table' | 'element', obj: TableItem | HallElement) => void;
}

export const StudioDirectory: React.FC<StudioDirectoryProps> = ({
  tables,
  elements,
  selectedItem,
  onSelectItem,
}) => {
  const [filter, setFilter] = useState<'all' | 'stalls' | 'elements'>('all');

  const totalCount = tables.length + elements.length;

  const items: Array<{
    type: 'table' | 'element';
    id: string;
    obj: TableItem | HallElement;
    title: string;
    subtitle: string;
    tag?: string;
  }> = [];

  if (filter === 'all' || filter === 'stalls') {
    tables.forEach((t) => {
      items.push({
        type: 'table',
        id: String(t.id || t._tempId),
        obj: t,
        title: `Stall ${t.table_number}`,
        subtitle: `${Units.formatDims(t.width, t.height)} · ${t.label || t.shape || 'Stall'}`,
        tag: 'Stall',
      });
    });
  }

  if (filter === 'all' || filter === 'elements') {
    elements.forEach((el) => {
      let tag = 'Sign';
      let title = el.label || el.text || el.name || el.type;

      if (el.type === 'room_badge') {
        tag = 'Title';
        title = el.label || 'Project Badge';
      } else if (el.type === 'hall_room') {
        tag = 'Hall';
        title = el.name || el.label || 'Secondary Hall';
      } else if (el.type === 'door') {
        tag = el.doorType === 'exit' ? 'Exit' : el.doorType === 'window' ? 'Window' : 'Door';
      } else if (el.type === 'pillar_square' || el.type === 'pillar_round') {
        tag = 'Column';
      } else if (el.type === 'stage') {
        tag = 'Stage';
      } else if (el.type === 'arrow') {
        tag = 'Flow';
      }

      items.push({
        type: 'element',
        id: String(el.id || el._tempId),
        obj: el,
        title: `${title}`,
        subtitle: `${Units.formatDims(el.width || 4, el.height || 2)}`,
        tag,
      });
    });
  }

  const selectedId = selectedItem ? String(selectedItem.obj.id || selectedItem.obj._tempId) : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white select-none">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-200 bg-zinc-50">
        <span className="font-bold text-[11px] uppercase tracking-wider text-zinc-600">
          Directory ({totalCount})
        </span>

        <div className="flex items-center gap-1 bg-zinc-200 p-0.5 rounded text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-1.5 py-0.5 rounded transition ${
              filter === 'all' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('stalls')}
            className={`px-1.5 py-0.5 rounded transition ${
              filter === 'stalls' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Stalls
          </button>
          <button
            type="button"
            onClick={() => setFilter('elements')}
            className={`px-1.5 py-0.5 rounded transition ${
              filter === 'elements' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Other
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1 text-xs">
        {items.length === 0 ? (
          <div className="text-center text-zinc-400 py-6 text-xs font-medium">No items placed yet</div>
        ) : (
          items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.type, item.obj)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition ${
                  isSelected
                    ? 'bg-zinc-100 border border-zinc-400 text-zinc-950 font-semibold'
                    : 'hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                <div className="truncate mr-2">
                  <div className="font-medium truncate">{item.title}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{item.subtitle}</div>
                </div>
                {item.tag && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-zinc-100 text-zinc-600 border border-zinc-200">
                    {item.tag}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
