import { chromium } from "./node_modules/playwright/index.mjs";
import * as fs from "fs";
import * as path from "path";

const ARTIFACT_DIR = "C:\\Users\\admin\\.gemini\\antigravity\\brain\\47eba0bb-ed9c-4c8e-8d4a-2770bd2f0a83";

async function captureScreenshots() {
  const browser = await chromium.launch();
  
  // Mobile viewport: iPhone 14 / standard 390x844
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await contextMobile.newPage();
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  // 1. Public Landing Page (Light)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "01_public_landing_light.png"), fullPage: false });

  // Switch to Dark Theme
  const themeToggle = await page.locator("button[aria-label*='Toggle']").first();
  if (await themeToggle.count() > 0) {
    await themeToggle.click();
  } else {
    await page.evaluate(() => document.documentElement.classList.add("dark"));
  }
  await page.waitForTimeout(300);
  // 1b. Public Landing Page (Dark)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "01_public_landing_dark.png"), fullPage: false });

  // Switch back to Light for flow or keep dark
  // Let's test Access Mode
  await page.locator("text=Start Hazard Observation Report").click();
  await page.waitForTimeout(300);
  // 2. Public Access Selection (Dark)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "02_public_access_dark.png"), fullPage: false });
  // Toggle to Light
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.waitForTimeout(300);
  // 2b. Public Access Selection (Light)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "02_public_access_light.png"), fullPage: false });

  // Proceed to Photo Capture
  await page.locator("text=Citizen Hazard Reporter").click();
  await page.waitForTimeout(300);
  // 3. Photo Capture (Light)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "03_photo_capture_light.png"), fullPage: false });
  // Toggle Dark
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(300);
  // 3b. Photo Capture (Dark)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "03_photo_capture_dark.png"), fullPage: false });

  // Proceed to Location
  await page.locator("text=Next: Confirm Location & Notes").click();
  await page.waitForTimeout(300);
  // 4. Location Screen (Dark)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "04_location_context_dark.png"), fullPage: false });
  // Toggle Light
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.waitForTimeout(300);
  // 4b. Location Screen (Light)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "04_location_context_light.png"), fullPage: false });

  // Proceed to Review
  await page.locator("text=Next: Review & Run AI Analysis").click();
  await page.waitForTimeout(300);
  // 5. Review Screen (Light)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "05_review_light.png"), fullPage: false });

  // Submit and wait for processing & result
  await page.locator("text=Analyze Observation & Submit").click();
  // Wait for 5 seconds for sequential analysis to finish and go to Result
  await page.waitForTimeout(5000);
  
  // 6. Result Screen (Light)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "06_result_light.png"), fullPage: false });
  // Toggle Dark
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(300);
  // 6b. Result Screen (Dark)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "06_result_dark.png"), fullPage: false });

  // Now click "View in Operations Centre (Step 3)" to test Handoff
  await page.locator("text=View in Operations Centre (Step 3)").click();
  await page.waitForTimeout(500);

  // Desktop viewport for Operations Centre
  const contextDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const pageDesktop = await contextDesktop.newPage();
  await pageDesktop.goto("http://localhost:5173", { waitUntil: "networkidle" });
  
  // Enter Operator sign in
  await pageDesktop.locator("text=Authorized Sign-In").first().click();
  await pageDesktop.waitForTimeout(300);
  // Go to step 3 (Evidence Reconciliation)
  await pageDesktop.locator("text=Evidence").first().click();
  await pageDesktop.waitForTimeout(300);

  // Take screenshot of Evidence Reconciliation in dark mode
  await pageDesktop.evaluate(() => document.documentElement.classList.add("dark"));
  await pageDesktop.waitForTimeout(300);
  await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, "07_evidence_reconciliation_dark.png"), fullPage: false });

  // Take screenshot in light mode
  await pageDesktop.evaluate(() => document.documentElement.classList.remove("dark"));
  await pageDesktop.waitForTimeout(300);
  await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, "07_evidence_reconciliation_light.png"), fullPage: false });

  await browser.close();
  console.log("ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

captureScreenshots().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
