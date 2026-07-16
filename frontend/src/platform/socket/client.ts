import { io, type Socket } from 'socket.io-client';

import { env } from '@/config/env';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type SocketEventHandler = (payload: unknown) => void;

/**
 * SOCKET PLATFORM client. The ONE Socket.IO wrapper — business modules NEVER
 * `io()` directly. Handles: authenticated connect (token via injected getter),
 * reconnect with backoff, room join/leave (idempotent + re-joined on reconnect),
 * presence, heartbeat, connection-state subscription and multi-namespace. Emits
 * arrive/leave through `on/off/emit`.
 */
export class SocketClient {
  private sockets = new Map<string, Socket>();
  private state: ConnectionState = 'disconnected';
  private stateListeners = new Set<(s: ConnectionState) => void>();
  private joinedRooms = new Map<string, Set<string>>(); // namespace → rooms (re-joined on reconnect)
  private getToken: () => string | null = () => null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  setTokenProvider(fn: () => string | null) { this.getToken = fn; }

  /** Connect a namespace (default '/'). Idempotent — returns the existing socket. */
  connect(namespace = '/'): Socket {
    const existing = this.sockets.get(namespace);
    if (existing) return existing;
    if (!env.socket.enabled) return this.stub(namespace);

    this.setState('connecting');
    const socket = io((env.socket.url || undefined) + namespace, {
      path: env.socket.path,
      // Prefer WebSocket, but allow polling when a mobile network or proxy blocks
      // the upgrade. Socket.IO will upgrade automatically when WebSocket recovers.
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      auth: (cb) => cb({ token: this.getToken() }),
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 8000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      this.setState('connected');
      this.rejoin(namespace);
      this.startHeartbeat(socket);
    });
    socket.io.on('reconnect_attempt', () => this.setState('reconnecting'));
    socket.on('disconnect', () => this.setState('disconnected'));
    socket.on('connect_error', () => this.setState('error'));

    this.sockets.set(namespace, socket);
    return socket;
  }

  /** Push a fresh token + reconnect (e.g. after login / token refresh). */
  reauthenticate(namespace = '/') {
    const socket = this.sockets.get(namespace);
    if (!socket) return;
    socket.auth = { token: this.getToken() };
    socket.disconnect().connect();
  }

  on(event: string, handler: SocketEventHandler, namespace = '/') {
    const socket = this.connect(namespace);
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }
  emit(event: string, payload?: unknown, namespace = '/') {
    this.connect(namespace).emit(event, payload);
  }

  joinRoom(room: string, namespace = '/') {
    const set = this.joinedRooms.get(namespace) ?? new Set();
    set.add(room);
    this.joinedRooms.set(namespace, set);
    this.emit('room:join', { room }, namespace);
  }
  leaveRoom(room: string, namespace = '/') {
    this.joinedRooms.get(namespace)?.delete(room);
    this.emit('room:leave', { room }, namespace);
  }

  onState(listener: (s: ConnectionState) => void) {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }
  getState() { return this.state; }

  disconnectAll() {
    this.stopHeartbeat();
    this.sockets.forEach((s) => s.disconnect());
    this.sockets.clear();
    this.setState('disconnected');
  }

  /* ── internals ── */
  private setState(s: ConnectionState) {
    if (this.state === s) return;
    this.state = s;
    this.stateListeners.forEach((l) => l(s));
  }
  private rejoin(namespace: string) {
    this.joinedRooms.get(namespace)?.forEach((room) => this.emit('room:join', { room }, namespace));
  }
  private startHeartbeat(socket: Socket) {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => socket.connected && socket.emit('ping:client'), 25000);
  }
  private stopHeartbeat() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }
  /** No-op socket for when sockets are disabled (SSR / feature off). */
  private stub(namespace: string): Socket {
    const noop = { on: () => noop, off: () => noop, emit: () => noop, connected: false, disconnect: () => noop, connect: () => noop } as unknown as Socket;
    this.sockets.set(namespace, noop);
    return noop;
  }
}

export const socketClient = new SocketClient();
