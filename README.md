# Execubits

Execubits is a zero-dependency Node.js CLI tool for automating and manipulating audio playback using custom hexadecimal instruction scripts (`.ebits`). It supports real-time, in-memory audio editing, including seeking, speed, volume, repeat, and more, across single or multiple `.wav` files.

---

## Features

- **Single or Multiple WAV Files:**
  - Provide a single `.wav` file or a directory of `.wav` files to concatenate and automate as one seamless track.
- **Zero Dependencies:**
  - All audio processing is done in pure Node.js/JavaScript.
- **In-Memory Audio Manipulation:**
  - Seek, jump, speed up/down, volume up/down, repeat, delay, and halt.
- **Automation via Scripts:**
  - Write `.ebits` scripts to automate playback and editing.
- **Cross-Platform Playback:**
  - Uses system audio player (`aplay`, `afplay`, or PowerShell`) for output.

---

## Installation

Clone the repository and install dependencies (only for development/testing):

```sh
git clone <repo-url>
cd Execubits
npm install # Only needed for development (chalk, jest)
```

---

## Usage

### 1. Prepare Your Audio

- Place one or more `.wav` files in a directory, or use a single `.wav` file.

### 2. Write Your `.ebits` Script

- Create a text file with the `.ebits` extension.
- Each line is a 4-digit hex instruction, optionally followed by data (see below).

### 3. Run the CLI

```sh
node src/index.js <script.ebits> -a <audio.wav>
# OR for a directory of audios:
node src/index.js <script.ebits> -a <directory_with_wavs>
```

You can also use:

```sh
node src/index.js <script.ebits> --audio-file <audio.wav or directory>
```

If you run with no arguments, you’ll see a usage/help message.

---

## Instruction Set

| Code   | Name         | Data?         | Description                                                                 |
|--------|--------------|---------------|-----------------------------------------------------------------------------|
| 0000   | HALT         | (none)        | Stop execution immediately.                                                 |
| 0001   | DELAY        | time          | Pause execution for a duration. E.g. `0001 2s` or `0001 500ms`              |
| 0010   | FORWARD      | [seconds]     | Seek forward by N seconds (default 5 if omitted).                           |
| 0011   | VOLUME_UP    | (none)        | Increase volume by 0.1 (max 2.0).                                           |
| 0100   | REPEAT       | [count]       | Repeat the next instruction N times.                                        |
| 0101   | SPEED_UP     | (none)        | Increase playback speed by 0.1 (max 2.0).                                   |
| 1010   | SPEED_DOWN   | (none)        | Decrease playback speed by 0.1 (min 0.5).                                   |
| 1011   | JUMP         | timestamp/rel | Jump to a timestamp (`mm:ss` or `hh:mm:ss`) or relative seconds (`+10s`).   |
| 1100   | VOLUME_DOWN  | (none)        | Decrease volume by 0.1 (min 0.0).                                           |
| 1101   | BACKWARD     | [seconds]     | Seek backward by N seconds (default 5 if omitted).                          |
| 1110   | PAUSE        | (none)        | Pause (no-op in current implementation, placeholder for future).             |
| 1111   | PLAY         | (none)        | Play the current buffer (with all manipulations applied so far).            |

**Notes:**

- Data is separated by whitespace after the code.
- For DELAY, you can use `ms`, `s`, `m`, or `h` (e.g., `0001 1s`, `0001 500ms`).
- For JUMP, you can use absolute (`01:23`, `1:02:03`) or relative (`+10s`, `-5s`) times.
- All instructions are validated for correct usage and dependencies.

---

## Example `.ebits` Script

```txt
1111         # PLAY
0001 2s      # DELAY 2 seconds
0011         # VOLUME_UP
1111         # PLAY (with new volume)
0010 10      # FORWARD 10 seconds
1111         # PLAY (from new position)
0100 3       # REPEAT next instruction 3 times
0011         # VOLUME_UP (repeated 3 times)
1111         # PLAY
0000         # HALT
```

---

## Features Table

| Feature                | Supported? |
|------------------------|:----------:|
| Single WAV file        | ✅         |
| Directory of WAV files | ✅         |
| Concatenation          | ✅         |
| Seeking (forward/back) | ✅         |
| Jump to timestamp      | ✅         |
| Volume control         | ✅         |
| Speed control          | ✅         |
| Repeat                 | ✅         |
| Delay                  | ✅         |
| Halt                   | ✅         |
| Real-time manipulation | ✅         |
| Watch mode             | ❌ (not yet)|
| Effects (EQ, fade, etc)| ❌ (not yet)|

---

## License

MIT
