import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "./mock-client";

const LS_KEYS = {
  user: "bobo_demo_user",
  birds: "bobo_demo_birds",
  logs: "bobo_demo_logs",
  profile: "bobo_demo_profile",
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
