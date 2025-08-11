const puppeteer = require('puppeteer');
const fs = require('fs');
const fetch = require('node-fetch');

const SOURCE_URL = 'https://cookies-manager.mr.org.pl/customers-list';
const POST_URL = 'https://cookies-manager.mr.org.pl/compare-cookies';

(async () => {
    let browser;
    try {
        const res = await fetch(SOURCE_URL);
        if (!res.ok) throw new Error(`Błąd pobierania JSON: ${res.statusText}`);
        const domains = await res.json();

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const results = [];
        let counter = 0;

        for (const item of domains) {
            if (counter >= 3) {
                break;
            }
            try {
                const page = await browser.newPage();
                await page.goto(`${item.domain}?consent-mode=off`, { waitUntil: 'domcontentloaded', timeout: 30000 });

                const cookies = await page.cookies();
                results.push({
                    ID: item.id,
                    cookies: cookies.map(c => c.name)
                });

                console.log(results);
                counter++;

                await page.close();
            } catch (err) {
                fs.appendFileSync('errors.txt', `[${new Date().toISOString()}] ${item.domain} → ${err.message}\n`);
            }
        }

        console.log(JSON.stringify(results))

        const postRes = await fetch(POST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(results)
        });

        if (!postRes.ok) throw new Error(`Błąd POST: ${postRes.statusText}`);

        console.log('Dane wysłane pomyślnie');
    } catch (err) {
        fs.appendFileSync('errors.txt', `[${new Date().toISOString()}] GŁÓWNY → ${err.message}\n`);
    } finally {
        if (browser) await browser.close();
    }
})();
