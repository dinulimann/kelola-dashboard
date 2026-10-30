import { expect, test, type Page } from "@playwright/test";

const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
});
test.afterEach(() => expect(errors).toEqual([]));

const orderRows = (page: Page) => page.getByRole("table", { name: "Orders" }).locator("tbody tr");

test("overview shows KPIs and every page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Good afternoon");
  await expect(page.getByTestId("kpi-Orders")).toHaveText(/^\d+$/);
  for (const [key, title] of [["o", "Orders"], ["p", "Products"], ["c", "Customers"], ["a", "Analytics"], ["s", "Settings"]]) {
    await page.locator("body").press("g"); await page.locator("body").press(key);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  }
  await expect(page.getByTestId("heatmap").or(page.getByRole("tab", { name: "Store" }))).toBeVisible();
});

test("order filters live in the URL and survive a reload", async ({ page }) => {
  await page.goto("/#/orders?status=Cancelled");
  const n = await orderRows(page).count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(orderRows(page).nth(i)).toContainText("Cancelled");
  await page.getByLabel("Search orders").fill("zzz-nothing");
  await expect(page.getByText("No orders match")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Search orders")).toHaveValue("zzz-nothing");
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(orderRows(page)).toHaveCount(15);
});

test("bulk status change, then undo", async ({ page }) => {
  await page.goto("/#/orders?status=Pending,Preparing");
  const first = orderRows(page).first();
  const id = (await first.locator("td").nth(1).textContent())!;
  await first.getByRole("checkbox").check();
  await page.getByRole("toolbar", { name: "Bulk actions" }).getByRole("button", { name: "Mark delivered" }).click();
  await expect(page.getByText("1 order marked delivered")).toBeVisible();
  await expect(page.getByRole("cell", { name: id, exact: true })).toHaveCount(0); // no longer Pending/Preparing
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("cell", { name: id, exact: true })).toBeVisible();
});

test("deleting orders persists until demo data is reset", async ({ page }) => {
  await page.goto("/#/orders");
  const total = Number((await page.getByText(/^\d+ orders/).textContent())!.match(/\d+/)![0]);
  await page.getByLabel("Select all on page").check();
  await page.getByRole("toolbar", { name: "Bulk actions" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(`${total - 15} orders`, { exact: false }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(`${total - 15} orders`, { exact: false }).first()).toBeVisible();
  await page.goto("/#/settings");
  await page.getByRole("tab", { name: "Demo data" }).click();
  await page.getByRole("button", { name: "Reset data" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reset", exact: true }).click();
  await page.goto("/#/orders");
  await expect(page.getByText(`${total} orders`, { exact: false }).first()).toBeVisible();
});

test("command palette finds an order and opens its detail", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("kpi-Orders")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Command" }).fill("SC-11100");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/orders\?open=SC-11100/);
  await expect(page.getByRole("dialog", { name: "Command palette" })).toHaveCount(0);
  const drawer = page.getByRole("dialog", { name: "Order SC-11100" });
  await expect(drawer).toContainText("SC-11100");
  await expect(drawer).toContainText(/timeline/i);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(page).not.toHaveURL(/open=/);
});

test("add product validates input, then saves", async ({ page }) => {
  await page.goto("/#/products?new=1");
  const dialog = page.getByRole("dialog", { name: "Add product" });
  await dialog.getByLabel("Name").fill("Croissant");
  await dialog.getByLabel("Price (Rp)").fill("30000");
  await dialog.getByLabel("Cost (Rp)").fill("40000");
  await dialog.getByRole("button", { name: "Add product" }).click();
  await expect(dialog.getByText("A product with this name exists.")).toBeVisible();
  await expect(dialog.getByText("Cost must be below price.")).toBeVisible();
  await dialog.getByLabel("Name").fill("Kouign-amann");
  await dialog.getByLabel("Cost (Rp)").fill("12000");
  await expect(dialog.getByText("Margin:")).toContainText("60%");
  await dialog.getByRole("button", { name: "Add product" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("Search products").fill("kouign");
  await expect(page.getByTestId("product-grid")).toContainText("P-041");
});

test("dark mode is remembered across reloads", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
});
