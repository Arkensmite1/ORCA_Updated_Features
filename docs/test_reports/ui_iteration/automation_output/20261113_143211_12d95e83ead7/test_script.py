async def run_test(page, output_dir, page_url):
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.goto(page_url, wait_until="domcontentloaded", timeout=30000); await page.wait_for_timeout(1000)
        for text in ["Open command center", "Continue to ORCA"]:
            loc=page.get_by_text(text, exact=False).first
            if await loc.count(): await loc.click(); await page.wait_for_timeout(700)
        await page.locator('[data-tab="offline"]').first.click(); await page.wait_for_timeout(700)
        await page.wait_for_selector("text=Offline safety center", timeout=8000)
        print("Desktop offline navigation works")
        await page.locator('[data-testid="offline-cache-download-button"]').click(); await page.wait_for_timeout(500)
        await page.locator('[data-testid="offline-queue-sos-button"]').click(); await page.wait_for_timeout(500)
        print("Desktop cache and queue controls work")
    except Exception as e:
        print("FINDING:", str(e)); raise
