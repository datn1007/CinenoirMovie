export interface Movie {
  id: string;
  title: string;
  description: string;
  synopsis: string;
  genre: string;
  duration: number; // in minutes
  isVip?: boolean;
  isImax?: boolean;
  status: "Now Showing" | "Starts Tomorrow" | "Coming Soon";
  imageUrl: string;
  showtimes: string[];
  rating?: string;
  language?: string;
  showtime?: string;
  titleEnglish?: string;
  actor?: string;
  director?: string;
  fromDate?: string;
  toDate?: string;
  trailerUrl?: string;
  movieUrl?: string;
  version?: string;
  cinemaRoomId?: number;
}

export interface Staff {
  id: string;
  fullName: string;
  accountId: string; // employee roster lookup
  username: string; // login credential
  role: string;
  roleId?: number; // 1 = admin/staff, 3 = customer
  email: string;
  phone: string;
  avatarUrl: string;
  birthDate?: string;
  gender?: string;
  identityCard?: string;
  residentialAddress?: string;
}

export interface Room {
  id: string;
  name: string;
  type: "Premium IMAX" | "VIP Lounge" | "Standard" | "4DX Immersion";
  seats: number;
  status: "Screening" | "Available" | "Cleaning" | "Maintenance";
  equipmentStatus: "Optimized" | "Service Due" | "Critical";
  lastInspection: string;
  occupancy: number; // percentage (0-100)
  imageUrl: string;
}

// CinemaRoom from DB via /api/cinema-rooms
export interface CinemaRoom {
  cinemaRoomId: number;
  cinemaRoomName: string;
  seatQuantity: number;
  status: number; // 1 = active, 0 = soft-deleted
}

export interface CinemaRoomSeat {
  seatId: number;
  seatRow: number;
  seatColumn: string;
  seatType: number; // 1 = standard, 2 = vip
  booked: boolean;
}

export interface Schedule {
  scheduleId: number;
  showtimeId?: number;
  movieId?: string;
  movieTitle?: string;
  movieName?: string;
  showDate?: string;
  scheduleTime: string;
  cinemaRoomId?: number;
  cinemaRoomName?: string;
  seatQuantity?: number;
  status?: number;
  statusLabel?: "ACTIVE" | "PAUSED" | string;
  note?: string;
  hasBookedSeats?: boolean;
}

export interface ScheduleSeatAvailability {
  seatCode: string;
  seatType: number;
  booked: boolean;
  locked?: boolean;
  disabled?: boolean;
  active?: boolean;
  available?: boolean;
  status?: number | string;
  seatStatus?: number;
}

export interface Voucher {
  id: number;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderValue: number | null;
  maxUses: number | null;
  usedCount: number | null;
  validFrom: string | null;
  validTo: string | null;
  description: string | null;
  status: number;
}

export interface ActivityLog {
  id: string;
  text: string;
  timestamp: string;
  type: "edit" | "schedule" | "delete";
}

// Top-level navigation intents dispatched through Header's onNavigate — not a
// page registry. Admin/Staff sub-sections and Home tabs are real routes now
// (see constants/routes.ts), not values of this type.
export type AppView =
  | "Home"
  | "Login"
  | "Register"
  | "Booking"
  | "Dashboard"
  | "Profile";
