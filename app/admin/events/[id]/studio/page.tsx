'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StudioHeader } from '@/components/studio/StudioHeader';
import { StudioPalette } from '@/components/studio/StudioPalette';
import { StudioCanvas } from '@/components/studio/StudioCanvas';
import { StudioInspector } from '@/components/studio/StudioInspector';
import { StudioDirectory } from '@/components/studio/StudioDirectory';
import { BlueprintPanel } from '@/components/studio/BlueprintPanel';
import { measureAspect } from '@/lib/clientImage';
import { Units } from '@/lib/units';
import { STALL_DEFAULTS } from '@/lib/constants';
import {
  DEFAULT_BLUEPRINT,
  calibrate,
  createPlacement,
  fitToHall,
  normalizeBlueprint,
  sanitizeBlueprintUrl,
} from '@/lib/blueprint';
import type { EventItem, TableItem, HallElement, StudioSelectedItem, BlueprintPlacement } from '@/types';

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  // Event & Data State
  const [event, setEvent] = useState<EventItem | null>(null);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [elements, setElements] = useState<HallElement[]>([]);
  const [selectedItem, setSelectedItem] = useState<StudioSelectedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Settings & View State
  const [snapGrid, setSnapGrid] = useState<number>(1);
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 1200,
    h: 800,
  });

  // Blueprint Underlay State
  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<BlueprintPlacement>(DEFAULT_BLUEPRINT);
  const [blueprintAspect, setBlueprintAspect] = useState<number | null>(null);
  const [isBlueprintPanelOpen, setIsBlueprintPanelOpen] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  /** Which side panel is showing as a sheet on small screens. */
  const [mobilePanel, setMobilePanel] = useState<'tools' | 'props' | null>(null);

  // Snapshot of the last state written to the server, for the unsaved marker
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [needsSnapshot, setNeedsSnapshot] = useState(false);

  const showToast = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const hallWidth = event ? Number(event.hall_width) || Units.DEFAULT_HALL_WIDTH_FT : Units.DEFAULT_HALL_WIDTH_FT;
  const hallHeight = event ? Number(event.hall_height) || Units.DEFAULT_HALL_HEIGHT_FT : Units.DEFAULT_HALL_HEIGHT_FT;
  const hallX = event ? Number(event.hall_x) || 0 : 0;
  const hallY = event ? Number(event.hall_y) || 0 : 0;
  const [shiftInteriorWithHall, setShiftInteriorWithHall] = useState(false);

  // Everything the Save button sends. Comparing it to the last saved copy is
  // what lights the unsaved-changes dot.
  const savePayload = useMemo(
    () =>
      JSON.stringify({
        name: event?.name ?? '',
        venue: event?.venue ?? '',
        hall_width: hallWidth,
        hall_height: hallHeight,
        hall_x: hallX,
        hall_y: hallY,
        hall_rotation: event?.hall_rotation || 0,
        hall_background_image: blueprintUrl,
        hall_blueprint: blueprintUrl ? blueprint : null,
        tables,
        hall_elements: elements,
      }),
    [event?.name, event?.venue, event?.hall_rotation, hallWidth, hallHeight, hallX, hallY, blueprintUrl, blueprint, tables, elements]
  );

  const hasUnsavedChanges = savedSnapshot !== null && savedSnapshot !== savePayload;

  // Take the baseline after a load or save, once the new state has landed
  useEffect(() => {
    if (needsSnapshot) {
      setSavedSnapshot(savePayload);
      setNeedsSnapshot(false);
    }
  }, [needsSnapshot, savePayload]);

  // Auto-fit ViewBox
  const fitViewBox = (
    currentTables: TableItem[],
    currentElements: HallElement[],
    currentW: number,
    currentH: number,
    currentHX: number = hallX,
    currentHY: number = hallY
  ) => {
    let minX = currentHX - 10;
    let minY = currentHY - 10;
    let maxX = currentHX + currentW + 10;
    let maxY = currentHY + currentH + 10;

    currentTables.forEach((t) => {
      const rX = (t.x || 0) + (t.width || 4);
      const bY = (t.y || 0) + (t.height || 2);
      if (t.x < minX) minX = t.x - 5;
      if (t.y < minY) minY = t.y - 5;
      if (rX > maxX) maxX = rX + 5;
      if (bY > maxY) maxY = bY + 5;
    });

    currentElements.forEach((el) => {
      const rX = (el.x || 0) + (el.width || 4);
      const bY = (el.y || 0) + (el.height || 2);
      if (el.x < minX) minX = el.x - 5;
      if (el.y < minY) minY = el.y - 5;
      if (rX > maxX) maxX = rX + 5;
      if (bY > maxY) maxY = bY + 5;
    });

    const padX = 14;
    const padY = 14;
    const xPx = Units.ftToPx(minX - padX);
    const yPx = Units.ftToPx(minY - padY);
    const wPx = Units.ftToPx(maxX - minX + padX * 2);
    const hPx = Units.ftToPx(maxY - minY + padY * 2);

    setViewBox({ x: xPx, y: yPx, w: Math.max(wPx, 800), h: Math.max(hPx, 600) });
  };

  // Load Event and Tables (runs only on mount / eventId change)
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!eventId) return;
      setIsLoading(true);

      try {
        const [eventRes, tablesRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/tables`),
        ]);

        if (eventRes.status === 401) {
          router.push('/admin/login');
          return;
        }

        if (!eventRes.ok) throw new Error('Failed to load exhibition details');

        const eventData: EventItem = await eventRes.json();
        if (!isMounted) return;
        setEvent(eventData);

        // Blueprint underlay: the URL and its placement are stored apart, so
        // rebuild the pair and re-measure the image's true aspect ratio.
        const savedUrl = sanitizeBlueprintUrl(eventData.hall_background_image);
        setBlueprintUrl(savedUrl);
        setBlueprint(
          savedUrl
            ? normalizeBlueprint(eventData.hall_blueprint, eventData.hall_width, eventData.hall_height)
            : createPlacement(eventData.hall_width, eventData.hall_height)
        );
        setBlueprintAspect(null);

        if (savedUrl) {
          measureAspect(savedUrl).then((aspect) => {
            if (isMounted) setBlueprintAspect(aspect);
          });
        }

        let initialElements: HallElement[] = [];
        if (eventData.hall_elements) {
          try {
            initialElements = Array.isArray(eventData.hall_elements)
              ? eventData.hall_elements
              : JSON.parse(eventData.hall_elements as string);
          } catch (e) {
            initialElements = [];
          }
        }

        // Ensure main badge exists
        if (!initialElements.some((el) => el.type === 'room_badge' && !el.targetHallId)) {
          initialElements.unshift({
            id: 'room_badge_main',
            type: 'room_badge',
            label: eventData.name || 'Main Hall',
            x: 1.5,
            y: 1.5,
            width: 8,
            height: 3,
            rotation: 0,
          });
        }

        // Ensure secondary hall rooms have badges
        initialElements
          .filter((el) => el.type === 'hall_room')
          .forEach((room) => {
            const roomId = String(room.id || room._tempId);
            if (!initialElements.some((el) => el.type === 'room_badge' && String(el.targetHallId) === roomId)) {
              initialElements.push({
                id: 'badge_' + roomId,
                type: 'room_badge',
                targetHallId: roomId,
                label: room.name || room.label || 'Secondary Hall',
                x: Units.roundFt((room.x || 0) + 1.5),
                y: Units.roundFt((room.y || 0) + 1.5),
                width: 8,
                height: 3,
                rotation: 0,
              });
            }
          });

        setElements(initialElements);

        let loadedTables: TableItem[] = [];
        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          loadedTables = Array.isArray(tablesData) ? tablesData : [];
          setTables(loadedTables);
        }

        fitViewBox(loadedTables, initialElements, eventData.hall_width, eventData.hall_height, eventData.hall_x || 0, eventData.hall_y || 0);
        setNeedsSnapshot(true);
      } catch (err: any) {
        if (isMounted) showToast(err.message || 'Error loading studio', 'error');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [eventId, router]);

  // Helpers
  const getNextTableNum = () => {
    const existing = new Set(tables.map((t) => parseInt(t.table_number)).filter((n) => !isNaN(n)));
    let num = 1;
    while (existing.has(num)) num++;
    return String(num);
  };

  // Add Stall
  const handleAddTable = (shape: keyof typeof STALL_DEFAULTS) => {
    const preset = STALL_DEFAULTS[shape] || STALL_DEFAULTS.single;
    const tableNum = getNextTableNum();

    const newTable: TableItem = {
      _tempId: 'table_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      table_number: tableNum,
      label: preset.label,
      size: preset.size,
      price: 0,
      width: preset.width,
      height: preset.height,
      x: 4,
      y: 4,
      rotation: 0,
      shape: preset.shape,
      status: 'available',
    };

    const nextTables = [...tables, newTable];
    setTables(nextTables);
    setSelectedItem({ type: 'table', obj: newTable });
    fitViewBox(nextTables, elements, hallWidth, hallHeight);
    showToast(`Added Stall ${tableNum} (${preset.width}' × ${preset.height}')`, 'success');
  };

  // Add Secondary Hall Room
  const handleAddHallRoom = (preset: { width: number; height: number; name?: string }) => {
    const w = preset.width || 30;
    const h = preset.height || 20;

    const existingHalls = elements.filter((el) => el.type === 'hall_room');
    const nextLetter = String.fromCharCode(66 + existingHalls.length);
    const defaultName = preset.name || `Hall ${nextLetter}`;

    let targetX = hallWidth + 6;
    if (existingHalls.length > 0) {
      const last = existingHalls[existingHalls.length - 1];
      targetX = (last.x || 0) + (last.width || 30) + 6;
    }

    const roomId = 'hall_room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newRoom: HallElement = {
      id: roomId,
      type: 'hall_room',
      name: defaultName,
      label: defaultName,
      width: w,
      height: h,
      x: Units.roundFt(targetX),
      y: 0,
      rotation: 0,
    };

    const newBadge: HallElement = {
      id: 'badge_' + roomId,
      type: 'room_badge',
      targetHallId: roomId,
      label: defaultName,
      x: Units.roundFt(targetX + 1.5),
      y: 1.5,
      width: 8,
      height: 3,
      rotation: 0,
    };

    const nextElements = [...elements, newRoom, newBadge];
    setElements(nextElements);
    setSelectedItem({ type: 'element', obj: newRoom });
    fitViewBox(tables, nextElements, hallWidth, hallHeight);
    showToast(`Added ${defaultName} (${w}' × ${h}')`, 'success');
  };

  // Prompt Custom Hall
  const handlePromptCustomHall = () => {
    const w = parseFloat(prompt('Enter Hall Width in feet (e.g. 35):', '35') || '35') || 35;
    const h = parseFloat(prompt('Enter Hall Depth in feet (e.g. 25):', '25') || '25') || 25;
    const name = prompt('Enter Hall Name / Title:', 'Hall B') || 'Hall B';
    handleAddHallRoom({ width: Math.max(10, w), height: Math.max(10, h), name: name.trim() });
  };

  // Add Door
  const handleAddDoor = (doorType: 'entrance' | 'exit' | 'double' | 'window') => {
    const isDouble = doorType === 'double';
    const isWindow = doorType === 'window';
    const width = isDouble || isWindow ? 6 : 4;

    const newDoor: HallElement = {
      id: 'door_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'door',
      doorType,
      label: doorType === 'entrance' ? 'Main Entrance' : doorType === 'exit' ? 'Emergency Exit' : doorType,
      x: Units.roundFt(hallWidth / 2 - width / 2),
      y: -0.4,
      width,
      height: 0.8,
      rotation: 0,
    };

    const nextElements = [...elements, newDoor];
    setElements(nextElements);
    setSelectedItem({ type: 'element', obj: newDoor });
    showToast(`Added ${newDoor.label}`, 'success');
  };

  // Add Text Sign
  const handleAddText = (text: string, options: { badge?: boolean; color?: string } = {}) => {
    const isTransparent = options.badge === false || options.color === 'transparent';
    const newText: HallElement = {
      id: 'sign_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'text',
      text,
      label: text,
      badge: options.badge ?? (!isTransparent),
      color: options.color || (isTransparent ? 'transparent' : '#27272a'),
      textColor: isTransparent ? '#18181b' : '#ffffff',
      fontSize: 10,
      fontWeight: '700',
      fontStyle: 'normal',
      textAlign: 'center',
      letterSpacing: 0,
      textTransform: 'uppercase',
      width: Math.max(text.length * 0.9, 6),
      height: 2.2,
      x: Units.roundFt(hallWidth / 2 - 3),
      y: 3,
      rotation: 0,
    };

    const nextElements = [...elements, newText];
    setElements(nextElements);
    setSelectedItem({ type: 'element', obj: newText });
    showToast(`Added Sign: "${text}"`, 'success');
  };

  // Prompt Custom Text
  const handlePromptCustomText = () => {
    const text = prompt('Enter Sign / Label text:', 'VIP LOUNGE');
    if (text && text.trim()) {
      handleAddText(text.trim(), { badge: true, color: '#27272a' });
    }
  };

  // Add Structure
  const handleAddStructure = (structType: 'pillar_square' | 'pillar_round' | 'stage' | 'arrow') => {
    let width = 2;
    let height = 2;
    let label = 'Pillar';

    if (structType === 'stage') {
      width = 16;
      height = 8;
      label = 'Main Stage';
    } else if (structType === 'arrow') {
      width = 4;
      height = 2;
      label = 'Directional Arrow';
    }

    const newStruct: HallElement = {
      id: 'struct_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: structType,
      label,
      width,
      height,
      x: Units.roundFt(hallWidth / 2 - width / 2),
      y: Units.roundFt(hallHeight / 2 - height / 2),
      rotation: 0,
    };

    const nextElements = [...elements, newStruct];
    setElements(nextElements);
    setSelectedItem({ type: 'element', obj: newStruct });
    showToast(`Added ${label}`, 'success');
  };

  // Move Main Hall ONLY (WITHOUT moving blueprint or interior things)
  const handleMoveMainHall = (newX: number, newY: number, shiftContents = shiftInteriorWithHall) => {
    if (!event) return;
    const currentHX = Number(event.hall_x) || 0;
    const currentHY = Number(event.hall_y) || 0;
    const dx = Units.roundFt(newX - currentHX);
    const dy = Units.roundFt(newY - currentHY);

    if (dx === 0 && dy === 0) return;

    const updatedEvent = { ...event, hall_x: Units.roundFt(newX), hall_y: Units.roundFt(newY) };
    setEvent(updatedEvent);

    // Only shift tables/elements if explicitly opted in; blueprint NEVER shifts with hall
    if (shiftContents) {
      setTables((prev) =>
        prev.map((t) => ({
          ...t,
          x: Units.roundFt(t.x + dx),
          y: Units.roundFt(t.y + dy),
        }))
      );

      setElements((prev) =>
        prev.map((el) => {
          if (el.type === 'hall_room' || (el.type === 'room_badge' && el.targetHallId)) {
            return el;
          }
          return {
            ...el,
            x: Units.roundFt(el.x + dx),
            y: Units.roundFt(el.y + dy),
          };
        })
      );

      if (selectedItem) {
        if (selectedItem.type === 'table') {
          const t = selectedItem.obj as TableItem;
          setSelectedItem({ type: 'table', obj: { ...t, x: Units.roundFt(t.x + dx), y: Units.roundFt(t.y + dy) } });
        } else if (selectedItem.type === 'element') {
          const el = selectedItem.obj as HallElement;
          if (el.type !== 'hall_room' && !(el.type === 'room_badge' && el.targetHallId)) {
            setSelectedItem({ type: 'element', obj: { ...el, x: Units.roundFt(el.x + dx), y: Units.roundFt(el.y + dy) } });
          }
        }
      }
    }
  };

  // Update Main Hall Property
  const handleUpdateMainHall = (prop: 'name' | 'hall_width' | 'hall_height' | 'hall_x' | 'hall_y' | 'venue', val: any) => {
    if (!event) return;
    const updated = { ...event };

    if (prop === 'name') {
      updated.name = val;
      setElements((prev) =>
        prev.map((el) => (el.type === 'room_badge' && !el.targetHallId ? { ...el, label: val } : el))
      );
    } else if (prop === 'hall_width') {
      const parsed = parseFloat(val);
      updated.hall_width = isNaN(parsed) ? val : parsed;
    } else if (prop === 'hall_height') {
      const parsed = parseFloat(val);
      updated.hall_height = isNaN(parsed) ? val : parsed;
    } else if (prop === 'hall_x' || prop === 'hall_y') {
      const parsed = parseFloat(val);
      const newX = prop === 'hall_x' ? (isNaN(parsed) ? 0 : parsed) : (event.hall_x || 0);
      const newY = prop === 'hall_y' ? (isNaN(parsed) ? 0 : parsed) : (event.hall_y || 0);
      handleMoveMainHall(newX, newY);
      return;
    } else if (prop === 'venue') {
      updated.venue = val;
    }

    setEvent(updated);
    const validW = Units.toFeet(updated.hall_width, 30);
    const validH = Units.toFeet(updated.hall_height, 20);
    fitViewBox(tables, elements, validW, validH, updated.hall_x || 0, updated.hall_y || 0);
  };

  // Update Selected Item Property
  const handleUpdateItemProp = (prop: string, val: any) => {
    if (!selectedItem) return;

    if (selectedItem.type === 'table') {
      const table = selectedItem.obj as TableItem;
      const updated = { ...table, [prop]: val };
      setTables((prev) => prev.map((t) => ((t.id && t.id === table.id) || (t._tempId && t._tempId === table._tempId) ? updated : t)));
      setSelectedItem({ type: 'table', obj: updated });
    } else {
      const elem = selectedItem.obj as HallElement;
      const updated = { ...elem, [prop]: val };
      if (prop === 'text' || prop === 'label') {
        updated.text = val;
        updated.label = val;
        if (elem.type === 'room_badge' && !elem.targetHallId && event) {
          setEvent({ ...event, name: val });
        }
      }
      if (prop === 'name') {
        updated.label = val;
      }

      // Auto-resize text sign background to fit content
      if (elem.type === 'text' && (prop === 'fontSize' || prop === 'text' || prop === 'label' || prop === 'fontWeight' || prop === 'letterSpacing')) {
        const PX_PER_FOOT = 12;
        const fontSize = prop === 'fontSize' ? val : (updated.fontSize ?? 10);
        const text = updated.text || updated.label || 'SIGN';
        const isBold = (updated.fontWeight === '700' || updated.fontWeight === '800' || updated.fontWeight === '900' || updated.fontWeight === 'bold');
        const letterSpacing = prop === 'letterSpacing' ? val : (updated.letterSpacing ?? 0);
        // Approximate char width: ~0.6em for normal, ~0.65em for bold
        const charWidthFactor = isBold ? 0.65 : 0.6;
        const textWidthPx = text.length * (fontSize * charWidthFactor + letterSpacing) + fontSize * 1.5; // + padding
        const textHeightPx = fontSize * 2.2 + 8; // font + vertical padding
        const minWidthFt = Units.roundFt(Math.max(textWidthPx / PX_PER_FOOT, 3));
        const minHeightFt = Units.roundFt(Math.max(textHeightPx / PX_PER_FOOT, 1.5));
        updated.width = Math.max(minWidthFt, 3);
        updated.height = Math.max(minHeightFt, 1.5);
      }

      setElements((prev) => prev.map((el) => ((el.id && el.id === elem.id) || (el._tempId && el._tempId === elem._tempId) ? updated : el)));
      setSelectedItem({ type: 'element', obj: updated });
    }
  };

  // Update Secondary Hall Name
  const handleUpdateSecondaryHallName = (targetHallId: string, name: string) => {
    setElements((prev) =>
      prev.map((el) => {
        if (String(el.id || el._tempId) === String(targetHallId)) {
          return { ...el, name, label: name };
        }
        if (String(el.targetHallId) === String(targetHallId)) {
          return { ...el, label: name };
        }
        return el;
      })
    );
  };

  // Position Drag Update
  const handleUpdatePosition = (type: 'table' | 'element', obj: TableItem | HallElement, x: number, y: number) => {
    if (type === 'table') {
      const table = obj as TableItem;
      const updated = { ...table, x, y };
      setTables((prev) => prev.map((t) => ((t.id && t.id === table.id) || (t._tempId && t._tempId === table._tempId) ? updated : t)));
      setSelectedItem({ type: 'table', obj: updated });
    } else {
      const elem = obj as HallElement;
      const updated = { ...elem, x, y };
      setElements((prev) => prev.map((el) => ((el.id && el.id === elem.id) || (el._tempId && el._tempId === elem._tempId) ? updated : el)));
      setSelectedItem({ type: 'element', obj: updated });
    }
  };

  // Rotate Selected
  const handleRotateSelected = () => {
    if (!selectedItem) return;
    const obj = selectedItem.obj;
    const newRot = ((obj.rotation || 0) + 90) % 360;
    handleUpdateItemProp('rotation', newRot);
  };

  // Flip Selected
  const handleFlipSelected = () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'table') {
      const table = selectedItem.obj as TableItem;
      if (table.shape && table.shape.startsWith('L')) {
        handleToggleInvertL();
        return;
      }
      const newW = table.height;
      const newH = table.width;
      setTables((prev) =>
        prev.map((t) =>
          (t.id && t.id === table.id) || (t._tempId && t._tempId === table._tempId) ? { ...t, width: newW, height: newH } : t
        )
      );
      setSelectedItem({ type: 'table', obj: { ...table, width: newW, height: newH } });
      showToast(`Flipped (${newW}' × ${newH}')`, 'info');
    } else {
      const elem = selectedItem.obj as HallElement;
      if (elem.type === 'door') {
        const newRot = ((elem.rotation || 0) + 180) % 360;
        const updated = { ...elem, rotation: newRot };
        setElements((prev) =>
          prev.map((el) => ((el.id && el.id === elem.id) || (el._tempId && el._tempId === elem._tempId) ? updated : el))
        );
        setSelectedItem({ type: 'element', obj: updated });
        showToast('Door flipped', 'info');
      } else {
        const curW = elem.width || 4;
        const curH = elem.height || 2;
        const newW = curH;
        const newH = curW;
        const updated = { ...elem, width: newW, height: newH };
        setElements((prev) =>
          prev.map((el) => ((el.id && el.id === elem.id) || (el._tempId && el._tempId === elem._tempId) ? updated : el))
        );
        setSelectedItem({ type: 'element', obj: updated });
        showToast(`Flipped (${newW}' × ${newH}')`, 'info');
      }
    }
  };

  // Toggle Invert L-Stall
  const handleToggleInvertL = () => {
    if (!selectedItem || selectedItem.type !== 'table') return;
    const table = selectedItem.obj as TableItem;
    const isCurrentlyInverted = table.shape === 'L-Stall-Inverted' || table.shape === 'L-Inverted';
    const newShape = isCurrentlyInverted ? 'L-Stall' : 'L-Stall-Inverted';
    const newLabel = isCurrentlyInverted ? 'L-Stall (L)' : 'L-Inverted (⅃)';

    setTables((prev) =>
      prev.map((t) =>
        (t.id && t.id === table.id) || (t._tempId && t._tempId === table._tempId)
          ? { ...t, shape: newShape, label: newLabel }
          : t
      )
    );
    setSelectedItem({ type: 'table', obj: { ...table, shape: newShape, label: newLabel } });
    showToast(`Inverted to ${isCurrentlyInverted ? 'Left-Hand L' : 'Right-Hand Inverted ⅃'}`, 'info');
  };

  // Duplicate Selected
  const handleDuplicateSelected = () => {
    if (!selectedItem) return;

    if (selectedItem.type === 'table') {
      const table = selectedItem.obj as TableItem;
      const tableNum = getNextTableNum();
      const copy: TableItem = {
        ...table,
        id: undefined,
        _tempId: 'table_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        table_number: tableNum,
        x: table.x + 1,
        y: table.y + 1,
        status: 'available',
      };
      const nextTables = [...tables, copy];
      setTables(nextTables);
      setSelectedItem({ type: 'table', obj: copy });
      showToast(`Duplicated Stall ${tableNum}`, 'success');
    } else {
      const elem = selectedItem.obj as HallElement;
      const copy: HallElement = {
        ...elem,
        id: (elem.type || 'elem') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        _tempId: undefined,
        x: elem.x + 1,
        y: elem.y + 1,
      };
      const nextElements = [...elements, copy];
      setElements(nextElements);
      setSelectedItem({ type: 'element', obj: copy });
      showToast(`Duplicated ${copy.label || copy.type}`, 'success');
    }
  };

  // Delete Selected
  const handleDeleteSelected = () => {
    if (!selectedItem) return;

    if (selectedItem.type === 'table') {
      const table = selectedItem.obj as TableItem;
      if (table.status === 'booked') {
        showToast('Cannot delete a booked stall.', 'error');
        return;
      }
      setTables((prev) => prev.filter((t) => (t.id ? t.id !== table.id : t._tempId !== table._tempId)));
      setSelectedItem(null);
      showToast(`Removed Stall ${table.table_number}`, 'success');
    } else {
      const elem = selectedItem.obj as HallElement;
      if (elem.type === 'room_badge') {
        const isMainBadge = !elem.targetHallId;
        const matchingBadges = elements.filter((el) =>
          el.type === 'room_badge' &&
          (isMainBadge ? !el.targetHallId : String(el.targetHallId) === String(elem.targetHallId))
        );
        // Only block deletion if it's the sole remaining badge
        if (matchingBadges.length <= 1) {
          showToast('Primary Hall badge cannot be deleted.', 'info');
          return;
        }
      }
      const elemId = String(elem.id || elem._tempId);
      setElements((prev) =>
        prev.filter((el) => {
          if (elem.type === 'hall_room' && String(el.targetHallId) === elemId) return false;
          const currentId = String(el.id || el._tempId);
          return currentId !== elemId;
        })
      );
      setSelectedItem(null);
      showToast(`Removed "${elem.label || elem.type}"`, 'success');
    }
  };

  // Whole Floor Rotation (CW, CCW, 180°)
  const handleRotateEntireFloor = (mode: 'cw' | 'ccw' | '180') => {
    if (!event) return;
    const oldW = hallWidth;
    const oldH = hallHeight;

    if (mode === '180') {
      setTables((prev) =>
        prev.map((t) => ({
          ...t,
          x: Units.roundFt(oldW - (t.x + t.width)),
          y: Units.roundFt(oldH - (t.y + t.height)),
          rotation: ((t.rotation || 0) + 180) % 360,
        }))
      );
      setElements((prev) =>
        prev.map((el) => ({
          ...el,
          x: Units.roundFt(oldW - (el.x + (el.width || 4))),
          y: Units.roundFt(oldH - (el.y + (el.height || 2))),
          rotation: ((el.rotation || 0) + 180) % 360,
        }))
      );
      showToast('Whole floor rotated 180°', 'success');
    } else if (mode === 'cw') {
      const newW = oldH;
      const newH = oldW;
      setEvent({ ...event, hall_width: newW, hall_height: newH });

      setTables((prev) =>
        prev.map((t) => ({
          ...t,
          x: Units.roundFt(oldH - (t.y + t.height)),
          y: Units.roundFt(t.x),
          width: t.height,
          height: t.width,
          rotation: ((t.rotation || 0) + 90) % 360,
        }))
      );
      setElements((prev) =>
        prev.map((el) => ({
          ...el,
          x: Units.roundFt(oldH - (el.y + (el.height || 2))),
          y: Units.roundFt(el.x),
          width: el.height || 2,
          height: el.width || 4,
          rotation: ((el.rotation || 0) + 90) % 360,
        }))
      );
      showToast(`Whole floor rotated 90° Clockwise (${Units.formatDims(newW, newH)})`, 'success');
    } else if (mode === 'ccw') {
      const newW = oldH;
      const newH = oldW;
      setEvent({ ...event, hall_width: newW, hall_height: newH });

      setTables((prev) =>
        prev.map((t) => ({
          ...t,
          x: Units.roundFt(t.y),
          y: Units.roundFt(oldW - (t.x + t.width)),
          width: t.height,
          height: t.width,
          rotation: ((t.rotation || 0) + 270) % 360,
        }))
      );
      setElements((prev) =>
        prev.map((el) => ({
          ...el,
          x: Units.roundFt(el.y),
          y: Units.roundFt(oldW - (el.x + (el.width || 4))),
          width: el.height || 2,
          height: el.width || 4,
          rotation: ((el.rotation || 0) + 270) % 360,
        }))
      );
      showToast(`Whole floor rotated 90° Counter-Clockwise (${Units.formatDims(newW, newH)})`, 'success');
    }
  };

  /* ------------------------------------------------------------------
     Blueprint underlay
     ------------------------------------------------------------------ */

  // Attach a freshly uploaded or linked image, sized to the hall at its own
  // aspect ratio so it starts undistorted.
  const handleAttachBlueprint = (url: string, aspect: number | null) => {
    setBlueprintUrl(url);
    setBlueprintAspect(aspect);
    setBlueprint(createPlacement(hallWidth, hallHeight, aspect ?? undefined));
    setIsCalibrating(false);
  };

  const handleRemoveBlueprint = () => {
    setBlueprintUrl(null);
    setBlueprintAspect(null);
    setBlueprint(createPlacement(hallWidth, hallHeight));
    setIsCalibrating(false);
    showToast('Blueprint removed — save to make it stick', 'info');
  };

  const handleUpdateBlueprint = (patch: Partial<BlueprintPlacement>) => {
    setBlueprint((prev) => ({ ...prev, ...patch }));
  };

  const handleFitBlueprintToHall = () => {
    setBlueprint((prev) => ({ ...prev, ...fitToHall(hallWidth, hallHeight, blueprintAspect ?? undefined) }));
    showToast('Blueprint fitted to the hall', 'info');
  };

  // Undo any stretching by letting the current width dictate the height
  const handleResetBlueprintAspect = () => {
    if (!blueprintAspect) return;
    setBlueprint((prev) => ({ ...prev, height: Units.roundFt(prev.width / blueprintAspect) }));
    showToast('Blueprint restored to its natural proportions', 'info');
  };

  const handleCalibrateBlueprint = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    realFt: number
  ) => {
    const next = calibrate(blueprint, from, to, realFt);

    if (!next) {
      showToast('Those two points are too close together to calibrate from', 'error');
      return;
    }

    const factor = next.width / blueprint.width;
    setBlueprint(next);
    setBlueprintAspect(next.width / next.height);
    setIsCalibrating(false);
    showToast(
      `Calibrated — blueprint rescaled ${factor.toFixed(2)}× to ${Units.formatFeetShort(next.width)} wide`,
      'success'
    );
  };

  // Save Floor Plan
  const handleSave = async () => {
    if (!eventId || !event) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/events/${eventId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: event.name,
          venue: event.venue,
          hall_width: hallWidth,
          hall_height: hallHeight,
          hall_x: hallX,
          hall_y: hallY,
          hall_rotation: event.hall_rotation || 0,
          hall_background_image: blueprintUrl,
          hall_blueprint: blueprintUrl ? blueprint : null,
          tables,
          hall_elements: elements,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          showToast('Session expired. Redirecting to login...', 'error');
          setTimeout(() => router.push('/admin/login'), 1200);
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save layout');
      }

      const data = await res.json();
      if (data.tables) setTables(data.tables);
      if (data.event) {
        setEvent(data.event);

        const savedUrl = sanitizeBlueprintUrl(data.event.hall_background_image);
        setBlueprintUrl(savedUrl);
        if (savedUrl) {
          setBlueprint(normalizeBlueprint(data.event.hall_blueprint, data.event.hall_width, data.event.hall_height));
        }
      }

      setSelectedItem(null);
      setNeedsSnapshot(true);
      showToast('Floor plan saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save floor plan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Zoom Helpers
  const handleZoomIn = () => {
    setViewBox((prev) => {
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const newW = prev.w * 0.8;
      const newH = prev.h * 0.8;
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    });
  };

  const handleZoomOut = () => {
    setViewBox((prev) => {
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const newW = prev.w * 1.25;
      const newH = prev.h * 1.25;
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    });
  };

  if (isLoading) {
    return (
      <div className="h-dvh w-full flex items-center justify-center bg-zinc-50 text-zinc-600 font-medium text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <span>Loading Floor Plan Studio...</span>
        </div>
      </div>
    );
  }

  return (
    /* h-dvh, not h-screen: on phones the address bar makes 100vh overflow */
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-zinc-100 font-sans">
      {/* Studio Header Bar */}
      <StudioHeader
        event={event}
        hallWidth={hallWidth}
        hallHeight={hallHeight}
        snapGrid={snapGrid}
        onSetSnapGrid={setSnapGrid}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={() => fitViewBox(tables, elements, hallWidth, hallHeight, hallX, hallY)}
        onRotateFloor={handleRotateEntireFloor}
        onSave={handleSave}
        isSaving={isSaving}
        blueprintOpen={isBlueprintPanelOpen}
        hasBlueprint={Boolean(blueprintUrl)}
        onToggleBlueprint={() => {
          setMobilePanel(null);
          setIsBlueprintPanelOpen((prev) => {
            if (prev) setIsCalibrating(false);
            return !prev;
          });
        }}
        hasUnsavedChanges={hasUnsavedChanges}
        mobilePanel={mobilePanel}
        onToggleMobilePanel={(panel) => setMobilePanel((prev) => (prev === panel ? null : panel))}
      />

      {/* 3-Column Studio Workspace. Below lg the two side panels become
          sheets over the canvas, so the drawing area keeps the full width. */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Dim the canvas while a sheet is open, and close on tap */}
        {mobilePanel && (
          <div
            onClick={() => setMobilePanel(null)}
            aria-hidden="true"
            className="lg:hidden absolute inset-0 z-20 bg-zinc-900/40"
          />
        )}

        {/* 1. Left Palette Toolbox */}
        <div
          className={`${
            mobilePanel === 'tools' ? 'flex' : 'hidden'
          } lg:flex absolute lg:static inset-y-0 left-0 z-30 shadow-2xl lg:shadow-none`}
        >
          <StudioPalette
          onAddTable={handleAddTable}
          onAddHallRoom={handleAddHallRoom}
          onPromptCustomHall={handlePromptCustomHall}
          onAddDoor={handleAddDoor}
          onAddText={handleAddText}
          onPromptCustomText={handlePromptCustomText}
            onAddStructure={handleAddStructure}
          />
        </div>

        {/* 2. Center CAD SVG Canvas */}
        <div className="flex-1 h-full relative flex">
          <StudioCanvas
            hallWidth={hallWidth}
            hallHeight={hallHeight}
            hallX={hallX}
            hallY={hallY}
            onMoveMainHall={handleMoveMainHall}
            tables={tables}
            elements={elements}
            selectedItem={selectedItem}
            snapGrid={snapGrid}
            onSelectItem={(type, obj) => setSelectedItem({ type, obj })}
            onDeselect={() => setSelectedItem(null)}
            onUpdatePosition={handleUpdatePosition}
            onRotateSelected={handleRotateSelected}
            onFlipSelected={handleFlipSelected}
            onDuplicateSelected={handleDuplicateSelected}
            onDeleteSelected={handleDeleteSelected}
            eventName={event?.name || 'Main Hall'}
            zoomLevel={1}
            viewBox={viewBox}
            onUpdateViewBox={setViewBox}
            blueprintUrl={blueprintUrl}
            blueprint={blueprint}
            blueprintActive={isBlueprintPanelOpen}
            onUpdateBlueprint={handleUpdateBlueprint}
            isCalibrating={isCalibrating}
            onCalibrate={handleCalibrateBlueprint}
            onCancelCalibration={() => setIsCalibrating(false)}
          />

          <BlueprintPanel
            open={isBlueprintPanelOpen}
            onClose={() => {
              setIsBlueprintPanelOpen(false);
              setIsCalibrating(false);
            }}
            url={blueprintUrl}
            placement={blueprint}
            naturalAspect={blueprintAspect}
            hallWidth={hallWidth}
            hallHeight={hallHeight}
            isCalibrating={isCalibrating}
            onAttach={handleAttachBlueprint}
            onRemove={handleRemoveBlueprint}
            onUpdate={handleUpdateBlueprint}
            onFitToHall={handleFitBlueprintToHall}
            onResetAspect={handleResetBlueprintAspect}
            onStartCalibration={() => setIsCalibrating(true)}
            onCancelCalibration={() => setIsCalibrating(false)}
            onNotify={showToast}
          />
        </div>

        {/* 3. Right Inspector & Directory */}
        <aside
          className={`${
            mobilePanel === 'props' ? 'flex' : 'hidden'
          } lg:flex absolute lg:static inset-y-0 right-0 z-30 w-[280px] max-w-[85vw] bg-white border-l border-zinc-200 flex-col h-full overflow-y-auto select-none shrink-0 shadow-2xl lg:shadow-none`}
        >
          <StudioInspector
            selectedItem={selectedItem}
            event={event}
            hallWidth={hallWidth}
            hallHeight={hallHeight}
            hallX={hallX}
            hallY={hallY}
            onUpdateMainHall={handleUpdateMainHall}
            onMoveMainHall={handleMoveMainHall}
            shiftInteriorWithHall={shiftInteriorWithHall}
            onToggleShiftInterior={setShiftInteriorWithHall}
            onUpdateItemProp={handleUpdateItemProp}
            onRotateSelected={handleRotateSelected}
            onFlipSelected={handleFlipSelected}
            onToggleInvertL={handleToggleInvertL}
            onUpdateSecondaryHallName={handleUpdateSecondaryHallName}
            allElements={elements}
          />
          <StudioDirectory
            tables={tables}
            elements={elements}
            selectedItem={selectedItem}
            onSelectItem={(type, obj) => setSelectedItem({ type, obj })}
          />
        </aside>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl transition-all ${
            toastMessage.type === 'success'
              ? 'bg-zinc-900 text-white border border-zinc-700'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border border-rose-700'
              : 'bg-zinc-900 text-white border border-zinc-700'
          }`}
        >
          {toastMessage.text}
        </div>
      )}
    </div>
  );
}
