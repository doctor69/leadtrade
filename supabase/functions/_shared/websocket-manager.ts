// import { number } from 'astro:schema'
// import { boolean } from 'astro:schema'
// import { string } from 'astro:schema'
// import { string } from 'astro:schema'
// import type { AuthContext } from './auth.ts'

// export interface WebSocketManager {
// sessionId: string
// userId: string
// socket: WebSocket
// alpacaSocket: WebSocket | null
// subscribedSymbols: Set<string>
// isAuthenticated: boolean
// lastActivity: Date
// reconnectAttempts: number
// }

// export interface WebSocketMessage {
//     type: 'quote' | 'bar' | 'trade' | 'status' | 'subscription' | 'error' | 'pong'
//     symbol?: string
//     data?: any
//     timestamp: string
//     sessionId?: string
// }

// export interface SubscriptionRequest {
//     action: 'subscribe' | 'unsubscribe'
//     quotes?: string[]
//     trades?: string[]
//     bars?: string[]
// }

// /**
//  * WebSocket Manager for handling persistent connections to Alpaca Markets
//  * Implements session-based connection management with authentication and reconnection logic
//  * 
//  * Requirements: 3.1, 3.2, 3.3, 3.5
//  */
// export class WebSocketManager {
//     private sessions: Map<string, WebSocketSession> = new Map()
//     private readonly MAX_RECONNECT_ATTEMPTS = 5
//     private readonly RECONNECT_DELAY_BASE = 1000 // 1 second
//     private readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
//     private readonly HEARTBEAT_INTERVAL = 30 * 1000 // 30 seconds
//     private heartbeatTimer: number | null = null

//     constructor() {
//         // Start session cleanup and heartbeat
//         this.startHeartbeat()
//         this.startSessionCleanup()
//     }

//     /**
//      * Creates a new WebSocket session for a user
//      * @param authContext The authenticated user context
//      * @param clientSocket The client WebSocket connection
//      * @returns Session ID
//      */
//     async createSession(authContext: AuthContext, clientSocket: WebSocket): Promise<string> {
//         const sessionId = this.generateSessionId(authContext.userId)

//         const session: WebSocketSession = {
//             sessionId,
//             userId: authContext.userId,
//             socket: clientSocket,
//             alpacaSocket: null,
//             subscribedSymbols: new Set(),
//             isAuthenticated: false,
//             lastActivity: new Date(),
//             reconnectAttempts: 0
//         }

//         // Store session
//         this.sessions.set(sessionId, session)

//         // Set up client socket handlers
//         this.setupClientSocketHandlers(session)

//         // Connect to Alpaca
//         await this.connectToAlpaca(session, authContext)

//         console.log(`WebSocket session created: ${sessionId} for user ${authContext.userId}`)
//         return sessionId
//     }

//     /**
//      * Removes a WebSocket session
//      * @param sessionId The session ID to remove
//      */
//     removeSession(sessionId: string): void {
//         const session = this.sessions.get(sessionId)
//         if (session) {
//             // Close Alpaca connection
//             if (session.alpacaSocket) {
//                 session.alpacaSocket.close()
//             }

//             // Close client connection if still open
//             if (session.socket.readyState === WebSocket.OPEN) {
//                 session.socket.close(1000, 'Session terminated')
//             }

//             this.sessions.delete(sessionId)
//             console.log(`WebSocket session removed: ${sessionId}`)
//         }
//     }

//     /**
//      * Subscribes to market data symbols for a session
//      * @param sessionId The session ID
//      * @param symbols Array of symbols to subscribe to
//      * @param dataType Type of data (quotes, trades, bars)
//      */
//     subscribe(sessionId: string, symbols: string[], dataType: 'quotes' | 'trades' | 'bars' = 'quotes'): void {
//         const session = this.sessions.get(sessionId)
//         if (!session || !session.isAuthenticated || !session.alpacaSocket) {
//             console.error(`Cannot subscribe: session ${sessionId} not found or not authenticated`)
//             return
//         }

//         // Send subscription to Alpaca
//         const subscriptionMessage = {
//             action: 'subscribe',
//             [dataType]: symbols
//         }

//         session.alpacaSocket.send(JSON.stringify(subscriptionMessage))

//         // Track subscribed symbols
//         symbols.forEach(symbol => session.subscribedSymbols.add(symbol))
//         session.lastActivity = new Date()

