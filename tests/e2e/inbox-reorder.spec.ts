import { expect, test as extTest } from "./fixtures"

const FIXTURE_URL = process.env.FIXTURE_URL ?? "http://localhost:4321/"

/** Inbox rows are the only draggable nodes in the overlay. */
const ROW = 'div[draggable="true"]'

extTest.describe("Inbox reorder & renumbering", () => {
  extTest(
    "dragging a row to a new position renumbers the pins to follow the list",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      await page.locator("#btn-a").click()
      await page.locator("#page-title").click()
      await page.locator("li", { hasText: "Item 1" }).first().click()

      await page.getByTitle("Inbox", { exact: true }).click()
      const rows = page.locator(ROW)
      await expect(rows).toHaveCount(3)
      // Row text starts with the id badge, then `<tag>`, then the element text.
      await expect(rows.nth(0)).toContainText("<button>")
      await expect(rows.nth(2)).toContainText("<li>")

      await rows.nth(0).dragTo(rows.nth(2))

      // Button A moved to the end and the numbering followed the list.
      await expect(rows.nth(0)).toContainText("<h1>")
      await expect(rows.nth(1)).toContainText("<li>")
      await expect(rows.nth(2)).toContainText("<button>")
      await expect(rows.nth(0)).toContainText("1")
      await expect(rows.nth(2)).toContainText("3")
      for (const id of [1, 2, 3]) {
        await expect(page.getByTestId(`tegakari-pin-${id}`)).toBeVisible()
      }
    }
  )

  extTest(
    "a pin created after a deletion reuses the freed number instead of skipping it",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      await page.locator("#btn-a").click()
      await page.getByTitle("Inbox", { exact: true }).click()
      const rows = page.locator(ROW)
      await expect(rows).toHaveCount(1)

      await rows.nth(0).getByTitle("Delete").click()
      await expect(rows).toHaveCount(0)

      await page.locator("#page-title").click()

      await expect(rows).toHaveCount(1)
      await expect(page.getByTestId("tegakari-pin-1")).toBeVisible()
      await expect(page.getByTestId("tegakari-pin-2")).toHaveCount(0)
    }
  )
})
