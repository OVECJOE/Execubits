import { EventEmitter } from 'node:events'
import { deepCopy, showErrMsgAndExit, showWarningMsg } from './utils.js'

/**
 * @class EStore
 * @extends EventEmitter
 * 
 * @summary A central warehouse that manages the state of the application.
 * @description
 *      As this is a CLI application that relies heavily on events, this store was created to manage the state of the application.
 *      The store is responsible for managing the state of the application, and emitting events when the state changes. It also
 *      listens for events and updates the state accordingly. The store is a singleton, meaning that there is only one instance of
 *      the store that is shared across the application. It uses the event emitter pattern to emit and listen for events.
 * 
 * @example
 * const store = EStore.init()
 * store.on('onChange', (state) => {
 *    showInfoMsg(`The state has changed: ${JSON.stringify(state)}`)
 * })
 * store.update('player', { status: 'playing' })
 * 
 * @property {Object} store The store of the application. This contains the state, the actions, and the mutations of the application
 * @property {EStore} instance The singleton instance of the store
 * 
*/
const EStore = (function () {
    const privateKey = Symbol('EStore')

    class EStore extends EventEmitter {
        /** @type {{ audioStream: ReadableStream | null, audioFiles: string[], instructions: string[], player: { status: string, volume: number, speed: number, repeat: boolean, currentInstruction: string | null, history: string[] }, feedback: { status: string, message: string } }} */
        #store = {
            audioStream: null,
            audioFiles: [],
            instructions: [],
            player: {
                status: 'halted',
                volume: 1,
                speed: 1,
                repeat: false,
                currentInstruction: null,
                history: [],
            },
            feedback: {
                status: 'idle',
                message: '',
            },
        }

        /** @type {Record<string, any>} */
        #trappedInitialState = null

        /** @type {EStore} */
        static #instance = null
    
        /**
         * @constructor
         * @description
         *      Creates an instance of the store.
         *      This is a private constructor and should not be called directly.
         *      Use the `init` method to get an instance of the store.
         * 
         * @param {Symbol} key A private key to prevent instantiation of the store from outside the class
         * @param {Record<string, any>} initialState The initial state of the store
         * @private
         */
        constructor(key, initialState = {}) {
            if (key !== privateKey) {
                throw new Error('Cannot instantiate EStore. Use EStore.init() instead.')
            }
            
            super()
            this.#set(initialState, false)
            this.#trappedInitialState = deepCopy(this.#store)
        }

        /**
         * @method init
         * @description
         *      Returns the singleton instance of the store.
         *      If an instance of the store does not exist, it creates one.
         * 
         * @param {Record<string, any>} initialState The initial state of the store
         * @returns {EStore} The singleton instance of the store
         */
        static init(initialState = {}) {
            if (!EStore.#instance) {
                EStore.#instance = new EStore(privateKey, initialState)
            }
            return EStore.#instance
        }

        /**
         * @method
         */

        /**
         * @method get
         * @description
         *      Returns the current state of the store.
         * 
         * @returns {Record<string, any>} The current state of the store
         */
        get() {
            return Object.freeze(this.#store)
        }

        /**
         * @method getItem
         * @description
         *     Returns a specific part of the store.
         * 
         * @param {string} key The key of the store to get
         * @returns {any} The value of the store
         */
        getItem(key) {
            if (!this.#store.hasOwnProperty(key)) {
                showErrMsgAndExit(`The key '${key}' does not exist in the store`)
            }

            if (typeof this.#store[key] === 'object') {
                return Object.freeze(this.#store[key])
            }

            return this.#store[key]
        }

        /**
         * @method set
         * @description
         *      Sets the state of the store.
         *      Emits an event 'onChange' with the new state.
         * 
         * @param {Record<string, any>} newState The new state of the store
         */
        #set(newState, emit = true) {
            const cleanedState = {}

            for (const [key, value] of Object.entries(newState)) {
                if (!this.#store.hasOwnProperty(key) && typeof this.#store[key] !== typeof value) {
                    showWarningMsg(`WARNING: The key '${key}' does not exist in the store; skipping...`)
                    continue
                }

                cleanedState[key] = value
            }

            this.#store = { ...this.#store, ...cleanedState }
            if (emit) {
                this.emit('onChange', this.#store)
            }
        }

        /**
         * @method update
         * @description
         *     Updates a specific part of the store.
         *     Emits an event 'onChange' with the new state.
         * 
         * @param {string} key The key of the store to update
         * @param {any} value The new value of the store
         * 
         * @emits onChange
         */
        update(key, value) {
            if (!this.#store.hasOwnProperty(key)) {
                showErrMsgAndExit(`The key '${key}' does not exist in the store`)
            }

            this.#set({ [key]: value })
        }

        /**
         * @method reset
         * @description
         *      Resets the store to its initial state.
         *      Emits an event 'onChange' with the new state.
         * 
         * @emits onChange
         */
        reset() {
            this.#set(this.#trappedInitialState)
        }

        /**
         * @method destroy
         * @description
         *      Destroys the store.
         *      Removes all listeners and sets the instance to null.
         */
        destroy() {
            this.removeAllListeners()
            EStore.#instance = null
        }
    }

    return EStore
})()

export default EStore.init()