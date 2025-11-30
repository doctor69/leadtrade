/**
 * WebSocket client optimized for static pages
 * Handles client-side connections to Alpaca API
 */

import { marketDataCache, cacheKeys } from './cache';
import { env } from './env';

// WebSocket client for Alpaca streaming API
import { decode } from '@msgpack/msgpack';

interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: number;
}

interface ConnectionConfig {
    url: string;
    apiKey?: string;
    apiSecret?: string;
    reconnectAttempts: number;
    reconnectDelay: number;
    heartbeatInterval: number;
}

interface MarketDataUpdate {
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    volume: number;
    change: number;
    changePercent: number;
    lastUpdate: string;
}

export class StaticWebSocketClient {
    private ws: WebSocket | null = null;
    config: ConnectionConfig;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private listeners = new Map<string, Set<(data: any) => void>>();
    private connectionState: 'disconnected' | 'connecting' | 'connected' | 'authenticated' = 'disconnected';
    private reconnectCount = 0;
    private isManualDisconnect = false;

    constructor(config: Partial<ConnectionConfig> = {}) {
        this.config = {
            url: config.url || 'wss://stream.data.alpaca.markets/v2/test',
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
            reconnectAttempts: config.reconnectAttempts || 5,
            reconnectDelay: config.reconnectDelay || 1000,
            heartbeatInterval: config.heartbeatInterval || 30000,
        };
    }

    /**
     * Connect to Alpaca WebSocket
     */
    async connect(url?: string): Promise<void> {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            return; // Already connecting
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return; // Already connected
        }

