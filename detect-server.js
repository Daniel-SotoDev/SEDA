(function(){
    const PORT = 4000;
    function timeoutFetch(url, ms = 1500) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

async function probe(baseUrl) {
    try {
        const url = baseUrl.replace(/\/$/, '') + '/server-info';
        const resp = await timeoutFetch(url, 1200);
    if (!resp || !resp.ok) return null;
        const json = await resp.json();
    if (json && (json.addresses || json.ip || json.port)) {
        return baseUrl.replace(/\/$/, '');
    }
        return null;
    } catch (e) {
        return null;
    }
}

async function loadConfigCandidates() {
    try {
      // usar ruta relativa para que funcione dentro de la webview / bundle
        const resp = await timeoutFetch('config.json', 800);
    if (!resp || !resp.ok) return [];
        const j = await resp.json();
    if (Array.isArray(j.serverCandidates)) return j.serverCandidates;
        return [];
    } catch (e) {
        return [];
    }
}

async function detectServerInternal() {
    const candidates = [];
    if (window.config && window.config.serverUrl) candidates.push(window.config.serverUrl);

    if (location.protocol && location.protocol.startsWith('http') && location.hostname) {
        const port = window.config?.serverPort || PORT;
        candidates.push(`${location.protocol}//${location.hostname}:${port}`);
    }

    candidates.push(`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`);

    const cfgCandidates = await loadConfigCandidates();
    candidates.push(...cfgCandidates);

    const seen = new Set();
    const finalCandidates = candidates.filter(c => {
    if (!c) return false;
        const key = c.replace(/\/$/, '');
    if (seen.has(key)) return false;
        seen.add(key);
    return true;
    });

    for (const c of finalCandidates) {
        const ok = await probe(c);
    if (ok) {
        window.config = window.config || {};
        window.config.serverUrl = ok;
        window.config.serverPort = (ok.match(/:(\d+)$/) || [null, PORT])[1];
        console.log('[detect-server] encontrado:', ok);
        // dispatch event
        document.dispatchEvent(new CustomEvent('server-detected', { detail: { serverUrl: ok } }));
        return ok;
    }
}

    //intento limitado de subred (rápido muestreo)
    try {
        let localIp = location.hostname;
    if (!localIp || localIp === 'localhost') {
        try {
            const resp = await timeoutFetch(`http://localhost:${PORT}/server-info`, 800);
            const j = resp && resp.ok ? await resp.json() : null;
        if (j && j.addresses && j.addresses[0]) localIp = j.addresses[0];
            else if (j && j.ip) localIp = j.ip;
        } catch (e) { /* ignore */ }
    }
    if (localIp && /^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[0-1])/.test(localIp)) {
        const prefix = localIp.split('.').slice(0, 3).join('.');
        const testIps = [1, 10, 50, 100, 150, 200, 254];
        for (const n of testIps) {
            const candidate = `http://${prefix}.${n}:${PORT}`;
        if (await probe(candidate)) {
            window.config = window.config || {};
            window.config.serverUrl = candidate;
            window.config.serverPort = PORT;
            document.dispatchEvent(new CustomEvent('server-detected', { detail: { serverUrl: candidate } }));
            return candidate;
            }
        }
    }
} catch (e) { /* no crítico */ }

    console.warn('[detect-server] no detectado automáticamente.');
    return null;
}

  // Exponer promise global para que otros scripts esperen
window.serverDetectionPromise = (async () => {
    const found = await detectServerInternal();
    // fallback: check localStorage manual
    if (!found) {
        window.config = window.config || {};
        const saved = localStorage.getItem('serverUrlManual');
    if (saved) {
        window.config.serverUrl = saved;
        document.dispatchEvent(new CustomEvent('server-detected', { detail: { serverUrl: saved } }));
        return saved;
    }
      // prompt de ultimo recurso
    try {
        const ip = prompt("No se detectó servidor. Ingresa la URL del servidor (http://IP:PUERTO):");
        if (ip) {
            const cleaned = ip.replace(/\/$/, '');
            window.config.serverUrl = cleaned;
            localStorage.setItem('serverUrlManual', cleaned);
            document.dispatchEvent(new CustomEvent('server-detected', { detail: { serverUrl: cleaned } }));
        return cleaned;
        }
      } catch (e) { /* ignore */ }
    }
    return window.config?.serverUrl || null;
})();

})();
