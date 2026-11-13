async def run_test(page, output_dir, page_url):
    import json
    try:
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(page_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2500)
        print("Loaded:", await page.title())
        # Complete landing/onboarding by clicking visible primary controls sequentially.
        for label in ["See how ORCA works", "Continue", "Get started", "Enter command center", "Continue to ORCA"]:
            loc = page.get_by_role("button", name=label, exact=True)
            if await loc.count():
                await loc.first.scroll_into_view_if_needed()
                await loc.first.click()
                await page.wait_for_timeout(700)
                print("Clicked", label)
        body = await page.locator("body").inner_text()
        print("Onboarding/command text present:", any(x in body for x in ["Mission overview", "Command center", "ORCA"]));
        # Offline nav via test-friendly data-tab.
        offline_nav = page.locator('[data-tab="offline"]').first
        await offline_nav.scroll_into_view_if_needed(); await offline_nav.click(); await page.wait_for_timeout(1000)
        await page.wait_for_selector("text=Offline safety center", timeout=8000)
        print("Offline center opened")
        await page.locator('[data-testid="offline-layer-forecast"]').click()
        await page.locator('[data-testid="offline-cache-download-button"]').click()
        await page.wait_for_timeout(900)
        print("Cache action completed")
        await page.locator('[data-testid="route-deviation-limit"]').fill("3")
        await page.locator('[data-testid="wind-limit"]').fill("45")
        print("Limit controls updated")
        await page.locator('[data-testid="offline-queue-sos-button"]').click()
        await page.wait_for_timeout(1000)
        print("SOS queue action completed", await page.locator("text=QUEUED").count())
        errors = await page.evaluate("""() => Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]')).map(el => el.textContent).join(', ')""")
        print("Errors:" , errors or "none")
        await page.screenshot(path="/app/test_reports/ui_iteration/automation_output/20261113_142848_e197b5530cf2/offline-mobile.jpeg", type="jpeg", quality=40, full_page=False)
    except Exception as e:
        print("FINDING:", str(e))
        raise
