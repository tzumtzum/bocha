import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "./mock-client";

const LS_KEYS = {
  user: "bobo_demo_user",
  birds: "bobo_demo_birds",
  logs: "bobo_demo_logs",
  profile: "bobo_demo_profile",
  flocks: "bobo_demo_flocks",
  flock_members: "bobo_demo_flock_members",
  flock_invites: "bobo_demo_flock_invites",
};

describe("MockSupabaseClient", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("auth", () => {
    it("getUser returns demo user", async () => {
      const { data } = await mockClient.auth.getUser();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe("demo@bobo.app");
    });

    it("signInWithPassword seeds data and returns user", async () => {
      const { data, error } = await mockClient.auth.signInWithPassword({
        email: "demo@bobo.app",
        password: "demo",
      });
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.id).toBe("demo-user-123");

      // Should have seeded birds
      const birds = JSON.parse(localStorage.getItem(LS_KEYS.birds) || "[]");
      expect(birds.length).toBeGreaterThan(0);
      expect(birds[0].name).toBe("Bobo");
    });

    it("signOut clears user", async () => {
      await mockClient.auth.signInWithPassword({
        email: "demo@bobo.app",
        password: "demo",
      });
      expect(localStorage.getItem(LS_KEYS.user)).toBeTruthy();

      await mockClient.auth.signOut();
      expect(localStorage.getItem(LS_KEYS.user)).toBeNull();
    });
  });

  describe("birds table", () => {
    beforeEach(async () => {
      await mockClient.auth.signInWithPassword({
        email: "demo@bobo.app",
        password: "demo",
      });
    });

    it("select returns seeded birds", async () => {
      const { data } = await mockClient.from("birds").select();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Bobo");
    });

    it("eq filter works", async () => {
      const { data } = await mockClient
        .from("birds")
        .select()
        .eq("name", "Bobo");
      expect(data).toHaveLength(1);
    });

    it("insert adds a bird", async () => {
      await mockClient.from("birds").insert({
        name: "Kiwi",
        species: "Budgerigar",
        user_id: "demo-user-123",
      });

      const { data } = await mockClient.from("birds").select();
      expect(data).toHaveLength(2);
    });

    it("update modifies a bird", async () => {
      const { data: before } = await mockClient
        .from("birds")
        .select()
        .eq("name", "Bobo")
        .single();
      const id = before?.id;

      await mockClient.from("birds").update({ name: "Bobo Updated" }).eq("id", id);

      const { data: after } = await mockClient
        .from("birds")
        .select()
        .eq("id", id)
        .single();
      expect(after?.name).toBe("Bobo Updated");
    });
  });

  describe("daily_logs table", () => {
    beforeEach(async () => {
      await mockClient.auth.signInWithPassword({
        email: "demo@bobo.app",
        password: "demo",
      });
    });

    it("select returns seeded logs", async () => {
      const { data } = await mockClient.from("daily_logs").select();
      expect(data.length).toBeGreaterThan(0);
    });

    it("upsert inserts new log", async () => {
      const today = new Date().toISOString().split("T")[0];
      await mockClient.from("daily_logs").upsert({
        bird_id: "test-bird",
        user_id: "demo-user-123",
        log_date: today,
        weight: 100,
        weight_unit: "g",
        overall_status: "normal",
      });

      const { data } = await mockClient
        .from("daily_logs")
        .select()
        .eq("bird_id", "test-bird");
      expect(data).toHaveLength(1);
      expect(data[0].weight).toBe(100);
    });

    it("upsert updates existing log by bird_id + log_date", async () => {
      const today = new Date().toISOString().split("T")[0];
      await mockClient.from("daily_logs").upsert({
        bird_id: "test-bird-2",
        user_id: "demo-user-123",
        log_date: today,
        weight: 100,
        weight_unit: "g",
        overall_status: "normal",
      });

      await mockClient.from("daily_logs").upsert({
        bird_id: "test-bird-2",
        user_id: "demo-user-123",
        log_date: today,
        weight: 110,
        weight_unit: "g",
        overall_status: "off",
      });

      const { data } = await mockClient
        .from("daily_logs")
        .select()
        .eq("bird_id", "test-bird-2");
      expect(data).toHaveLength(1);
      expect(data[0].weight).toBe(110);
    });
  });

  describe("species table", () => {
    it("returns all 18 species", async () => {
      const { data } = await mockClient.from("species").select();
      expect(data).toHaveLength(18);
      expect(data.map((s: { name: string }) => s.name)).toContain("Cockatiel");
      expect(data.map((s: { name: string }) => s.name)).toContain("Other");
    });
  });
});


