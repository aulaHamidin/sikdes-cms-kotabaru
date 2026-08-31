import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const galleryDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(galleryDir, '..', '..');
const evidenceDir = resolve(projectRoot, 'doc', 'visual-qa');
const pageUrl = process.env.SIKDES_QA_URL || 'http://127.0.0.1:8765/design/component-gallery/';
const browserCandidates = [
    process.env.SIKDES_QA_BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const viewports = [
    { name: 'mobile-320', width: 320, height: 900 },
    { name: 'tablet-768', width: 768, height: 900 },
    { name: 'desktop-1024', width: 1024, height: 900 },
    { name: 'desktop-1440', width: 1440, height: 1000 },
];

function delay(milliseconds) {
    return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function fileExists(path) {
    try {
        const { access } = await import('node:fs/promises');
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function freePort() {
    return new Promise((resolvePort, rejectPort) => {
        const server = createServer();
        server.unref();
        server.on('error', rejectPort);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            server.close(() => resolvePort(address.port));
        });
    });
}

class CdpSession {
    constructor(webSocketUrl) {
        this.nextId = 1;
        this.pending = new Map();
        this.eventWaiters = new Map();
        this.listeners = new Map();
        this.socket = new WebSocket(webSocketUrl);
        this.ready = new Promise((resolveReady, rejectReady) => {
            this.socket.addEventListener('open', resolveReady, { once: true });
            this.socket.addEventListener('error', rejectReady, { once: true });
        });
        this.socket.addEventListener('message', (event) => this.receive(JSON.parse(event.data)));
    }

    receive(message) {
        if (message.id) {
            const callback = this.pending.get(message.id);
            if (!callback) return;
            this.pending.delete(message.id);
            if (message.error) callback.reject(new Error(message.error.message));
            else callback.resolve(message.result || {});
            return;
        }

        const waiters = this.eventWaiters.get(message.method) || [];
        const waiter = waiters.shift();
        if (waiter) waiter(message.params || {});

        for (const listener of this.listeners.get(message.method) || []) {
            listener(message.params || {});
        }
    }

    async send(method, params = {}) {
        await this.ready;
        const id = this.nextId++;
        return new Promise((resolveSend, rejectSend) => {
            this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }

    waitFor(method, timeout = 10000) {
        return new Promise((resolveEvent, rejectEvent) => {
            const timeoutId = setTimeout(() => rejectEvent(new Error(`Timeout waiting for ${method}`)), timeout);
            const waiters = this.eventWaiters.get(method) || [];
            waiters.push((params) => {
                clearTimeout(timeoutId);
                resolveEvent(params);
            });
            this.eventWaiters.set(method, waiters);
        });
    }

    on(method, listener) {
        const listeners = this.listeners.get(method) || [];
        listeners.push(listener);
        this.listeners.set(method, listeners);
    }

    close() {
        this.socket.close();
    }
}

async function evaluate(cdp, expression) {
    const result = await cdp.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true,
    });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
}

async function key(cdp, keyName, code, virtualKey, modifiers = 0) {
    const base = { key: keyName, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, modifiers };
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

async function screenshot(cdp, filename, fullPage = true) {
    let params = { format: 'png', fromSurface: true, captureBeyondViewport: fullPage };
    if (fullPage) {
        const metrics = await cdp.send('Page.getLayoutMetrics');
        const content = metrics.cssContentSize || metrics.contentSize;
        const viewportWidth = await evaluate(cdp, 'innerWidth');
        params = {
            ...params,
            clip: {
                x: 0,
                y: 0,
                width: Math.ceil(viewportWidth),
                height: Math.ceil(content.height),
                scale: 1,
            },
        };
    }
    const capture = await cdp.send('Page.captureScreenshot', params);
    const outputPath = resolve(evidenceDir, filename);
    await writeFile(outputPath, Buffer.from(capture.data, 'base64'));
    return outputPath;
}

async function navigate(cdp, url) {
    const loaded = cdp.waitFor('Page.loadEventFired');
    await cdp.send('Page.navigate', { url });
    await loaded;
    await evaluate(cdp, 'document.fonts.ready.then(() => true)');
    await delay(150);
}

const auditExpression = `(() => {
    const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const label = (element) => element.id ? '#' + element.id :
        element.className ? element.tagName.toLowerCase() + '.' + String(element.className).trim().split(/\\s+/).join('.') :
        element.tagName.toLowerCase();
    const parseRgb = (value) => {
        const parts = value.match(/[\\d.]+/g);
        return parts ? parts.slice(0, 3).map(Number) : [0, 0, 0];
    };
    const luminance = (rgb) => {
        const values = rgb.map((channel) => {
            const value = channel / 255;
            return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
        });
        return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
    };
    const contrast = (foreground, background) => {
        const first = luminance(parseRgb(foreground));
        const second = luminance(parseRgb(background));
        return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
    };
    const contrastSelectors = ['.button.primary', '.button.danger', '.notification-count', '.badge.success', '.badge.danger', '.alert.warning', '.side-nav a.active'];
    const contrastChecks = contrastSelectors.map((selector) => {
        const element = document.querySelector(selector);
        const style = getComputedStyle(element);
        return { selector, ratio: Number(contrast(style.color, style.backgroundColor).toFixed(2)), color: style.color, background: style.backgroundColor };
    });
    const targetSelector = '.button, .icon-button, .page-number, .side-nav a, input:not(.visually-hidden), select, textarea, .drop-zone, .account-button';
    const undersizedTargets = Array.from(document.querySelectorAll(targetSelector)).filter(visible).map((element) => {
        const rect = element.getBoundingClientRect();
        return { element: label(element), width: Math.round(rect.width), height: Math.round(rect.height), text: (element.innerText || element.value || '').trim().slice(0, 40) };
    }).filter((target) => target.width < 44 || target.height < 44);
    const formControls = Array.from(document.querySelectorAll('input:not([type=hidden]), select, textarea')).filter((element) => !element.classList.contains('visually-hidden'));
    const unnamedControls = Array.from(document.querySelectorAll('button, a[href], input, select, textarea')).filter(visible).filter((element) => {
        const name = element.getAttribute('aria-label') || element.getAttribute('title') || element.innerText || element.value || (element.labels && Array.from(element.labels).map((item) => item.innerText).join(' '));
        return !String(name || '').trim();
    }).map(label);
    const unlabeledFields = formControls.filter((element) => !(element.labels && element.labels.length) && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')).map(label);
    const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index).filter((id, index, all) => all.indexOf(id) === index);
    const externalResources = performance.getEntriesByType('resource').map((item) => item.name).filter((url) => new URL(url).origin !== location.origin);
    const gradients = Array.from(document.querySelectorAll('*')).filter((element) => getComputedStyle(element).backgroundImage.includes('gradient')).map(label);
    const horizontalScrollRegions = Array.from(document.querySelectorAll('*')).filter(visible).filter((element) => {
        const overflowX = getComputedStyle(element).overflowX;
        return (overflowX === 'auto' || overflowX === 'scroll') && element.scrollWidth > element.clientWidth + 1;
    });
    const namedHorizontalScrollRegions = horizontalScrollRegions.filter((element) => element.getAttribute('role') === 'region' && (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')));
    const insideNamedScrollRegion = (element) => namedHorizontalScrollRegions.some((region) => region === element || region.contains(element));
    const overflowingElements = Array.from(document.querySelectorAll('body *')).filter(visible).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right > innerWidth + 1 && !insideNamedScrollRegion(element);
    }).map((element) => {
        const rect = element.getBoundingClientRect();
        return { element: label(element), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
    }).slice(0, 40);
    const layoutProbes = ['.app-column', 'main', '.data-card', '.table-wrap', '.pagination', '.chart-card', '.bar-chart'].map((selector) => {
        const element = document.querySelector(selector);
        const rect = element.getBoundingClientRect();
        return { selector, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, overflowX: getComputedStyle(element).overflowX };
    });
    const originalScrollY = scrollY;
    scrollTo(9999, originalScrollY);
    const horizontalScrollReach = scrollX;
    scrollTo(0, originalScrollY);
    const pageLayoutWidth = Math.ceil(Math.max(...Array.from(document.body.children).filter(visible).filter((element) => getComputedStyle(element).position !== 'fixed').map((element) => element.getBoundingClientRect().right), 0));
    const unlabeledScrollRegions = horizontalScrollRegions.filter((element) => !namedHorizontalScrollRegions.includes(element)).map(label);
    const metricColumns = getComputedStyle(document.querySelector('.metric-grid')).gridTemplateColumns.split(' ').length;
    const firstFocusable = document.querySelector('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    return {
        screenId: document.querySelector('[data-screen-id]')?.dataset.screenId,
        title: document.title,
        language: document.documentElement.lang,
        h1Count: document.querySelectorAll('h1').length,
        landmarks: { header: !!document.querySelector('header'), nav: !!document.querySelector('nav'), main: !!document.querySelector('main'), footer: !!document.querySelector('footer') },
        firstFocusable: label(firstFocusable),
        pageLayoutWidth,
        rootScrollWidth: document.scrollingElement.scrollWidth,
        viewportWidth: innerWidth,
        horizontalOverflow: horizontalScrollReach > 1 || pageLayoutWidth > innerWidth + 1,
        duplicateIds,
        externalResources,
        gradients,
        overflowingElements,
        layoutProbes,
        horizontalScrollReach,
        unlabeledScrollRegions,
        unnamedControls,
        unlabeledFields,
        undersizedTargets,
        contrastChecks,
        metricColumns,
        javascriptReady: document.documentElement.dataset.javascriptReady === 'true',
    };
})()`;

async function interactionAudit(cdp, viewport) {
    const results = {};

    results.skipLink = await evaluate(cdp, `(() => {
        const link = document.querySelector('.skip-link');
        link.focus();
        const rect = link.getBoundingClientRect();
        return { focused: document.activeElement === link, matchesFocus: link.matches(':focus'), documentFocused: document.hasFocus(), visible: rect.top >= 0, target: link.getAttribute('href'), top: Math.round(rect.top), transform: getComputedStyle(link).transform };
    })()`);

    results.modalOpen = await evaluate(cdp, `(() => {
        const trigger = document.querySelector('#modal-trigger');
        trigger.click();
        return { hidden: document.querySelector('#confirm-modal').hidden, activeText: document.activeElement.textContent.trim(), bodyLocked: document.body.style.overflow === 'hidden' };
    })()`);
    results.modalTrap = await evaluate(cdp, `(() => {
        const items = Array.from(document.querySelectorAll('#confirm-modal button'));
        items[items.length - 1].focus();
        return items[0].textContent.trim();
    })()`);
    await key(cdp, 'Tab', 'Tab', 9);
    results.modalTrap = { expected: results.modalTrap, actual: await evaluate(cdp, 'document.activeElement.textContent.trim()') };
    if (viewport.width === 1440) await screenshot(cdp, 'desktop-1440-modal.png', false);
    await key(cdp, 'Escape', 'Escape', 27);
    results.modalClose = await evaluate(cdp, `({ hidden: document.querySelector('#confirm-modal').hidden, returnFocus: document.activeElement.id })`);

    results.toast = await evaluate(cdp, `(() => {
        document.querySelector('#toast-trigger').click();
        const shown = !document.querySelector('#success-toast').hidden;
        document.querySelector('#toast-close').click();
        return { shown, closed: document.querySelector('#success-toast').hidden };
    })()`);

    if (viewport.width < 1024) {
        results.sidebarOpen = await evaluate(cdp, `(() => {
            document.querySelector('#sidebar-open').click();
            return { open: document.querySelector('#app-sidebar').classList.contains('open'), expanded: document.querySelector('#sidebar-open').getAttribute('aria-expanded'), focus: document.activeElement.id };
        })()`);
        const expectedLast = await evaluate(cdp, `(() => {
            const items = Array.from(document.querySelectorAll('#app-sidebar a[href], #app-sidebar button')).filter((item) => item.offsetParent !== null);
            items[0].focus();
            return items[items.length - 1].textContent.trim();
        })()`);
        await key(cdp, 'Tab', 'Tab', 9, 8);
        results.sidebarTrap = { expected: expectedLast, actual: await evaluate(cdp, 'document.activeElement.textContent.trim()') };
        if (viewport.width === 320) {
            await delay(220);
            await screenshot(cdp, 'mobile-320-navigation-drawer.png', false);
        }
        await key(cdp, 'Escape', 'Escape', 27);
        results.sidebarClose = await evaluate(cdp, `({ open: document.querySelector('#app-sidebar').classList.contains('open'), expanded: document.querySelector('#sidebar-open').getAttribute('aria-expanded'), returnFocus: document.activeElement.id })`);

        results.filterOpen = await evaluate(cdp, `(() => {
            document.querySelector('#filter-trigger').click();
            return { hidden: document.querySelector('#filter-drawer').hidden, expanded: document.querySelector('#filter-trigger').getAttribute('aria-expanded'), focus: document.activeElement.id };
        })()`);
        const expectedFirst = await evaluate(cdp, `(() => {
            const items = Array.from(document.querySelectorAll('#filter-drawer button, #filter-drawer input, #filter-drawer select')).filter((item) => item.offsetParent !== null);
            items[items.length - 1].focus();
            return items[0].id;
        })()`);
        await key(cdp, 'Tab', 'Tab', 9);
        results.filterTrap = { expected: expectedFirst, actual: await evaluate(cdp, 'document.activeElement.id') };
        if (viewport.width === 320) await screenshot(cdp, 'mobile-320-filter-drawer.png', false);
        await key(cdp, 'Escape', 'Escape', 27);
        results.filterClose = await evaluate(cdp, `({ hidden: document.querySelector('#filter-drawer').hidden, expanded: document.querySelector('#filter-trigger').getAttribute('aria-expanded'), returnFocus: document.activeElement.id })`);
    }

    results.rowNavigation = await evaluate(cdp, `(() => {
        history.replaceState(null, '', location.pathname);
        document.querySelector('tr[data-href]').click();
        return location.hash;
    })()`);

    results.loadingButton = await evaluate(cdp, `(() => {
        const button = document.querySelector('#loading-trigger');
        button.click();
        return { disabled: button.disabled, loading: button.classList.contains('loading'), text: button.textContent };
    })()`);
    await delay(1700);
    results.loadingReset = await evaluate(cdp, `(() => {
        const button = document.querySelector('#loading-trigger');
        return { disabled: button.disabled, loading: button.classList.contains('loading'), text: button.textContent };
    })()`);

    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    results.reducedMotion = await evaluate(cdp, `(() => ({
        matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        spinnerDuration: getComputedStyle(document.querySelector('.spinner')).animationDuration,
        sidebarTransition: getComputedStyle(document.querySelector('.sidebar')).transitionDuration
    }))()`);
    await cdp.send('Emulation.setEmulatedMedia', { features: [] });

    return results;
}

function collectFailures(result) {
    const failures = [];
    const { viewport, audit, interactions } = result;
    const prefix = viewport.name;
    if (audit.screenId !== 'DEV-COMPONENT-GALLERY') failures.push(`${prefix}: Screen ID salah`);
    if (audit.h1Count !== 1) failures.push(`${prefix}: jumlah h1 bukan satu`);
    if (!Object.values(audit.landmarks).every(Boolean)) failures.push(`${prefix}: landmark layout tidak lengkap`);
    if (audit.firstFocusable !== 'a.skip-link') failures.push(`${prefix}: skip link bukan fokus pertama`);
    if (!audit.javascriptReady) failures.push(`${prefix}: marker kesiapan JavaScript tidak ditemukan`);
    if (audit.horizontalOverflow) failures.push(`${prefix}: page layout ${audit.pageLayoutWidth}px pada viewport ${audit.viewportWidth}px`);
    if (audit.overflowingElements.length) failures.push(`${prefix}: ${audit.overflowingElements.length} elemen keluar dari page layout di luar region scroll berlabel`);
    if (audit.duplicateIds.length) failures.push(`${prefix}: ID duplikat ${audit.duplicateIds.join(', ')}`);
    if (audit.externalResources.length) failures.push(`${prefix}: memuat resource eksternal`);
    if (audit.gradients.length) failures.push(`${prefix}: gradient ditemukan`);
    if (audit.unnamedControls.length) failures.push(`${prefix}: control tanpa nama aksesibel`);
    if (audit.unlabeledFields.length) failures.push(`${prefix}: field tanpa label`);
    if (audit.unlabeledScrollRegions.length) failures.push(`${prefix}: region scroll horizontal tanpa role/nama aksesibel`);
    if (audit.undersizedTargets.length) failures.push(`${prefix}: ${audit.undersizedTargets.length} target di bawah 44x44`);
    for (const check of audit.contrastChecks) {
        if (check.ratio < 4.5) failures.push(`${prefix}: kontras ${check.selector} hanya ${check.ratio}:1`);
    }
    const expectedMetricColumns = viewport.width < 421 ? 1 : viewport.width < 1024 ? 2 : 4;
    if (audit.metricColumns !== expectedMetricColumns) failures.push(`${prefix}: metric grid ${audit.metricColumns} kolom, seharusnya ${expectedMetricColumns}`);
    if (!interactions.skipLink.focused || !interactions.skipLink.visible || interactions.skipLink.target !== '#main-content') failures.push(`${prefix}: skip link gagal`);
    if (interactions.modalOpen.hidden || !interactions.modalOpen.bodyLocked) failures.push(`${prefix}: modal tidak terbuka/lock`);
    if (interactions.modalTrap.expected !== interactions.modalTrap.actual) failures.push(`${prefix}: focus trap modal gagal`);
    if (!interactions.modalClose.hidden || interactions.modalClose.returnFocus !== 'modal-trigger') failures.push(`${prefix}: modal tidak mengembalikan fokus`);
    if (!interactions.toast.shown || !interactions.toast.closed) failures.push(`${prefix}: toast gagal`);
    if (viewport.width < 1024) {
        if (!interactions.sidebarOpen.open || interactions.sidebarOpen.expanded !== 'true' || interactions.sidebarOpen.focus !== 'sidebar-close') failures.push(`${prefix}: navigation drawer gagal dibuka`);
        if (interactions.sidebarTrap.expected !== interactions.sidebarTrap.actual) failures.push(`${prefix}: focus trap navigation drawer gagal`);
        if (interactions.sidebarClose.open || interactions.sidebarClose.expanded !== 'false' || interactions.sidebarClose.returnFocus !== 'sidebar-open') failures.push(`${prefix}: navigation drawer gagal ditutup`);
        if (interactions.filterOpen.hidden || interactions.filterOpen.expanded !== 'true' || interactions.filterOpen.focus !== 'filter-close') failures.push(`${prefix}: filter drawer gagal dibuka`);
        if (interactions.filterTrap.expected !== interactions.filterTrap.actual) failures.push(`${prefix}: focus trap filter drawer gagal`);
        if (!interactions.filterClose.hidden || interactions.filterClose.expanded !== 'false' || interactions.filterClose.returnFocus !== 'filter-trigger') failures.push(`${prefix}: filter drawer gagal ditutup`);
    }
    if (interactions.rowNavigation !== '#data') failures.push(`${prefix}: row navigation gagal`);
    if (!interactions.loadingButton.disabled || !interactions.loadingButton.loading || interactions.loadingButton.text !== 'Memproses…') failures.push(`${prefix}: state loading tombol gagal`);
    if (interactions.loadingReset.disabled || interactions.loadingReset.loading || interactions.loadingReset.text !== 'Uji loading') failures.push(`${prefix}: state loading tombol tidak pulih`);
    if (!interactions.reducedMotion.matches || parseFloat(interactions.reducedMotion.spinnerDuration) > .01 || parseFloat(interactions.reducedMotion.sidebarTransition) > .01) failures.push(`${prefix}: reduced motion tidak dihormati`);
    return failures;
}

await mkdir(evidenceDir, { recursive: true });
const browserPath = (await Promise.all(browserCandidates.map(async (candidate) => [candidate, await fileExists(candidate)]))).find(([, exists]) => exists)?.[0];
if (!browserPath) throw new Error('Microsoft Edge atau Google Chrome tidak ditemukan.');

const debugPort = await freePort();
const profileDir = await mkdtemp(join(tmpdir(), 'sikdes-visual-qa-'));
const browserProcess = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-gpu',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });

let browserError = '';
browserProcess.stderr.on('data', (chunk) => { browserError += chunk.toString(); });

let version;
for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        if (response.ok) {
            version = await response.json();
            break;
        }
    } catch {
        await delay(100);
    }
}
if (!version) {
    browserProcess.kill();
    throw new Error(`Browser DevTools tidak aktif. ${browserError.slice(-1000)}`);
}

const targetResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?about%3Ablank`, { method: 'PUT' });
const target = await targetResponse.json();
const cdp = new CdpSession(target.webSocketDebuggerUrl);
const consoleErrors = [];
const runtimeErrors = [];
const failedRequests = [];

await cdp.send('Page.enable');
await cdp.send('Page.bringToFront');
await cdp.send('Runtime.enable');
await cdp.send('Log.enable');
await cdp.send('Network.enable');
cdp.on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'error') consoleErrors.push({ source: entry.source, text: entry.text, url: entry.url });
});
cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => runtimeErrors.push(exceptionDetails.exception?.description || exceptionDetails.text));
cdp.on('Network.loadingFailed', (event) => {
    if (!event.canceled) failedRequests.push({ errorText: event.errorText, type: event.type });
});

const results = [];
try {
    for (const viewport of viewports) {
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: viewport.width,
            height: viewport.height,
            deviceScaleFactor: 1,
            mobile: false,
            screenWidth: viewport.width,
            screenHeight: viewport.height,
        });
        await navigate(cdp, pageUrl);
        const audit = await evaluate(cdp, auditExpression);
        const interactions = await interactionAudit(cdp, viewport);
        await navigate(cdp, pageUrl);
        await screenshot(cdp, `${viewport.name}-full.png`, true);
        results.push({ viewport, audit, interactions });
    }
} finally {
    try {
        await cdp.send('Browser.close');
    } catch {
        browserProcess.kill();
    }
    cdp.close();
    for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
            await rm(profileDir, { recursive: true, force: true });
            break;
        } catch (error) {
            if (error.code !== 'EBUSY' || attempt === 19) throw error;
            await delay(100);
        }
    }
}

const failures = results.flatMap(collectFailures);
if (consoleErrors.length) failures.push(`${consoleErrors.length} error console browser`);
if (runtimeErrors.length) failures.push(`${runtimeErrors.length} exception JavaScript`);
if (failedRequests.length) failures.push(`${failedRequests.length} request gagal`);

const report = {
    generatedAt: new Date().toISOString(),
    url: pageUrl,
    browser: { executable: browserPath, product: version.Browser, protocol: version['Protocol-Version'] },
    viewports: results,
    consoleErrors,
    runtimeErrors,
    failedRequests,
    failures,
    passed: failures.length === 0,
};
await writeFile(resolve(evidenceDir, 'visual-qa-results.json'), JSON.stringify(report, null, 2) + '\n');

console.log(JSON.stringify({ passed: report.passed, browser: report.browser.product, failures, evidenceDir }, null, 2));
if (!report.passed) process.exitCode = 1;
