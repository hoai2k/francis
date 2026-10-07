/*
 * mini-rooms client: browser side of the mini-rooms relay
 * (multiplayer/server). No dependencies; load it with a plain <script> tag
 * and use the global `MiniRooms`. See MULTIPLAYER.md at the repository root.
 *
 *   const net = MiniRooms.connect('tankwars');          // one per game
 *   const stop = net.watchRooms(rooms => ...);          // lobby list, polled
 *   const room = net.host(roomId, { title, name, capacity });
 *   const room = net.join(roomId, { name });
 *
 *   room.publishPresence(data)        // my latest state (throttled, last wins)
 *   room.subscribePresence(({ peers }) => ...)   // peers: { peerId: data }, excludes me
 *   room.publishTopic(topic, data)    // one-off event to everyone else
 *   room.subscribeTopic(topic, (data, fromPeerId) => ...)
 *   room.onClose(reason => ...)       // 'host_left' | 'full' | 'not_found' | 'disconnected' | ...
 *   room.peerId, room.isHost, room.leave()
 */
(function () {
    // The deployed server. Pages on localhost talk to `wrangler dev` instead.
    const PRODUCTION_URL = 'https://mini-rooms.hoai2k.workers.dev';
    const LOCAL_URL = 'http://localhost:8787';
    const PRESENCE_INTERVAL_MS = 50;

    function defaultServer() {
        const override = new URLSearchParams(location.search).get('rooms');
        if (override) return override;
        const local = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
        return local ? LOCAL_URL : PRODUCTION_URL;
    }

    function newRoomId() {
        if (crypto.randomUUID) return crypto.randomUUID();
        return 'r' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    function connect(game, options = {}) {
        const server = (options.server || defaultServer()).replace(/\/$/, '');
        const wsBase = server.replace(/^http/, 'ws');

        async function listRooms() {
            const res = await fetch(`${server}/lobby/${encodeURIComponent(game)}`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`lobby request failed: ${res.status}`);
            return (await res.json()).rooms;
        }

        function watchRooms(callback, intervalMs = 3000) {
            let stopped = false, timer = null;
            const tick = async () => {
                try {
                    const rooms = await listRooms();
                    if (!stopped) callback({ rooms });
                } catch (error) {
                    if (!stopped) callback({ rooms: [], error });
                }
                if (!stopped) timer = setTimeout(tick, intervalMs);
            };
            tick();
            return () => { stopped = true; clearTimeout(timer); };
        }

        function open(roomId, params) {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) query.set(k, String(v)); });
            return createRoom(`${wsBase}/room/${encodeURIComponent(game)}/${encodeURIComponent(roomId)}?${query}`);
        }

        return {
            game,
            server,
            listRooms,
            watchRooms,
            newRoomId,
            host: (roomId, { title, name, capacity } = {}) => open(roomId, { host: 1, title, name, capacity }),
            join: (roomId, { name } = {}) => open(roomId, { name })
        };
    }

    function createRoom(url) {
        const ws = new WebSocket(url);
        const peers = {};
        const presenceListeners = new Set();
        const topicListeners = new Map();
        const closeListeners = new Set();
        const outbox = [];
        let pendingPresence = null, presenceTimer = null, closed = false, closeReason = null;

        const room = {
            peerId: null,
            isHost: false,
            ready: false,
            get peers() { return peers; },

            publishPresence(data) {
                pendingPresence = data;
                if (!presenceTimer) presenceTimer = setTimeout(flushPresence, PRESENCE_INTERVAL_MS);
            },
            subscribePresence(_query, callback) {
                // (query, cb) matches InstantDB's signature; (cb) works too.
                const cb = typeof _query === 'function' ? _query : callback;
                presenceListeners.add(cb);
                if (room.ready) cb({ peers });
                return () => presenceListeners.delete(cb);
            },
            publishTopic(topic, data) {
                send({ t: 'm', topic, d: data });
            },
            subscribeTopic(topic, callback) {
                if (!topicListeners.has(topic)) topicListeners.set(topic, new Set());
                topicListeners.get(topic).add(callback);
                return () => topicListeners.get(topic)?.delete(callback);
            },
            onClose(callback) {
                if (closed) callback(closeReason);
                else closeListeners.add(callback);
                return () => closeListeners.delete(callback);
            },
            leave() {
                finish('left');
                try { ws.close(1000, 'left'); } catch (e) {}
            }
        };
        room.unsubscribe = room.leave;

        function send(msg) {
            if (closed) return;
            const text = JSON.stringify(msg);
            if (ws.readyState === WebSocket.OPEN) ws.send(text);
            else if (ws.readyState === WebSocket.CONNECTING) outbox.push(text);
        }

        function flushPresence() {
            presenceTimer = null;
            if (pendingPresence === null) return;
            const data = pendingPresence;
            pendingPresence = null;
            send({ t: 'p', d: data });
        }

        function emitPresence() {
            presenceListeners.forEach(cb => { try { cb({ peers }); } catch (e) { console.error(e); } });
        }

        function finish(reason) {
            if (closed) return;
            closed = true;
            closeReason = reason;
            clearTimeout(presenceTimer);
            closeListeners.forEach(cb => { try { cb(reason); } catch (e) { console.error(e); } });
            closeListeners.clear();
        }

        ws.addEventListener('open', () => {
            outbox.splice(0).forEach(text => ws.send(text));
        });

        ws.addEventListener('message', event => {
            let msg;
            try { msg = JSON.parse(event.data); } catch (e) { return; }
            switch (msg.t) {
                case 'welcome':
                    room.peerId = msg.you;
                    room.isHost = !!msg.host;
                    room.ready = true;
                    Object.assign(peers, msg.peers);
                    emitPresence();
                    break;
                case 'join':
                    peers[msg.from] = peers[msg.from] || {};
                    emitPresence();
                    break;
                case 'p':
                    peers[msg.from] = msg.d || {};
                    emitPresence();
                    break;
                case 'leave':
                    delete peers[msg.from];
                    emitPresence();
                    break;
                case 'm':
                    topicListeners.get(msg.topic)?.forEach(cb => { try { cb(msg.d, msg.from); } catch (e) { console.error(e); } });
                    break;
                case 'closed':
                    finish(msg.reason || 'closed');
                    break;
            }
        });

        ws.addEventListener('close', () => finish('disconnected'));
        ws.addEventListener('error', () => finish('disconnected'));
        return room;
    }

    window.MiniRooms = { connect, newRoomId, defaultServer };
})();
