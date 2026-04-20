export type EntityId = string;

export type CurrencyCode = 'USD';

export type ReservationStatus =
  | 'Confirmed'
  | 'Pending'
  | 'Cancelled'
  | 'Checked-in'
  | 'Checked-out';

export type RoomStatus =
  | 'Available'
  | 'Occupied'
  | 'Cleaning'
  | 'Maintenance'
  | 'Reserved';

export type TaskPriority = 'Urgent' | 'High' | 'Normal' | 'Low';

export type TaskStatus = 'Open' | 'In Progress' | 'Resolved';

export type OrderStatus = 'New' | 'Preparing' | 'Delivered';

export type ChannelConnectionStatus = 'Connected' | 'Disconnected' | 'Syncing';

export interface GuestProfile {
  id: EntityId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loyaltyTier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  createdAt: string;
}

export interface Room {
  id: EntityId;
  roomNumber: string;
  roomType: string;
  floor: number;
  baseRate: number;
  status: RoomStatus;
  maxOccupancy: number;
}

export interface RatePlan {
  id: EntityId;
  code: string;
  name: string;
  cancellationPolicy: string;
  mealPlan: 'Room Only' | 'Bed & Breakfast' | 'Half Board' | 'Full Board';
  isActive: boolean;
}

export interface Reservation {
  id: EntityId;
  guestId: EntityId;
  roomId: EntityId;
  ratePlanId: EntityId;
  channel: string;
  status: ReservationStatus;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  totalAmount: number;
  currency: CurrencyCode;
  createdAt: string;
}

export interface FolioLineItem {
  id: EntityId;
  folioId: EntityId;
  description: string;
  quantity: number;
  unitPrice: number;
  postedAt: string;
}

export interface Folio {
  id: EntityId;
  reservationId: EntityId;
  isClosed: boolean;
  currency: CurrencyCode;
  lineItems: FolioLineItem[];
}

export interface HousekeepingTask {
  id: EntityId;
  roomId: EntityId;
  assignedStaffId: EntityId;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string;
  notes?: string;
}

export interface StaffMember {
  id: EntityId;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Front Desk' | 'Housekeeping' | 'Manager' | 'F&B';
  shift: 'Morning' | 'Evening' | 'Night';
  isActive: boolean;
}

export interface ServiceOrder {
  id: EntityId;
  reservationId: EntityId;
  requestedByGuestId: EntityId;
  department: 'Kitchen' | 'Room Service' | 'Laundry';
  items: string[];
  status: OrderStatus;
  amount: number;
  currency: CurrencyCode;
  requestedAt: string;
}

export interface ChannelSyncResult {
  id: EntityId;
  channel: string;
  inventoryUpdated: number;
  ratesUpdated: number;
  status: ChannelConnectionStatus;
  syncedAt: string;
  errorMessage?: string;
}
