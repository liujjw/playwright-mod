#!/usr/bin/env python3
from os import environ
import json
from playwright.sync_api import Playwright, sync_playwright

AUTH = environ.get('AUTH', default='brd-customer-hl_1e23c98a-zone-scraping_browser1:a0d7uhl3ycpb')
TARGET_URL = environ.get('TARGET_URL', default='https://www.google.com/recaptcha/api2/demo')


def scrape(playwright: Playwright, url=TARGET_URL):
    print('Connecting to Browser...')
    endpoint_url = f'wss://{AUTH}@brd.superproxy.io:9222'
    browser = playwright.chromium.connect_over_cdp(endpoint_url)
    try:
        print(f'Connected! Navigating to {url}...')
        page = browser.new_page()
        client = page.context.new_cdp_session(page)
        page.goto(url, timeout=2*60_000)
        print('Navigated! Waiting captcha to detect and solve...')
        result = client.send('Captcha.waitForSolve', {
            'detectTimeout': 10 * 1000,
        })
        status = result['status']
        print(f'Captcha status: {status}')
        if status == 'solve_finished':
            snapshot = page.accessibility.snapshot()
            print('Accessibility snapshot:')
            print(json.dumps(snapshot, indent=2))
        else:
            print('Accessibility snapshot skipped because captcha was not solved.')
    finally:
        browser.close()


def main():
    with sync_playwright() as playwright:
        scrape(playwright)


if __name__ == '__main__':
    main()

