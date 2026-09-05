import { expect, test as extTest } from "./fixtures"

const FIXTURE_URL = process.env.FIXTURE_URL ?? "http://localhost:4321/"

extTest.describe("Annotation persistence setting", () => {
  extTest(
    "pins come back after a reload by default",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      await page.locator("#btn-a").click()
      await expect(page.getByTestId("tegakari-pin-1")).toBeVisible()

      await page.reload()
      await activateExtension()

      await expect(page.getByTestId("tegakari-pin-1")).toBeVisible()
    }
  )

  extTest(
    "pins are gone after a reload when persistence is off, and stored pages survive it",
    async ({ context, activateExtension, seedPersistAnnotations }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)

      // Annotate once with persistence on so there is something stored.
      await activateExtension()
      await page.locator("#btn-a").click()
      await expect(page.getByTestId("tegakari-pin-1")).toBeVisible()

      await seedPersistAnnotations(false)
      await page.reload()
      await activateExtension()

      // Nothing is restored, and a new pin does not reach storage either.
      await expect(page.getByTestId("tegakari-pin-1")).toHaveCount(0)
      await page.locator("#page-title").click()
      await expect(page.getByTestId("tegakari-pin-1")).toBeVisible()
      await page.reload()
      await activateExtension()
      await expect(page.getByTestId("tegakari-pin-1")).toHaveCount(0)

      // Turning it back on restores what was stored before.
      await seedPersistAnnotations(true)
      await page.reload()
      await activateExtension()
      await expect(page.getByTestId("tegakari-pin-1")).toBeVisible()
    }
  )
})
