// Node-only (spawns the Python/browser bypass daemon). This file is also bundled into
// providers that run inside the NuvioTV app (QuickJS), where these modules and `process`
// don't exist: load them defensively so importing the file never throws there, and make
// getClearance() reject cleanly instead (see NODE_AVAILABLE).
let spawn = null;
let execFile = null;
let path = null;
let fs = null;
let http = null;
try {
    ({ spawn, execFile } = require('child_process'));
    path = require('path');
    fs = require('fs');
    http = require('http');
} catch (_) {
    path = null;
}
const NODE_AVAILABLE = path !== null;
const ENV = (typeof process !== 'undefined' && process.env) ? process.env : {};

/**
 * Cloudflare Bypass using Scrapling (Python) & Persistent Browser Daemon
 */

const activeBypasses = new Map();
const globalQueue = [];
let activeGlobalRequests = 0;

const MAX_GLOBAL_CONCURRENT = parseInt(ENV.SCRAPLING_MAX_CONCURRENT || '5', 10);
const MAX_GLOBAL_QUEUE = parseInt(ENV.SCRAPLING_MAX_QUEUE || '50', 10);
const GLOBAL_QUEUE_TIMEOUT = parseInt(ENV.SCRAPLING_QUEUE_TIMEOUT_MS || '60000', 10);
const SCRAPLING_DEFAULT_TIMEOUT = parseInt(ENV.SCRAPLING_DEFAULT_TIMEOUT_MS || '90000', 10);

let daemonProcess = null;
let camoufoxReady = false;
let camoufoxEnsurePromise = null;
let camoufoxFailure = null;
let camoufoxFailureAt = 0;
const CAMOUFOX_FAILURE_COOLDOWN_MS = 60000;

function runPythonCommand(pythonExe, args, timeout) {
    return new Promise((resolve) => {
        execFile(pythonExe, args, { timeout, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            resolve({
                error,
                stdout: String(stdout || '').trim(),
                stderr: String(stderr || '').trim()
            });
        });
    });
}

async function ensureCamoufoxInstalled(pythonExe) {
    if (camoufoxReady) return;
    if (camoufoxFailure && Date.now() - camoufoxFailureAt < CAMOUFOX_FAILURE_COOLDOWN_MS) {
        throw camoufoxFailure;
    }
    if (camoufoxEnsurePromise) return await camoufoxEnsurePromise;

    camoufoxEnsurePromise = (async () => {
        const checkArgs = ['-c', 'from camoufox.pkgman import installed_verstr; print(installed_verstr())'];
        const check = await runPythonCommand(pythonExe, checkArgs, 15000);
        if (!check.error) {
            camoufoxReady = true;
            return;
        }

        console.warn(`[SC] Camoufox browser missing for ${pythonExe}; running camoufox fetch...`);
        const fetched = await runPythonCommand(pythonExe, ['-m', 'camoufox', 'fetch'], 180000);
        let verified = fetched.error
            ? fetched
            : await runPythonCommand(pythonExe, checkArgs, 15000);

        if (verified.error) {
            console.warn('[SC] camoufox fetch did not install a browser; retrying release-tag installer...');
            const installerScript = path.join(__dirname, 'scripts', 'install_camoufox.py');
            const repaired = await runPythonCommand(
                pythonExe,
                fs.existsSync(installerScript)
                    ? [installerScript]
                    : ['-c', 'from camoufox.pkgman import camoufox_path; print(camoufox_path(download_if_missing=True))'],
                300000
            );
            if (!repaired.error) {
                verified = await runPythonCommand(pythonExe, checkArgs, 15000);
            } else {
                const fetchDetails = fetched.stderr || fetched.stdout || (fetched.error && fetched.error.message);
                const repairDetails = repaired.stderr || repaired.stdout || repaired.error.message;
                const details = [
                    fetchDetails && `fetch: ${fetchDetails}`,
                    `direct: ${repairDetails}`
                ].filter(Boolean).join('; ');
                const failure = new Error(`Camoufox remains unavailable after fetch: ${details}`);
                failure.code = 'CAMOUFOX_UNAVAILABLE';
                camoufoxFailure = failure;
                camoufoxFailureAt = Date.now();
                throw failure;
            }
        }

        if (verified.error) {
            const details = verified.stderr || verified.stdout || verified.error.message;
            const failure = new Error(`Camoufox remains unavailable after install: ${details}`);
            failure.code = 'CAMOUFOX_UNAVAILABLE';
            camoufoxFailure = failure;
            camoufoxFailureAt = Date.now();
            throw failure;
        }
        camoufoxReady = true;
        camoufoxFailure = null;
        camoufoxFailureAt = 0;
    })().finally(() => {
        camoufoxEnsurePromise = null;
    });

    return await camoufoxEnsurePromise;
}

function createRelease() {
    let released = false;
    return () => {
        if (released) return;
        released = true;
        activeGlobalRequests = Math.max(0, activeGlobalRequests - 1);
        drainGlobalQueue();
    };
}

function drainGlobalQueue() {
    while (activeGlobalRequests < MAX_GLOBAL_CONCURRENT && globalQueue.length > 0) {
        const entry = globalQueue.shift();
        if (!entry || entry.done) continue;

        entry.done = true;
        clearTimeout(entry.timeoutId);
        activeGlobalRequests++;
        entry.resolve(createRelease());
    }
}