//         // Confirm subscription to client
//         this.sendToClient(session, {
//             type: 'subscription',
//             data: {
//                 action: 'subscribe',
//                 symbols,
//                 dataType
//             },
//             timestamp: new Date().toISOString()
//         })

//         console.log(`Subscribed session ${sessionId} to ${dataType}: ${symbols.join(', ')}`)
//     }

//     /**
//      * Unsubscribes from market data symbols for a session
//      * @param sessionId The session ID
//      * @param symbols Array of symbols to unsubscribe from
//      * @param dataType Type of data (quotes, trades, bars)
//      */
//     unsubscribe(sessionId: string, symbols: string[], dataType: 'quotes' | 'trades' | 'bars' = 'quotes'): void {
//         const session = this.sessions.get(sessionId)
//         if (!session || !session.alpacaSocket) {
//             console.error(`Cannot unsubscribe: session ${sessionId} not found`)
//             return
//         }

//         // Send unsubscription to Alpaca
//         const unsubscriptionMessage = {
//             action: 'unsubscribe',
//             [dataType]: symbols
//         }

//         session.alpacaSocket.send(JSON.stringify(unsubscriptionMessage))

//         // Remove from tracked symbols
//         symbols.forEach(symbol => session.subscribedSymbols.delete(symbol))
//         session.lastActivity = new Date()

//         // Confirm unsubscription to client
//         this.sendToClient(session, {
//             type: 'subscription',
//             data: {
//                 action: 'unsubscribe',
//                 symbols,
//                 dataType
//             },
//             timestamp: new Date().toISOString()
//         })

//         console.log(`Unsubscribed session ${sessionId} from ${dataType}: ${symbols.join(', ')}`)
//     }

//     /**
//      * Broadcasts market data to all subscribed sessions
//      * @param symbol The symbol for the data
//      * @param data The market data
//      * @param type The type of data (quote, trade, bar)
//      */
//     broadcastMarketData(symbol: string, data: any, type: 'quote' | 'trade' | 'bar'): void {
//         const message: WebSocketMessage = {
//             type,
//             symbol,
//             data,
//             timestamp: new Date().toISOString()
//         }

//         // Send to all sessions subscribed to this symbol
//         for (const session of this.sessions.values()) {
//             if (session.subscribedSymbols.has(symbol) && session.socket.readyState === WebSocket.OPEN) {
//                 this.sendToClient(session, message)
//             }
//         }
//     }

//     /**
//      * Gets the number of active sessions
//      */
//     getActiveSessionCount(): number {
//         return this.sessions.size
//     }

//     /**
//      * Gets session information for debugging
//      */
//     getSessionInfo(sessionId: string): Partial<WebSocketSession> | null {
//         const session = this.sessions.get(sessionId)
//         if (!session) return null

//         return {
//             sessionId: session.sessionId,
//             userId: session.userId,
//             subscribedSymbols: session.subscribedSymbols,
//             isAuthenticated: session.isAuthenticated,
//             lastActivity: session.lastActivity,
//             reconnectAttempts: session.reconnectAttempts
//         }
//     }

//     /**
//      * Connects to Alpaca WebSocket for a session
//      */
//     private async connectToAlpaca(session: WebSocketSession, authContext: AuthContext): Promise<void> {
//         try {
//             // Get Alpaca WebSocket URL based on trading mode
//             const streamUrl = authContext.tradingMode === 'paper'
//                 ? 'wss://paper-api.alpaca.markets/stream'
//                 : 'wss://api.alpaca.markets/stream'

//             session.alpacaSocket = new WebSocket(streamUrl)

//             session.alpacaSocket.onopen = () => {
//                 console.log(`Alpaca WebSocket connected for session ${session.sessionId}`)

//                 // Authenticate with Alpaca
//                 const alpacaApiKey = authContext.tradingMode === 'paper'
//                     ? Deno.env.get('PUBLIC_ALPACA_DATA_API_KEY')
//                     : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_API_KEY')

//                 const alpacaApiSecret = authContext.tradingMode === 'paper'
//                     ? Deno.env.get('PUBLIC_ALPACA_DATA_API_SECRET')
//                     : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_API_SECRET')

//                 if (alpacaApiKey && alpacaApiSecret) {
//                     session.alpacaSocket?.send(JSON.stringify({
//                         action: 'auth',
//                         key: alpacaApiKey,
//                         secret: alpacaApiSecret,
//                     }))
//                 } else {
//                     console.error('Alpaca API credentials not found')
//                     this.sendToClient(session, {
//                         type: 'error',
//                         data: { message: 'Alpaca API credentials not configured' },
//                         timestamp: new Date().toISOString()
//                     })
//                 }
//             }