describe("flocks table", () => {
  beforeEach(async () => {
    await mockClient.auth.signInWithPassword({
      email: "demo@bobo.app",
      password: "demo",
    });
  });

  it("select returns the seeded flock", async () => {
    const { data } = await mockClient.from("flocks").select();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("My Flock");
    expect(data[0].owner_id).toBe("demo-user-123");
  });

  it("eq filter works", async () => {
    const flocks = JSON.parse(localStorage.getItem(LS_KEYS.flocks) || "[]");
    const flockId = flocks[0].id;

    const { data } = await mockClient
      .from("flocks")
      .select()
      .eq("id", flockId);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("My Flock");
  });
});

describe("flock_members table", () => {
  beforeEach(async () => {
    await mockClient.auth.signInWithPassword({
      email: "demo@bobo.app",
      password: "demo",
    });
  });

  it("select returns the seeded membership", async () => {
    const { data } = await mockClient.from("flock_members").select();
    expect(data).toHaveLength(1);
    expect(data[0].role).toBe("owner");
    expect(data[0].user_id).toBe("demo-user-123");
  });

  it("eq('user_id') filter works", async () => {
    const { data } = await mockClient
      .from("flock_members")
      .select()
      .eq("user_id", "demo-user-123");
    expect(data).toHaveLength(1);
    expect(data[0].role).toBe("owner");
  });

  it("eq('role') filter works", async () => {
    const { data } = await mockClient
      .from("flock_members")
      .select()
      .eq("role", "owner");
    expect(data).toHaveLength(1);
    expect(data[0].user_id).toBe("demo-user-123");
  });
});

describe("flock_invites table", () => {
  beforeEach(async () => {
    await mockClient.auth.signInWithPassword({
      email: "demo@bobo.app",
      password: "demo",
    });
  });

  it("insert adds an invite, select returns it, and eq('token') works", async () => {
    const flocks = JSON.parse(localStorage.getItem(LS_KEYS.flocks) || "[]");
    const flockId = flocks[0].id;

    await mockClient.from("flock_invites").insert({
      flock_id: flockId,
      token: "abc-123",
      role: "member",
      expires_at: new Date().toISOString(),
    });

    const { data: all } = await mockClient.from("flock_invites").select();
    expect(all).toHaveLength(1);
    expect(all[0].token).toBe("abc-123");

    const { data: filtered } = await mockClient
      .from("flock_invites")
      .select()
      .eq("token", "abc-123");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].role).toBe("member");
  });
});

describe("birds via flock_id", () => {
  beforeEach(async () => {
    await mockClient.auth.signInWithPassword({
      email: "demo@bobo.app",
      password: "demo",
    });
  });

  it("eq('flock_id') returns the bird", async () => {
    const flocks = JSON.parse(localStorage.getItem(LS_KEYS.flocks) || "[]");
    const flockId = flocks[0].id;

    const { data } = await mockClient
      .from("birds")
      .select()
      .eq("flock_id", flockId);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Bobo");
  });
});

describe("mock client .in() operator", () => {
  beforeEach(async () => {
    await mockClient.auth.signInWithPassword({
      email: "demo@bobo.app",
      password: "demo",
    });
  });

  it("query birds .in('flock_id', [flockId]) returns birds", async () => {
    const flocks = JSON.parse(localStorage.getItem(LS_KEYS.flocks) || "[]");
    const flockId = flocks[0].id;

    const { data } = await mockClient
      .from("birds")
      .select()
      .in("flock_id", [flockId]);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Bobo");
  });
});
