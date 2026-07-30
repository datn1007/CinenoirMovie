export const ROUTES = {
  HOME: "/home",
  HOME_NOW_SHOWING: "/home/now-showing",
  HOME_COMING_SOON: "/home/coming-soon",
  HOME_PROMOTIONS: "/home/promotions",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  ACCOUNT_DISABLED: "/account-disabled",

  // Admin — nested under the AdminLayout route; ADMIN itself is the dashboard.
  ADMIN: "/admin",
  ADMIN_MOVIES: "/admin/movies",
  ADMIN_SHOWTIMES: "/admin/showtimes",
  ADMIN_ROOMS: "/admin/rooms",
  ADMIN_STAFF: "/admin/staff",
  ADMIN_VOUCHERS: "/admin/vouchers",
  ADMIN_MEMBERS: "/admin/members",
  ADMIN_INVOICES: "/admin/invoices",

  // Staff — nested under the StaffLayout route; STAFF itself is ticket selling.
  STAFF: "/staff",
  STAFF_PROFILE: "/staff/profile",

  BOOKING: "/booking",
  PROFILE: "/profile",
  WATCH: "/watch",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