//             session.alpacaSocket.onmessage = (event) => {
//                 this.handleAlpacaMessage(session, event.data)
//             }

//             session.alpacaSocket.onerror = (event) => {
//                 console.error(`Alpaca WebSocket error for session ${session.sessionId}:`, event)
//                 this.handleAlpacaError(session)
//             }

//             session.alpacaSocket.onclose = (event) => {
//                 console.log(`Alpaca WebSocket closed for session ${session.sessionId}:`, event.code, event.reason)
//                 this.handleAlpacaClose(session)
//             }

//         } catch (error) {
//             console.error(`Failed to connect to Alpaca for session ${session.sessionId}:`, error)
//             this.sendToClient(session, {
//                 type: 'error',
//                 data: { message: 'Failed to connect to Alpaca stream' },
//                 timestamp: new Date().toISOString()
//             })
//         }
//     }

//     /**
//      * Sets up client WebSocket event handlers
//      */
//     private setupClientSocketHandlers(session: WebSocketSession): void {
//         session.socket.onmessage = (event) => {
//             this.handleClientMessage(session, event.data)
//         }

//         session.socket.onerror = (event) => {
//             console.error(`Client WebSocket error for session ${session.sessionId}:`, event)
//         }

//         session.socket.onclose = (event) => {
//             console.log(`Client WebSocket closed for session ${session.sessionId}:`, event.code, event.reason)
//             this.removeSession(session.sessionId)
//         }
//     }

//     /**
//      * Handles messages from Alpaca WebSocket
//      */
//     private handleAlpacaMessage(session: WebSocketSession, data: string): void {
//         try {
//             const message = JSON.parse(data)

//             // Handle authentication response
//             if (message.T === 'success' && message.msg === 'authenticated') {
//                 session.isAuthenticated = true
//                 session.reconnectAttempts = 0
//                 console.log(`Alpaca authentication successful for session ${session.sessionId}`)

//                 this.sendToClient(session, {
//                     type: 'status',
//                     data: { message: 'authenticated', status: 'connected' },
//                     timestamp: new Date().toISOString()
//                 })
//                 return
//             }

//             // Handle authentication error
//             if (message.T === 'error') {
//                 console.error(`Alpaca authentication error for session ${session.sessionId}:`, message)
//                 this.sendToClient(session, {
//                     type: 'error',
//                     data: { message: message.msg || 'Authentication failed' },
//                     timestamp: new Date().toISOString()
//                 })
//                 return
//             }

//             // Forward market data to client
//             session.lastActivity = new Date()
//             session.socket.send(data)

//         } catch (error) {
//             console.error(`Error parsing Alpaca message for session ${session.sessionId}:`, error)
//         }
//     }

//     /**
//      * Handles client WebSocket messages
//      */
//     private handleClientMessage(session: WebSocketSession, data: string): void {
//         try {
//             const message = JSON.parse(data)
//             session.lastActivity = new Date()

//             // Handle subscription requests
//             if (message.action === 'subscribe' && session.isAuthenticated) {
//                 if (message.quotes) {
//                     this.subscribe(session.sessionId, message.quotes, 'quotes')
//                 }
//                 if (message.trades) {
//                     this.subscribe(session.sessionId, message.trades, 'trades')
//                 }
//                 if (message.bars) {
//                     this.subscribe(session.sessionId, message.bars, 'bars')
//                 }
//             }

//             // Handle unsubscription requests
//             else if (message.action === 'unsubscribe' && session.isAuthenticated) {
//                 if (message.quotes) {
//                     this.unsubscribe(session.sessionId, message.quotes, 'quotes')
//                 }
//                 if (message.trades) {
//                     this.unsubscribe(session.sessionId, message.trades, 'trades')
//                 }
//                 if (message.bars) {
//                     this.unsubscribe(session.sessionId, message.bars, 'bars')
//                 }
//             }

//             // Handle ping for connection health
//             else if (message.action === 'ping') {
//                 this.sendToClient(session, {
//                     type: 'pong',
//                     timestamp: new Date().toISOString()
//                 })
//             }

//         } catch (error) {
//             console.error(`Error parsing client message for session ${session.sessionId}:`, error)
//         }
//     }

