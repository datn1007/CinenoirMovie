import { Staff, Room, ActivityLog } from "./types";

// Movies are now fetched from the backend API — no local mock data for movies.

export const INITIAL_STAFF: Staff[] = [
  {
    id: "s1",
    fullName: "Julian Reed",
    accountId: "CN-8821",
    username: "jreed_noir",
    role: "Manager",
    email: "j.reed@cinenoir.com",
    phone: "+1 (555) 012-3456",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBfSNCHiveeBKp-XL71P7jbyo_aZqKLwMt1gu4_O_piB3UVbCscOrE7jLEsp8kNx8DkKQlpbctevlK-hhTy4bVHNG-X2ynv2xqDVQuq2twIQ5UIOE-2CVU9zViL4sCttXNjUpUVqgN-ElEplAx803Rlmbs-Z4E6anI5pafpwzhGBJjopXxds7b8B_cHNdm2aqDRLmM1ERy1haK7hdUEwcU063rQK2Tbx1YD9GPbmOf_t0-YMZwC_AuJz9fgeENxlJ1zsdQRCxJbD6c-",
    birthDate: "1988-04-12",
    gender: "Male",
    identityCard: "ID-119-223-991",
    residentialAddress: "456 Crimson Avenue, Theater Ward, CineCity"
  },
  {
    id: "s2",
    fullName: "Elena Vance",
    accountId: "CN-4412",
    username: "evance_ops",
    role: "Employee",
    email: "e.vance@cinenoir.com",
    phone: "+1 (555) 012-7890",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAB959jtK0MlJ_xN3Kla26ro84mMfVRDiYbai62PBj-X46qsQHfxi0dsaD8M21emrPDDzAav88fufuKmaRfOm6f-TY7Lr-ytIrYX_1XkrpETQwU5olTtdYbjZ3ciB9j1O3bz0YQgwCeaRIjfYmAOu650TZTNMxkoOkJ2J387u0MWowXCR5sHL-nk2N-kLn65JQ6IdXsH_Vef2JomVOkdLxFEIwoZkeQlnXZodg3BvrRWW2peUaBHWZtWeURXjWIEDQU7PrR6Dls5iTy",
    birthDate: "1996-09-24",
    gender: "Female",
    identityCard: "ID-442-881-331",
    residentialAddress: "12 Velvet Boulevard, Boulevard heights"
  },
  {
    id: "s3",
    fullName: "Marcus Thorne",
    accountId: "CN-2291",
    username: "mthorne_vip",
    role: "Manager",
    email: "m.thorne@cinenoir.com",
    phone: "+1 (555) 012-9988",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCV5efQ-Wz6M8QM3SLj50w0GMGuyEnfBpoo-zKMCSDi6WtHLCSwJnfSu5mBasRX_0jVp71ShyKwYeE_tqVgGlmWOSObIUmAwuUaWUYACTnjJW8o1bZ8J3pT5etPpUx5TFMSjvT4QSK9eL9pyj4kKaYOf6I_PievRwmUoxFnZbuB_3tzmbdaFaQoqB9J05hy4lsmLojosJQdEzBVwxS4GgZ9f202FuE2MVpnT3SCCH6EAEfC-mz5vwwJATFzcnWDF-W6QWX84VPSbJYf",
    birthDate: "1983-11-02",
    gender: "Male",
    identityCard: "ID-883-992-111",
    residentialAddress: "777 Golden Plaza View, Downtown Heights"
  },
  {
    id: "s4",
    fullName: "Sarah Chen",
    accountId: "CN-3355",
    username: "schen_box",
    role: "Employee",
    email: "s.chen@cinenoir.com",
    phone: "+1 (555) 012-4433",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBy642EnFSANTsfnunGATaEePWGgVasB71I7BY0RGW6HOFLD9M57imjFiWqJZa71QoUW1Y0GgXT7wOmHmx4XgFM5cQcaY7TLmdRkdtdWGTk5dpCySpxzjAVQVL-1v_Bs77hftiW5DeKEb0C-g6mHgpaoN_6SH8cSfrfpzbu3Th2ie-YI2seqdlqFwWcJKuWImehHbkIbrVQ0aCn52PqFtBhHRDTW57WIb5pWfe756-2JMLGqV-0P2ZN6P8hMtb3P2nHKXjDF3OVOzne",
    birthDate: "1999-07-10",
    gender: "Female",
    identityCard: "ID-110-775-442",
    residentialAddress: "88 Orchid Crossing, Garden Gardens"
  }
];

