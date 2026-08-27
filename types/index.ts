export type TableStatus = 'available' | 'booked' | 'reserved' | 'selected';

export type TableShape = 'rect' | 'single' | 'double' | 'L-Stall' | 'L-Stall-Inverted' | 'L-Inverted' | 'T-Stall' | 'Pod';

export interface TableItem {
  id?: number | string;
  _tempId?: string;
  event_id?: number;
  table_number: string;
  label?: string;
  size?: string;
  price: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  shape?: string;
  status?: TableStatus;
  created_at?: string;
  updated_at?: string;
}

export type HallElementType =
  | 'door'
  | 'text'
  | 'room_badge'
  | 'hall_room'
  | 'pillar_square'
  | 'pillar_round'
  | 'stage'
  | 'arrow';

export interface HallElement {
  id: string;
  _tempId?: string;
  type: HallElementType;
  name?: string;
  label?: string;
  text?: string;
  doorType?: 'entrance' | 'exit' | 'double' | 'window';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  flip?: boolean;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  badge?: boolean;
  targetHallId?: string;
}

export interface EventItem {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  hall_width: number;
  hall_height: number;
  hall_rotation?: number;
  hall_elements?: HallElement[] | string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  total_tables?: number;
  booked_tables?: number;
  available_tables?: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface BookingItem {
  id: number;
  event_id: number;
  table_id: number;
  user_name: string;
  user_email: string;
  user_phone: string;
  notes?: string;
  status: BookingStatus;
  booking_code?: string;
  total_amount?: number;
  created_at: string;
  event_name?: string;
  event_date?: string;
  venue?: string;
  table_number?: string;
  table_label?: string;
  table_price?: number;
  table_width?: number;
  table_height?: number;
}

export interface UserSession {
  id: number;
  username: string;
  role: string;
}

export interface StudioSelectedItem {
  type: 'table' | 'element';
  obj: TableItem | HallElement;
}
