import BgAudioPlayer from './bg_audio_player.js'
import { setVolume, changeSpeed, seek, repeat, encodeWav } from './wav.js'
import store from '../store.js'
import AudioManager from './audio_manager.js'

export const executeInstructions = async (instructions) => {
    // Filter out comments and blank lines
    instructions = instructions.filter(inst => inst.code && !/^#|\/\//.test(inst.code.trim()))
    const storeState = store.get()
    let playerState = { ...storeState.player }
    let seekSeconds = 0
    let speed = 1
    let volume = 1
    let halted = false
    let repeatCount = 0
    let chunkIndex = 0
    const player = new BgAudioPlayer()
    const audioManager = new AudioManager(storeState.audioFiles[0] || storeState.audioFiles)
    for await (const { pcm, wavInfo } of audioManager.pcmChunks()) {
        let chunkPCM = Buffer.from(pcm)
        let chunkSeek = seekSeconds
        let chunkSpeed = speed
        let chunkVolume = volume
        let chunkHalted = false
        let chunkInstructions = instructions
        let currentIdx = 0
        while (currentIdx < chunkInstructions.length && !chunkHalted) {
            const inst = chunkInstructions[currentIdx]
            const { code, data } = inst
            switch (code) {
                case '1111': // PLAY
                    playerState.status = 'playing'
                    store.update('player', { ...playerState, currentInstruction: 'PLAY' })
                    try {
                        let manipulated = chunkPCM
                        if (chunkSeek > 0) {
                            manipulated = seek(manipulated, wavInfo.bitsPerSample, wavInfo.numChannels, wavInfo.sampleRate, chunkSeek)
                        }
                        if (chunkSpeed !== 1) {
                            manipulated = changeSpeed(manipulated, wavInfo.bitsPerSample, chunkSpeed)
                        }
                        if (chunkVolume !== 1) {
                            manipulated = setVolume(manipulated, wavInfo.bitsPerSample, chunkVolume)
                        }
                        const wavBuffer = encodeWav({
                            pcm: manipulated,
                            numChannels: wavInfo.numChannels,
                            sampleRate: Math.round(wavInfo.sampleRate * chunkSpeed),
                            bitsPerSample: wavInfo.bitsPerSample,
                        })
                        await player.playBuffer(wavBuffer)
                    } catch (err) {
                        store.update('player', { ...playerState, currentInstruction: 'PLAY', status: 'error' })
                        console.error('Playback error:', err.message)
                        chunkHalted = true
                    }
                    break
                case '1110': // PAUSE
                    playerState.status = 'paused'
                    store.update('player', { ...playerState, currentInstruction: 'PAUSE' })
                    break
                case '0000': // HALT
                    playerState.status = 'halted'
                    store.update('player', { ...playerState, currentInstruction: 'HALT' })
                    chunkHalted = true
                    halted = true
                    break
                case '0001': // DELAY
                    let ms = 0
                    if (data[0].endsWith('ms')) ms = parseInt(data[0])
                    else if (data[0].endsWith('s')) ms = parseFloat(data[0]) * 1000
                    else if (data[0].endsWith('m')) ms = parseFloat(data[0]) * 60000
                    else if (data[0].endsWith('h')) ms = parseFloat(data[0]) * 3600000
                    else ms = parseInt(data[0]) * 1000
                    store.update('player', { ...playerState, currentInstruction: 'DELAY' })
                    await new Promise(r => setTimeout(r, ms))
                    break
                case '0010': // FORWARD
                    chunkSeek += data[0] ? parseFloat(data[0]) : 5
                    store.update('player', { ...playerState, currentInstruction: 'FORWARD' })
                    break
                case '1101': // BACKWARD
                    chunkSeek -= data[0] ? parseFloat(data[0]) : 5
                    if (chunkSeek < 0) chunkSeek = 0
                    store.update('player', { ...playerState, currentInstruction: 'BACKWARD' })
                    break
                case '0011': // VOLUME_UP
                    chunkVolume = Math.min(chunkVolume + 0.1, 2)
                    store.update('player', { ...playerState, currentInstruction: 'VOLUME_UP' })
                    break
                case '1100': // VOLUME_DOWN
                    chunkVolume = Math.max(chunkVolume - 0.1, 0)
                    store.update('player', { ...playerState, currentInstruction: 'VOLUME_DOWN' })
                    break
                case '0101': // SPEED_UP
                    chunkSpeed = Math.min(chunkSpeed + 0.1, 2)
                    store.update('player', { ...playerState, currentInstruction: 'SPEED_UP' })
                    break
                case '1010': // SPEED_DOWN
                    chunkSpeed = Math.max(chunkSpeed - 0.1, 0.5)
                    store.update('player', { ...playerState, currentInstruction: 'SPEED_DOWN' })
                    break
                case '0100': // REPEAT
                    repeatCount = data[0] ? parseInt(data[0]) : 1
                    if (repeatCount > 1) {
                        chunkPCM = repeat(chunkPCM, repeatCount)
                    }
                    playerState.repeat = true
                    store.update('player', { ...playerState, currentInstruction: 'REPEAT' })
                    break
                case '1011': // JUMP
                    if (data[0].match(/^(?:\d{1,2}:)?\d{1,2}:\d{1,2}$/)) {
                        const parts = data[0].split(':').map(Number)
                        let seconds = 0
                        if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
                        else if (parts.length === 2) seconds = parts[0] * 60 + parts[1]
                        chunkSeek = seconds
                    } else if (data[0].match(/^(?:[+-]?\d+)(s)?$/)) {
                        chunkSeek += parseInt(data[0])
                        if (chunkSeek < 0) chunkSeek = 0
                    }
                    store.update('player', { ...playerState, currentInstruction: 'JUMP' })
                    break
            }
            playerState.history.push(code)
            if (chunkHalted) break
            currentIdx++
        }
        if (halted) break
        chunkIndex++
    }
}