export const INITIAL_ROOMS: Room[] = [
  {
    id: "r1",
    name: "Theater 01",
    type: "Premium IMAX",
    seats: 240,
    status: "Screening",
    equipmentStatus: "Optimized",
    lastInspection: "Oct 24, 2025",
    occupancy: 85,
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsg9ns3P9Xwmp0NgukQHfE-bT908LRaSTLSN96wb1_fSRMMSeln04jYTYVhpZ0bohbSyF7E3Dp84ldE4Sktw4GrkjQKo8W3tw1POwr3SlUZywNrUjKizw2ERYC-f228gAiLPhGsQq5bp1h7mKaAh06abwRlUpa48ryomJBNaLVBalYrZMu1GOU5WK24FM4y2CyY3xsPQ3yqTj6aq5TUNU5joFINs_qkTzQTcu-AeYxPhQvIO4yT_J2L8I3Wx6rp1YQRibGrZcwd48c"
  },
  {
    id: "r2",
    name: "The Velvet Room",
    type: "VIP Lounge",
    seats: 24,
    status: "Available",
    equipmentStatus: "Optimized",
    lastInspection: "Oct 28, 2025",
    occupancy: 40,
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAGEdbBfo2D7HOgreHOcmaNtdxYUBEWtn5NR595M4FwRrkWPZf7J3tsZOQRvSrLHepCJ8IrAOoh1yTtrbNiAJ3PrUmQ3KfC7lrlYkyTZjXN9-TBPj-bwnrCForLuvEOcr3o-kK0xjs4A44CI90IYtilJfGYCC4iThX29HRmxBD_08dScgLicFPYwmn-7DqOYH42KJ4qzlxTE34GZECyeLG1Ii8l9awBNc6Or34z3URxy0Q6FZOcJNWZjuEdMt9qln2VIF8xYc3iXeK1"
  },
  {
    id: "r3",
    name: "Theater 05",
    type: "Standard",
    seats: 180,
    status: "Cleaning",
    equipmentStatus: "Service Due",
    lastInspection: "Sep 12, 2025",
    occupancy: 52,
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBM8rnegjbWuWxW45wWaNf4u773I9EatlZ9SOpuhWlGl1KKjacXDna5lle1tJIYpIlEo0dNjIT9U0Oy_pWyYRmextr5CmZekQDOon-exPnUAUpYbKu-bmhaW1fNyw99uchKWir4icocxW6wPolV9fa51FAYd6y2U0SrhzGy5L2g0sRXisIZmA3QC_pS83kh6WMcwashVBv8vyI41JwUQSWvJheL_TF_b89tc4YYNSwYJcmszN_QlXz46H4-6rU5u9M74szqI7XCkaSh"
  },
  {
    id: "r4",
    name: "Theater 09",
    type: "4DX Immersion",
    seats: 112,
    status: "Screening",
    equipmentStatus: "Optimized",
    lastInspection: "Nov 02, 2025",
    occupancy: 70,
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQyf4zsq6kx50ftYJ8aBZe-NWGiatSajlXUDKk0IacHXsI0PPDU6BbZ4c6ciMr14xIvekIvxgTrR81EDFLQo3SBjl58E7ghPSzE1Bg_qr4h6CVmRLow8B7_H60rOXhKnmBnXrYgju6P3vl7wuT3yebM04NYadLi4R8C6N6ZiihFQZD9flpuWrzJkY9pCueBcdS26amO222IBbpNzaCY69jEvZFt2lQyIxgAwpcoaPSTSpiBDdY0wVO2-kebAFdgJycNdDq9OiRV9DK"
  }
];

export const INITIAL_ACTIVITY: ActivityLog[] = [
  {
    id: "a1",
    text: "\"Midnight Madness\" updated by Admin",
    timestamp: "14 minutes ago",
    type: "edit"
  },
  {
    id: "a2",
    text: "\"VIP Gold\" scheduled for release",
    timestamp: "2 hours ago",
    type: "schedule"
  },
  {
    id: "a3",
    text: "\"Flash Popcorn\" promotion expired",
    timestamp: "5 hours ago",
    type: "delete"
  }
];

// Helper to interact with local storage safely
export function getLocalStorageData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading from localStorage key", key, error);
  }
  return defaultValue;
}

export function saveLocalStorageData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error writing to localStorage key", key, error);
  }
}

// Initial hydration checks
export function hydrateData() {
  // cinenoir_movies is intentionally excluded — movies are fetched from backend
  if (!localStorage.getItem("cinenoir_staff")) {
    saveLocalStorageData("cinenoir_staff", INITIAL_STAFF);
  }
  if (!localStorage.getItem("cinenoir_rooms")) {
    saveLocalStorageData("cinenoir_rooms", INITIAL_ROOMS);
  }
  if (!localStorage.getItem("cinenoir_activity")) {
    saveLocalStorageData("cinenoir_activity", INITIAL_ACTIVITY);
  }
}
