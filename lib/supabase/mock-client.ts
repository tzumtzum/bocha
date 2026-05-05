/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mock Supabase client for demo mode.
 * Uses localStorage so data persists across reloads.
 */

const DEMO_USER = {
  id: "demo-user-123",
  email: "demo@bobo.app",
  aud: "authenticated",
  role: "authenticated",
};

const LS_KEYS = {
  user: "bobo_demo_user",
  birds: "bobo_demo_birds",
  logs: "bobo_demo_logs",
  profile: "bobo_demo_profile",
  photos: "bobo_demo_photos",
  flocks: "bobo_demo_flocks",
  flock_members: "bobo_demo_flock_members",
  flock_invites: "bobo_demo_flock_invites",
};

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Seed initial data if none exists
function seedData() {
  const existingBirds = getItem<Record<string, unknown>[]>(LS_KEYS.birds, []);
  if (existingBirds.length === 0) {
    const flockId = generateId();
    const boboId = generateId();

    const flocks = [
      {
        id: flockId,
        name: "My Flock",
        owner_id: DEMO_USER.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const flockMembers = [
      {
        id: generateId(),
        flock_id: flockId,
        user_id: DEMO_USER.id,
        role: "owner",
        joined_at: new Date().toISOString(),
      },
    ];

    const birds = [
      {
        id: boboId,
        user_id: DEMO_USER.id,
        flock_id: flockId,
        name: "Bobo",
        species: "Cockatiel",
        date_of_birth: "2023-01-15",
        date_type: "hatched",
        target_weight: 95,
        current_weight: 96.5,
        status: "active",
        avatar_url: null,
        avatar_color: { bg: "#fef3c7", fg: "#f59e0b" },
        timezone: "UTC",
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const logs = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      logs.push({
        id: generateId(),
        bird_id: boboId,
        user_id: DEMO_USER.id,
        log_date: dateStr,
        log_type: i === 0 ? "quick" : "full",
        weight: 95 + Math.random() * 6 - 3,
        weight_unit: "g",
        overall_status: Math.random() > 0.8 ? "off" : "normal",
        activity_level: "normal",
        appetite: "normal",
        poop_feces_color: null,
        poop_feces_consistency: null,
        poop_urates_color: null,
        poop_urine_amount: null,
        poop_photo_url: null,
        observations: i === 1 ? "Ate well today, very playful!" : null,
        custom_fields: [],
        logged_at: new Date(d).toISOString(),
        created_at: new Date(d).toISOString(),
        updated_at: new Date(d).toISOString(),
      });
    }

    setItem(LS_KEYS.flocks, flocks);
    setItem(LS_KEYS.flock_members, flockMembers);
    setItem(LS_KEYS.birds, birds);
    setItem(LS_KEYS.logs, logs);
    setItem(LS_KEYS.profile, {
      id: DEMO_USER.id,
      full_name: "Demo User",
      weight_unit: "g",
      timezone: "UTC",
      theme: "system",
      reminders_enabled: false,
      is_pro: false,
      created_at: new Date().toISOString(),
    });
  }
}

interface QueryBuilder {
  filters?: { column: string; value: unknown; op?: "eq" | "in" }[];
  order?: { column: string; ascending: boolean };
  limit?: number;
}

function buildQuery(data: Record<string, unknown>[], query: QueryBuilder): Record<string, unknown>[] {
  let result = [...data];

  if (query.filters) {
    for (const f of query.filters) {
      if (f.op === "in" && Array.isArray(f.value)) {
        result = result.filter((row) => (f.value as unknown[]).includes(row[f.column]));
      } else {
        result = result.filter((row) => row[f.column] === f.value);
      }
    }
  }

  if (query.order) {
    result.sort((a, b) => {
      const av = a[query.order!.column] as string | number;
      const bv = b[query.order!.column] as string | number;
      if (query.order!.ascending) return av > bv ? 1 : av < bv ? -1 : 0;
      return av < bv ? 1 : av > bv ? -1 : 0;
    });
  }

  if (query.limit) {
    result = result.slice(0, query.limit);
  }

  return result;
}

class MockPostgrestBuilder {
  private data: Record<string, unknown>[] = [];
  private query: QueryBuilder = {};
  private table: string;

  constructor(table: string) {
    this.table = table;
  }

  select() {
    if (this.table === "birds") this.data = getItem(LS_KEYS.birds, []);
    if (this.table === "daily_logs") this.data = getItem(LS_KEYS.logs, []);
    if (this.table === "profiles") {
      const profile = getItem<Record<string, unknown> | null>(LS_KEYS.profile, null);
      this.data = profile ? [profile] : [];
    }
    if (this.table === "flocks") this.data = getItem(LS_KEYS.flocks, []);
    if (this.table === "flock_members") this.data = getItem(LS_KEYS.flock_members, []);
    if (this.table === "flock_invites") this.data = getItem(LS_KEYS.flock_invites, []);
    if (this.table === "species") {
      this.data = [
        "Budgerigar","Cockatiel","African Grey","Macaw","Conure","Lovebird",
        "Eclectus","Cockatoo","Canary","Finch","Parrotlet","Quaker Parrot",
        "Caique","Pionus","Rosella","Kakariki","Lorikeet","Other",
      ].map((name, i) => ({ id: i + 1, name }));
    }
    return this;
  }

  eq(column: string, value: unknown) {
    if (!this.query.filters) this.query.filters = [];
    this.query.filters.push({ column, value, op: "eq" });
    return this;
  }

  in(column: string, values: unknown[]) {
    if (!this.query.filters) this.query.filters = [];
    this.query.filters.push({ column, value: values, op: "in" });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.query.order = { column, ascending: opts?.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.query.limit = count;
    return this;
  }

  single() {
    const result = buildQuery(this.data, this.query);
    return Promise.resolve({
      data: result[0] || null,
      error: result[0] ? null : { message: "Not found" },
    });
  }

  then(onfulfilled?: (value: { data: Record<string, unknown>[]; error: null }) => unknown) {
    const result = buildQuery(this.data, this.query);
    return Promise.resolve({ data: result, error: null }).then(onfulfilled);
  }
}

class MockSupabaseClient {
  auth = {
    getUser: () => Promise.resolve({ data: { user: DEMO_USER }, error: null }),
    getSession: () => Promise.resolve({ data: { session: { user: DEMO_USER } }, error: null }),
    signInWithPassword: () => {
      setItem(LS_KEYS.user, DEMO_USER);
      seedData();
      return Promise.resolve({ data: { user: DEMO_USER }, error: null });
    },
    signInWithOtp: () => Promise.resolve({ data: {}, error: null }),
    signUp: () => {
      setItem(LS_KEYS.user, DEMO_USER);
      seedData();
      return Promise.resolve({ data: { user: DEMO_USER }, error: null });
    },
    signOut: () => {
      localStorage.removeItem(LS_KEYS.user);
      return Promise.resolve({ error: null });
    },
    onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
      setTimeout(() => callback("SIGNED_IN", { user: DEMO_USER }), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    exchangeCodeForSession: () => Promise.resolve({ data: {}, error: null }),
  };

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        const photos = getItem<Record<string, unknown>[]>(LS_KEYS.photos, []);
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        photos.push({ bucket, path, dataUrl, created_at: new Date().toISOString() });
        setItem(LS_KEYS.photos, photos);
        return { data: { path }, error: null };
      },
      remove: async (paths: string[]) => {
        const photos = getItem<Record<string, unknown>[]>(LS_KEYS.photos, []);
        setItem(
          LS_KEYS.photos,
          photos.filter((p) => !paths.includes(p.path as string))
        );
        return { data: [], error: null };
      },
      list: async () => {
        const photos = getItem<Record<string, unknown>[]>(LS_KEYS.photos, []);
        return { data: photos.filter((p) => p.bucket === bucket), error: null };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: path },
      }),
    }),
  };

  from(table: string) {
    return {
      select: () => new MockPostgrestBuilder(table).select(),
      insert: (values: unknown | unknown[]) => {
        const arr = Array.isArray(values) ? values : [values];
        if (table === "birds") {
          const birds = getItem<Record<string, unknown>[]>(LS_KEYS.birds, []);
          for (const v of arr) {
            const row = { ...(v as object), id: (v as Record<string, unknown>).id || generateId(), created_at: new Date().toISOString() };
            birds.push(row);
          }
          setItem(LS_KEYS.birds, birds);
        }
        if (table === "daily_logs") {
          const logs = getItem<Record<string, unknown>[]>(LS_KEYS.logs, []);
          for (const v of arr) {
            const row = { ...(v as object), id: (v as Record<string, unknown>).id || generateId(), created_at: new Date().toISOString() };
            logs.push(row);
          }
          setItem(LS_KEYS.logs, logs);
        }
        if (table === "flock_invites") {
          const invites = getItem<Record<string, unknown>[]>(LS_KEYS.flock_invites, []);
          for (const v of arr) {
            const row = { ...(v as object), id: (v as Record<string, unknown>).id || generateId(), created_at: new Date().toISOString() };
            invites.push(row);
          }
          setItem(LS_KEYS.flock_invites, invites);
        }
        return Promise.resolve({ data: arr, error: null });
      },
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, value: unknown) => {
          if (table === "birds") {
            const birds = getItem<Record<string, unknown>[]>(LS_KEYS.birds, []);
            const idx = birds.findIndex((b) => b[column] === value);
            if (idx >= 0) birds[idx] = { ...birds[idx], ...values, updated_at: new Date().toISOString() };
            setItem(LS_KEYS.birds, birds);
          }
          if (table === "profiles") {
            const profile = getItem<Record<string, unknown>>(LS_KEYS.profile, {});
            setItem(LS_KEYS.profile, { ...profile, ...values });
          }
          if (table === "daily_logs") {
            const logs = getItem<Record<string, unknown>[]>(LS_KEYS.logs, []);
            const idx = logs.findIndex((l) => l[column] === value);
            if (idx >= 0) logs[idx] = { ...logs[idx], ...values, updated_at: new Date().toISOString() };
            setItem(LS_KEYS.logs, logs);
          }
          if (table === "flock_invites") {
            const invites = getItem<Record<string, unknown>[]>(LS_KEYS.flock_invites, []);
            const idx = invites.findIndex((inv) => inv[column] === value);
            if (idx >= 0) invites[idx] = { ...invites[idx], ...values, updated_at: new Date().toISOString() };
            setItem(LS_KEYS.flock_invites, invites);
          }
          return Promise.resolve({ data: null, error: null });
        },
      }),
      delete: () => ({
        eq: (column: string, value: unknown) => {
          if (table === "birds") {
            const birds = getItem<Record<string, unknown>[]>(LS_KEYS.birds, []);
            setItem(LS_KEYS.birds, birds.filter((b) => b[column] !== value));
          }
          if (table === "daily_logs") {
            const logs = getItem<Record<string, unknown>[]>(LS_KEYS.logs, []);
            setItem(LS_KEYS.logs, logs.filter((l) => l[column] !== value));
          }
          return Promise.resolve({ data: null, error: null });
        },
      }),
      upsert: (values: unknown) => {
        const arr = Array.isArray(values) ? values : [values];
        if (table === "daily_logs") {
          const logs = getItem<Record<string, unknown>[]>(LS_KEYS.logs, []);
          for (const v of arr) {
            const row = v as Record<string, unknown>;
            const idx = logs.findIndex((l) => l.bird_id === row.bird_id && l.log_date === row.log_date);
            if (idx >= 0) {
              logs[idx] = { ...logs[idx], ...row, updated_at: new Date().toISOString() };
            } else {
              logs.push({ ...row, id: row.id || generateId(), created_at: new Date().toISOString() });
            }
          }
          setItem(LS_KEYS.logs, logs);
        }
        return Promise.resolve({ data: arr, error: null });
      },
    };
  }
}

export const mockClient = new MockSupabaseClient();