        try {
            this.connectionState = 'connecting';
            this.emit('connection', { status: 'connecting' });

            const wsUrl = url || this.config.url;
            console.log('Connecting to WebSocket:', wsUrl);

            this.ws = new WebSocket(wsUrl);

            this.setupEventHandlers();

        } catch (error: unknown) {
            console.error('Failed to create WebSocket connection:', error);
            this.emit('error', { error: 'Failed to create WebSocket connection' });
        }
    }

    /**
     * Set up WebSocket event handlers
     */
    private setupEventHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.connectionState = 'connected';
            this.reconnectCount = 0;
            this.emit('connection', { status: 'connected' });
            
            // Authenticate immediately after connection
            this.authenticate();
        };

        this.ws.onmessage = (event) => {
            try {
                // Handle different message types
                if (typeof event.data === 'string') {
                    // Handle string messages (JSON)
                    let message;
                    try {
                        // Skip empty or malformed messages
                        if (!event.data || event.data.trim() === '') {
                            return;
                        }
                        
                        message = JSON.parse(event.data);
                    } catch (parseError) {
                        // Log but don't throw - this prevents unhandled promise rejections
                        console.warn('Failed to parse JSON message, skipping:', event.data.substring(0, 100));
                        return;
                    }
                    this.handleMessage(message);
                } else if (event.data instanceof ArrayBuffer) {
                    // Handle binary messages (MessagePack)
                    this.handleBinaryMessage(event.data);
                } else if (event.data instanceof Blob) {
                    // Convert Blob to ArrayBuffer for MessagePack decoding
                    event.data.arrayBuffer().then((arrayBuffer) => {
                        this.handleBinaryMessage(arrayBuffer);
                    }).catch((error) => {
                        console.error('Failed to convert Blob to ArrayBuffer:', error);
                    }).catch(() => {
                        // Catch any additional errors to prevent unhandled promise rejections
                        console.warn('Blob processing failed, skipping message');
                    });
                } else {
                    console.warn('Unhandled message type:', typeof event.data, event.data);
                }
            } catch (error) {
                console.error('Failed to handle WebSocket message:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.connectionState = 'disconnected';
            this.stopHeartbeat();
            this.emit('connection', { status: 'disconnected', code: event.code });

            // Attempt reconnection if not manual disconnect
            if (!this.isManualDisconnect && this.reconnectCount < this.config.reconnectAttempts) {
                this.scheduleReconnect();
            } else if (this.reconnectCount >= this.config.reconnectAttempts) {
                console.error('Max reconnection attempts reached');
                this.emit('error', { error: 'Max reconnection attempts reached' });
            }
        };

        this.ws.onerror = (error: Event) => {
            console.error('WebSocket error:', error);
            this.emit('error', { error: 'WebSocket connection error' });
        };
    }

    /**
     * Authenticate with Alpaca
     */
    private authenticate(): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const authMessage = {
            action: 'auth',
            key: this.config.apiKey,
            secret: this.config.apiSecret,
        };

        console.log('Authenticating with Alpaca streaming service...');
        this.ws.send(JSON.stringify(authMessage));
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(message: any): void {
        console.log('🔍 Processing message type:', message.stream || message.T || 'unknown', message);
        
        // Handle authorization stream messages (new format)
        if (message.stream === 'authorization') {
            const authData = message.data;
            console.log('🔐 Authorization response:', authData);
            
            if (authData.status === 'authorized') {
                console.log('✅ Successfully authenticated with Alpaca streaming service');
                this.connectionState = 'authenticated';
                this.emit('authenticated', { status: 'authenticated' });
                this.startHeartbeat();
                
                // Subscribe to market data using correct format
                this.subscribeToMarketData();
                return;
            } else if (authData.status === 'unauthorized') {
                console.error('❌ Alpaca authentication failed:', authData.message);
                this.emit('error', { error: `Authentication failed: ${authData.message}` });
                return;
            }
        }
        
        // Handle listening confirmation
        if (message.stream === 'listening') {
            const listenData = message.data;
            console.log('✅ Successfully subscribed to streams:', listenData.streams);
            this.emit('listening', { streams: listenData.streams });
            return;
        }
        
        // Handle authentication success (legacy format)
        if (message.T === 'success' && message.msg === 'authenticated') {
            console.log('✅ Successfully authenticated with Alpaca streaming service');
            this.connectionState = 'authenticated';
            this.emit('authenticated', { status: 'authenticated' });
            this.startHeartbeat();
            
            // Subscribe to market data using correct format
            this.subscribeToMarketData();
            return;
        }

        // Handle authentication error (legacy format)
        if (message.T === 'error') {
            console.error('❌ Alpaca authentication error:', message);
            this.emit('error', { error: `Authentication failed: ${message.msg || 'Unknown error'}` });
            return;
        }

        // Handle trade updates (new format from documentation)
        if (message.stream === 'trade_updates') {
            console.log('💰 Received trade update:', message);
            this.emit('tradeUpdate', message);
            return;
        }

        // Handle trade updates (legacy binary MessagePack format)
        if (message.T === 'trade_updates' || message.T === 'trade_update') {
            console.log('💰 Received legacy trade update:', message);
            this.emit('tradeUpdate', message);
            return;
        }

        // Handle other message types
        console.log('📨 Unhandled message type:', message.stream || message.T || 'unknown', message);
    }

    /**
     * Handle binary messages (trade updates)
     */
    private handleBinaryMessage(data: ArrayBuffer): void {
        try {
            // Decode MessagePack binary data
            const message = decode(data);
            // MessagePack decode returns the parsed object directly, no need for JSON.parse
            this.handleMessage(message);
        } catch (error) {
            console.error('Failed to decode binary message:', error);
            // Final fallback to text decoding
            try {
                const textDecoder = new TextDecoder();
                const text = textDecoder.decode(data);
                console.log('Raw binary as text:', text);
                const message = JSON.parse(text);
                this.handleMessage(message);
            } catch (fallbackError) {
                console.error('Failed to parse fallback text as JSON:', fallbackError);
            }
        }
    }

    /**
     * Parse market data from WebSocket message
     */
    private parseMarketData(message: any): MarketDataUpdate | null {
        try {
            if (message.T === 'q') {
                // Quote data
                const midPrice = (message.bp + message.ap) / 2;
                return {
                    symbol: message.S,
                    price: midPrice,
                    bid: message.bp,
                    ask: message.ap,
                    volume: 0,
                    change: 0,
                    changePercent: 0,
                    lastUpdate: message.t || new Date().toISOString(),
                };
            } else if (message.T === 't') {
                // Trade data
                return {
                    symbol: message.S,
                    price: message.p,
                    bid: message.p - 0.01,
                    ask: message.p + 0.01,
                    volume: message.s,
                    change: 0,
                    changePercent: 0,
                    lastUpdate: message.t || new Date().toISOString(),
                };
            }
        } catch (error) {
            console.error('Failed to parse market data:', error);
        }

        return null;
    }

    /**
     * Subscribe to market data for symbols
     */
    subscribe(symbols: string[]): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not connected, cannot subscribe');
            return;
        }

        const subscribeMessage = {
            action: 'subscribe',
            quotes: symbols,
            trades: symbols,
        };

        this.ws.send(JSON.stringify(subscribeMessage));
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ action: 'ping' }));
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * Stop heartbeat timer
     */
    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect(): void {
        const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectCount);
        this.reconnectCount++;

        console.log(`Scheduling reconnection attempt ${this.reconnectCount} in ${delay}ms`);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Add event listener
     */
    on(event: string, callback: (data: any) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    /**
     * Remove event listener
     */
    off(event: string, callback: (data: any) => void): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
        }
    }

    /**
     * Emit event to listeners
     */
    private emit(event: string, data: any): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Disconnect WebSocket
     */
    disconnect(): void {
        this.isManualDisconnect = true;
        this.connectionState = 'disconnected';

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.stopHeartbeat();

        if (this.ws) {
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }
    }

    /**
     * Get current connection status
     */
    getConnectionState(): string {
        return this.connectionState;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connectionState === 'connected' || this.connectionState === 'authenticated';
    }

    /**
     * Subscribe to market data
     */
    private subscribeToMarketData(): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const subscribeMessage = {
            action: 'subscribe',
            trades: ['SPY', 'AAPL', 'MSFT'], // Default symbols
            quotes: ['SPY', 'AAPL', 'MSFT'],
            bars: ['SPY', 'AAPL', 'MSFT']
        };

        console.log('Subscribing to market data with correct format:', subscribeMessage);
        this.ws.send(JSON.stringify(subscribeMessage));
    }
}

