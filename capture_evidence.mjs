import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const ARTIFACT_DIR = "C:\\Users\\admin\\.gemini\\antigravity\\brain\\47eba0bb-ed9c-4c8e-8d4a-2770bd2f0a83";

async function captureEvidenceHandoff() {
  const browser = await chromium.launch();
  
  // Mobile submission first
  const contextMobile = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    deviceScaleFactor: 1.5,
  });

  const page = await contextMobile.newPage();
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  // 1. Go through public flow to complete submission
  await page.locator("text=Start Hazard Observation Report").click();
  await page.waitForTimeout(300);
  await page.locator("text=Citizen Hazard Reporter").click();
  await page.waitForTimeout(300);
  await page.locator("text=Next: Confirm Location & Notes").click();
  await page.waitForTimeout(300);
  await page.locator("text=Next: Review & Run AI Analysis").click();
  await page.waitForTimeout(300);
  await page.locator("text=Analyze Observation & Submit").click();
  await page.waitForTimeout(5000);

  // Click View in Operations Centre
  await page.locator("text=View in Operations Centre (Step 3)").click();
  await page.waitForTimeout(600);

  // Scroll down slightly so all evidence cards including citizen card are visible
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(300);

  // Capture Dark mode
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "08_evidence_with_citizen_dark.png"), fullPage: false });

  // Capture Light mode
  await page.locator("button[aria-label='Toggle Theme']").first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "08_evidence_with_citizen_light.png"), fullPage: false });

  await browser.close();
  console.log("CITIZEN EVIDENCE HANDOFF SCREENSHOTS CAPTURED!");
}

captureEvidenceHandoff().catch(console.error);
