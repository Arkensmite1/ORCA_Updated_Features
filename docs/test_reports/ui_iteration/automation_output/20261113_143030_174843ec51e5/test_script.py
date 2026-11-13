async def run_test(page, output_dir, page_url):
    try:
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(page_url, wait_until="domcontentloaded", timeout=30000); await page.wait_for_timeout(1800)
        cta = page.get_by_text("Open command center", exact=False).first
        await cta.scroll_into_view_if_needed(); await cta.click(); await page.wait_for_timeout(1000)
        print("Command center CTA worked")
        offline_nav = page.locator('[data-tab="offline"]').first
        await offline_nav.click(); await page.wait_for_timeout(900)
        await page.wait_for_selector("text=Offline safety center", timeout=8000)
        print("Offline center opened")
        await page.locator('[data-testid="offline-layer-forecast"]').click()
        await page.locator('[data-testid="offline-cache-download-button"]').click(); await page.wait_for_timeout(700)
        print("Cache action completed")
        await page.locator('[data-testid="route-deviation-limit"]').fill("3")
        await page.locator('[data-testid="wind-limit"]').fill("45")
        await page.locator('[data-testid="offline-queue-sos-button"]').click(); await page.wait_for_timeout(800)
        print("SOS queue action completed")
        errors = await page.evaluate("""() => Array.from(document.querySelectorAll('.error, [class*=\"error\"], [id*=\"error\"]')).map(el => el.textContent).join(', ')""")
        print("Errors:", errors or "none")
    except Exception as e:
        print("FINDING:", str(e)); raise
