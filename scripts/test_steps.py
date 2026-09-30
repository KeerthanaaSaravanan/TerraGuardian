from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://127.0.0.1:5173")
    page.evaluate("""
        localStorage.setItem('tg_app_mode', 'operator');
        localStorage.removeItem('tg_auth_token');
        localStorage.removeItem('tg_current_user');
    """)
    page.reload()
    page.wait_for_timeout(1000)
    page.fill("input#username", "operator")
    page.fill("input#password", "Terra#Op2026")
    page.click("button[type='submit']")
    page.wait_for_timeout(2000)

    print("Testing OPERATIONS tab...")
    page.click("nav button:has-text('OPERATIONS')")
    page.wait_for_timeout(1000)

    print("Testing MAP tab...")
    page.click("nav button:has-text('MAP')")
    page.wait_for_timeout(2000)

    print("Testing INCIDENTS tab...")
    page.click("nav button:has-text('INCIDENTS')")
    page.wait_for_timeout(1500)
    # Check if inside TG-2048 or need to click TG-2048
    tg2048 = page.query_selector("text=TG-2048")
    if tg2048:
        tg2048.click()
        page.wait_for_timeout(1000)

    print("Subtab EVIDENCE...")
    sub_ev = page.query_selector("button:has-text('2. WHY WE BELIEVE IT')")
    if sub_ev:
        sub_ev.click()
        page.wait_for_timeout(1000)

    print("Subtab EXPOSURE...")
    sub_exp = page.query_selector("button:has-text('3. WHAT IT THREATENS')")
    if sub_exp:
        sub_exp.click()
        page.wait_for_timeout(1000)

    print("Testing OUTCOMES tab...")
    page.click("nav button:has-text('OUTCOMES')")
    page.wait_for_timeout(1500)

    print("Testing ALERTS tab...")
    page.click("nav button:has-text('ALERTS')")
    page.wait_for_timeout(1500)

    print("All tested navigation successful!")
    browser.close()
