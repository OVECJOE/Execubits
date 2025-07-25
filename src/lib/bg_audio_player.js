import { spawn } from 'node:child_process'
import os from 'node:os'

export default class BgAudioPlayer {
    constructor() {}

    async playBuffer(wavBuffer) {
        let playerCmd, playerArgs
        const platform = os.platform()
        if (platform === 'linux') {
            playerCmd = 'aplay'
            playerArgs = ['-q', '-']
        } else if (platform === 'darwin') {
            playerCmd = 'afplay'
            playerArgs = ['-']
        } else if (platform === 'win32') {
            playerCmd = 'powershell'
            playerArgs = ['-c', 'Add-Type -AssemblyName presentationCore; $player = New-Object system.media.soundplayer; $player.stream = [System.IO.MemoryStream]::new(); [byte[]]$buf = 0..65535|%{0}; while(($n = $input.Read($buf,0,$buf.Length)) -gt 0){$player.stream.Write($buf,0,$n)}; $player.stream.Position=0; $player.PlaySync()']
        } else {
            throw new Error('Unsupported platform for audio playback')
        }
        return new Promise((resolve, reject) => {
            const proc = spawn(playerCmd, playerArgs, { stdio: ['pipe', 'ignore', 'ignore'] })
            proc.stdin.write(wavBuffer)
            proc.stdin.end()
            proc.on('error', reject)
            proc.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Audio player exited with code ${code}`))
                } else {
                    resolve()
                }
            })
        })
    }
}