// Create singleton instance for the application
export const staticWebSocketClient = new StaticWebSocketClient();

// Utility functions for common operations
export const webSocketUtils = {
    /**
     * Initialize WebSocket connection for static pages
     */
    async initializeForStaticPage(symbols: string[] = []): Promise<void> {
        // Get WebSocket URL from environment configuration
        const wsUrl = env.alpacaMarketDataWsUrl;

        // Get API credentials from environment configuration
        const apiKey = env.alpacaApiKey;
        const apiSecret = env.alpacaApiSecret;

        if (!apiKey || !apiSecret) {
            console.error('Alpaca API credentials not configured');
            return;
        }

        // Configure the client
        staticWebSocketClient.config.url = wsUrl;
        staticWebSocketClient.config.apiKey = apiKey;
        staticWebSocketClient.config.apiSecret = apiSecret;

        await staticWebSocketClient.connect(wsUrl);

        if (symbols.length > 0) {
            staticWebSocketClient.subscribe(symbols);
        }
    },

    /**
     * Get cached market data with fallback
     */
    getCachedMarketData(symbol: string): MarketDataUpdate | null {
        return marketDataCache.get(cacheKeys.marketData(symbol));
    },

    /**
     * Subscribe to market data updates
     */
    subscribeToMarketData(callback: (data: MarketDataUpdate) => void): () => void {
        staticWebSocketClient.on('marketData', callback);

        // Return unsubscribe function
        return () => {
            staticWebSocketClient.off('marketData', callback);
        };
    },

    /**
     * Subscribe to connection status updates
     */
    subscribeToConnection(callback: (status: any) => void): () => void {
        staticWebSocketClient.on('connection', callback);

        return () => {
            staticWebSocketClient.off('connection', callback);
        };
    },
};