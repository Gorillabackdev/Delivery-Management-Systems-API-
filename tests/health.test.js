const request = require("supertest");
const app = require("../src/app");

describe("Health check", () => {
  it("returns 200 on root", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "success");
  });
});