//     /**
//      * Handles Alpaca WebSocket errors with reconnection logic
//      */
//     private handleAlpacaError(session: WebSocketSession): void {
//         if (session.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
//             session.reconnectAttempts++
//             const delay = this.RECONNECT_DELAY_BASE * Math.pow(2, session.reconnectAttempts - 1)

//             console.log(`Attempting to reconnect Alpaca WebSocket for session ${session.sessionId} (attempt ${session.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`)

//             setTimeout(() => {
//                 if (this.sessions.has(session.sessionId)) {
//                     // Get auth context from session (we'll need to pass this differently in actual implementation)
//                     // For now, we'll use a basic reconnection approach
//                     this.reconnectAlpaca(session)
//                 }
//             }, delay)
//         } else {
//             console.error(`Max reconnection attempts reached for session ${session.sessionId}`)
//             this.sendToClient(session, {
//                 type: 'error',
//                 data: { message: 'Connection lost and max reconnection attempts reached' },
//                 timestamp: new Date().toISOString()
//             })
//         }
//     }

//     /**
//      * Handles Alpaca WebSocket close events
//      */
//     private handleAlpacaClose(session: WebSocketSession): void {
//         session.isAuthenticated = false

//         // Attempt reconnection if session is still active
//         if (this.sessions.has(session.sessionId) && session.socket.readyState === WebSocket.OPEN) {
//             this.handleAlpacaError(session)
//         }
//     }

//     /**
//      * Attempts to reconnect to Alpaca WebSocket
//      */
//     private async reconnectAlpaca(session: WebSocketSession): Promise<void> {
//         // Close existing connection if any
//         if (session.alpacaSocket) {
//             session.alpacaSocket.close()
//             session.alpacaSocket = null
//         }

//         // Create new connection (we'll need auth context for this)
//         // For now, we'll use paper trading as default
//         const authContext = {
//             userId: session.userId,
//             tradingMode: 'paper' as const,
//             sessionToken: '',
//             isAuthenticated: true,
//             alpacaAccessToken: ''
//         }

//         await this.connectToAlpaca(session, authContext)
//     }

//     /**
//      * Sends a message to the client
//      */
//     private sendToClient(session: WebSocketSession, message: WebSocketMessage): void {
//         if (session.socket.readyState === WebSocket.OPEN) {
//             session.socket.send(JSON.stringify(message))
//         }
//     }

//     /**
//      * Generates a unique session ID
//      */
//     private generateSessionId(userId: string): string {
//         const timestamp = Date.now()
//         const random = Math.random().toString(36).substring(2)
//         return `${userId}_${timestamp}_${random}`
//     }

//     /**
//      * Starts the heartbeat timer to check connection health
//      */
//     private startHeartbeat(): void {
//         this.heartbeatTimer = setInterval(() => {
//             for (const session of this.sessions.values()) {
//                 if (session.socket.readyState === WebSocket.OPEN) {
//                     this.sendToClient(session, {
//                         type: 'status',
//                         data: { message: 'heartbeat' },
//                         timestamp: new Date().toISOString()
//                     })
//                 }
//             }
//         }, this.HEARTBEAT_INTERVAL)
//     }

//     /**
//      * Starts the session cleanup timer to remove inactive sessions
//      */
//     private startSessionCleanup(): void {
//         setInterval(() => {
//             const now = new Date()
//             const sessionsToRemove: string[] = []

//             for (const [sessionId, session] of this.sessions.entries()) {
//                 const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime()

//                 if (timeSinceLastActivity > this.SESSION_TIMEOUT ||
//                     session.socket.readyState === WebSocket.CLOSED) {
//                     sessionsToRemove.push(sessionId)
//                 }
//             }

//             sessionsToRemove.forEach(sessionId => {
//                 console.log(`Cleaning up inactive session: ${sessionId}`)
//                 this.removeSession(sessionId)
//             })
//         }, 60000) // Check every minute
//     }

//     /**
//      * Cleanup method to stop timers and close all connections
//      */
//     cleanup(): void {
//         if (this.heartbeatTimer) {
//             clearInterval(this.heartbeatTimer)
//         }

//         // Close all sessions
//         for (const sessionId of this.sessions.keys()) {
//             this.removeSession(sessionId)
//         }
//     }
// }

// // Global WebSocket manager instance
// export const webSocketManager = new WebSocketManager()