function acquireGlobalSlot(provider, url) {
    if (activeGlobalRequests < MAX_GLOBAL_CONCURRENT) {
        activeGlobalRequests++;
        return Promise.resolve(createRelease());
    }

    if (globalQueue.length >= MAX_GLOBAL_QUEUE) {
        return Promise.reject(new Error(`Coda Scrapling piena (${globalQueue.length}/${MAX_GLOBAL_QUEUE}) per ${provider}`));
    }

    return new Promise((resolve, reject) => {
        const entry = { provider, url, done: false, resolve, reject, timeoutId: null };
        entry.timeoutId = setTimeout(() => {
            if (entry.done) return;
            entry.done = true;
            const index = globalQueue.indexOf(entry);
            if (index >= 0) globalQueue.splice(index, 1);
            reject(new Error(`Timeout coda Scrapling dopo ${GLOBAL_QUEUE_TIMEOUT}ms per ${provider}`));
        }, GLOBAL_QUEUE_TIMEOUT);
        globalQueue.push(entry);
    });
}

function getPythonExe() {
    const venvPython = path.join(process.cwd(), '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    if (fs.existsSync(venvPython)) return venvPython;
    return process.platform === 'win32' ? 'python' : 'python3';
}

async function ensureDaemonStarted() {
    if (daemonProcess) return;
    const daemonScript = path.join(__dirname, 'src', 'utils', 'cf_daemon.py');
    if (!fs.existsSync(daemonScript)) return;

    const pythonExe = getPythonExe();
    await ensureCamoufoxInstalled(pythonExe);
    console.log(`[SC] Avvio Camoufox Daemon in background...`);
    daemonProcess = spawn(pythonExe, [daemonScript], {
        stdio: ['ignore', 'inherit', 'inherit'],
        detached: process.platform !== 'win32'
    });
    daemonProcess.on('exit', () => {
        daemonProcess = null;
    });
    // Wait for daemon HTTP server to start listening
    await new Promise(r => setTimeout(r, 1500));
}

async function requestDaemon(url, provider, options = {}) {
    await ensureDaemonStarted();
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            url,
            provider,
            method: options.method || 'GET',
            data: options.body || null,
            timeout: parseInt(options.timeout, 10) || SCRAPLING_DEFAULT_TIMEOUT
        });

        const req = http.request({
            hostname: '127.0.0.1',
            port: 8192,
            path: '/bypass',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            },
            timeout: (parseInt(options.timeout, 10) || SCRAPLING_DEFAULT_TIMEOUT) + 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.status === 'ok') {
                        resolve(parsed);
                    } else {
                        reject(new Error(parsed ? parsed.message : 'Daemon error'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', err => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Daemon HTTP request timeout'));
        });
        req.write(payload);
        req.end();
    });
}

function execPythonBypass(url, provider, options = {}) {
    if (!NODE_AVAILABLE) return Promise.reject(new Error('Cloudflare bypass unavailable in this runtime'));
    return requestDaemon(url, provider, options);
}

async function runBypass(url, provider, options, sessionFile) {
    const releaseSlot = await acquireGlobalSlot(provider, url);

    try {
        const result = await execPythonBypass(url, provider, options);
        
        // Convert Scrapling cookies to FlareSolverr-like string and domains
        const cookiesList = Array.isArray(result.cookies) ? result.cookies : [];
        const cookiesStr = cookiesList
            .filter(c => c && c.name && c.value)
            .map(c => `${c.name}=${c.value}`)
            .join('; ');
        const cookieDomains = [...new Set(cookiesList.map(c => c.domain).filter(Boolean))];

        const data = {
            userAgent: result.userAgent,
            cookies: cookiesStr,
            url: result.url,
            response: result.html,
            cookieDomains: cookieDomains,
            requestHeaders: result.requestHeaders,
            timestamp: Date.now()
        };

        // Save session
        try {
            fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error(`[SC] Errore salvataggio sessione: ${e.message}`);
        }

        console.log(`[SC][${provider}] Bypass completato con successo.`);
        return data;
    } finally {
        releaseSlot();
    }
}

async function getClearance(url, provider = 'default', options = {}) {
    if (!NODE_AVAILABLE) throw new Error('Cloudflare bypass unavailable in this runtime');
    const sessionFile = path.join(process.cwd(), `cf-session-${provider}.json`);

    if (activeBypasses.has(provider)) {
        return activeBypasses.get(provider);
    }

    // Load existing session cookies to pass to scrapling (so it avoids re-solving CF)
    let existingCookies = '';
    if (fs.existsSync(sessionFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
            if (data && data.cookies) existingCookies = data.cookies;
        } catch (e) {}
    }
    if (existingCookies) {
        const existingHeaders = options.headers || {};
        existingHeaders.Cookie = existingCookies;
        options.headers = existingHeaders;
    }

    const bypassPromise = runBypass(url, provider, options, sessionFile)
        .finally(() => {
            activeBypasses.delete(provider);
        });

    activeBypasses.set(provider, bypassPromise);
    return bypassPromise;
}

function hasActiveBypass(provider) {
    return activeBypasses.has(provider);
}

module.exports = { getClearance, hasActiveBypass, execPythonBypass, getStats: () => ({ active: activeGlobalRequests, queued: globalQueue.length }) };
