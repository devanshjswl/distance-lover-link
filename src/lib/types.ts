export type Profile = {
  id: string;
  name: string;
  email: string;
  photo?: string | null;
  coupleId?: string | null;
  inviteCode?: string;
  timezone?: string;
  city?: string | null;
  studyTrack?: string;
  sleepStart?: string;
  sleepEnd?: string;
  createdAt?: number;
};

export type Privacy = {
  id: string;
  shareLocation: boolean;
  shareBattery: boolean;
  shareActivity: boolean;
  shareStudy: boolean;
  shareSleep: boolean;
  shareWeather: boolean;
  geofenceAlerts: boolean;
  updatedAt?: number;
};

export const defaultPrivacy = (id: string): Privacy => ({
  id,
  shareLocation: false,
  shareBattery: true,
  shareActivity: true,
  shareStudy: true,
  shareSleep: false,
  shareWeather: true,
  geofenceAlerts: false,
  updatedAt: Date.now(),
});

export type Presence = {
  id: string;
  name?: string;
  lastActive?: number;
  battery?: number | null;
  charging?: boolean;
  movement?: "still" | "walking" | "moving" | "unknown";
  lat?: number | null;
  lon?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  city?: string | null;
  weatherTemp?: number | null;
  weatherCode?: number | null;
  studying?: boolean;
  studySubject?: string | null;
  studyEndsAt?: number | null;
  etaMinutes?: number | null;
  destinationName?: string | null;
  updatedAt?: number;
};

export type CoupleSettings = {
  id: string;
  meetupTitle?: string;
  meetupDate?: string | null;
  meetupPlace?: string | null;
  meetupStart?: string | null;
  togetherSince?: string | null;
};

export type Message = {
  id: string;
  authorId: string;
  authorName?: string;
  kind: "text" | "voice" | "gif" | "sticker";
  text?: string;
  url?: string;
  durationMs?: number;
  createdAt: number;
  readBy?: string[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  kind: "exam" | "class" | "date" | "travel" | "gift" | "other";
  notes?: string | null;
  ownerId: string;
  remindMe?: boolean;
  createdAt: number;
};

export type CheckIn = {
  id: string;
  userId: string;
  day: string;
  mood: string;
  energy: number;
  note?: string | null;
  createdAt: number;
};

export type StudySession = {
  id: string;
  userId: string;
  subject: string;
  minutes: number;
  mode: "focus" | "break";
  completed: boolean;
  startedAt: number;
  createdAt: number;
};

export type Milestone = {
  id: string;
  title: string;
  date: string;
  note?: string | null;
  createdAt: number;
};

export type Goal = {
  id: string;
  title: string;
  kind: "goal" | "habit";
  target?: number;
  streak?: number;
  lastDone?: string | null;
  ownerId: string;
  shared: boolean;
  done: boolean;
  createdAt: number;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  ownerId: string;
  shared: boolean;
  createdAt: number;
};

export type Memory = {
  id: string;
  caption: string;
  kind: "photo" | "video" | "voice";
  url: string;
  date: string;
  ownerId: string;
  createdAt: number;
};

export type BucketItem = {
  id: string;
  title: string;
  done: boolean;
  ownerId: string;
  createdAt: number;
};

export type Nudge = {
  id: string;
  kind: "hug" | "thinking" | "call" | "sos" | "safe";
  fromId: string;
  fromName?: string;
  text?: string | null;
  lat?: number | null;
  lon?: number | null;
  createdAt: number;
};
