// @ts-check

/** @param {any[]} data */
const hasAtMostOneItem = (data) => data.length <= 1
/** @param {any[]} data */
const hasNoItem = (data) => data.length === 0

/**
 * @param {never[]} data
 * @returns {boolean}
 */
function HALT_VALIDATOR(data = []) {
    return hasNoItem(data)
}

/**
 * @param {(string | number)[]} data
 * @returns {boolean}
 */
function DELAY_VALIDATOR(data = []) {
    if (data.length !== 1) {
        return false
    }

    /** @type {number} */
    let delay

    // if data is not a number, it is assumed to be a string containing
    // a number and a unit of time (e.g. '1s', '1ms', '10m')
    // so we need to extract the number from the string using a regex
    if (typeof data[0] === 'string') {
        const match = data[0].match(/^(\d+)([^\d\s]+?)$/i)
        if (match === null) {
            return false
        }

        // if the unit is not a valid unit of time, return false
        if (!['ms', 's', 'm', 'h'].includes(match[2].toLocaleLowerCase())) {
            return false
        }

        delay = parseInt(match[1])
    } else {
        delay = data[0]
    }

    return delay > 0
}

/**
 * @param {number[]} data - An array of at most one number which is the number of seconds to skip.
 * @returns {boolean}
 */
function FORWARD_VALIDATOR(data = []) {
    return hasAtMostOneItem(data)
}

/**
 * @param {never[]} data
 * @returns {boolean}
 */
function VOLUME_UP_VALIDATOR(data = []) {
    return hasNoItem(data)
}

/**
 * @param {number[]} data - An array of at most one number which is the number of times to repeat the audio.
 * @returns {boolean}
 */
function REPEAT_VALIDATOR(data = []) {
    return hasAtMostOneItem(data)
}

/**
 * @param {number[]} data - An array of at most one number which is the speed up factor.
 * @returns {boolean}
 */
function SPEED_UP_VALIDATOR(data = []) {
    if (hasNoItem(data)) {
        return true
    }

    // ensure that the speed up factor is an integer and greater than 0
    return data[0] > 0 && Number.isInteger(data[0])
}

/**
 * @param {number[]} data - An array of at most one number which is the speed down factor.
 * @returns {boolean}
 */
function SPEED_DOWN_VALIDATOR(data = []) {
    return SPEED_UP_VALIDATOR(data)
}

/**
 * @description:
 *  The timestamp should be in the format 'hh:mm:ss' ('hh' is optional) or '[+/-]\d+s' (which means to jump forward or backward by the specified number of seconds).
 * @param {string[]} data - An array of one string which is the timestamp to jump to.
 *
 * @returns {boolean}
 */
function JUMP_VALIDATOR(data = []) {
    if (hasNoItem(data)) {
        return false
    }

    const timestamp = data[0]

    // check if the timestamp is in the format 'hh:mm:ss' ('hh' is optional)
    // ensure that minutes and seconds are between 0 and 59
    if (timestamp.match(/^(?:\d{1,2}:)?\d{1,2}:\d{1,2}$/) !== null) {
        const [hours, minutes, seconds] = timestamp.split(':').map(Number)

        if (hours < 0 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
            return false
        }

        return timestamp.match(/^(?:0{1,2}:)?0{1,2}:0{1,2}$/) !== null
    }

    if (timestamp.match(/^(?:[+-]?\d+)(s)?$/) !== null) {
        return true
    }

    return false
}

/**
 * @param {never[]} data
 * @returns {boolean}
 */
function VOLUME_DOWN_VALIDATOR(data = []) {
    return hasNoItem(data)
}

/**
 * @param {number[]} data - An array of at most one number which is the number of seconds to skip.
 * @returns {boolean}
 */
function BACKWARD_VALIDATOR(data = []) {
    return FORWARD_VALIDATOR(data)
}

/**
 * @param {never[]} data
 * @returns {boolean}
 */
function PAUSE_VALIDATOR(data = []) {
    return hasNoItem(data)
}

/**
 * @param {never[]} data
 * @returns {boolean}
 */
function PLAY_VALIDATOR(data = []) {
    return hasNoItem(data)
}

/**
 * @description: The data validator function for a given instruction.
 * @param {string} code - The instruction code.
 * @param {string[]} data - The instruction data.
 * 
 * @returns {boolean}
 */
export default function (code, data) {
    const INSTRUCTION_DATA_VALIDATORS = {
        '0000': HALT_VALIDATOR,
        '0001': DELAY_VALIDATOR,
        '0010': FORWARD_VALIDATOR,
        '0011': VOLUME_UP_VALIDATOR,
        '0100': REPEAT_VALIDATOR,
        '0101': SPEED_UP_VALIDATOR,
        '1010': SPEED_DOWN_VALIDATOR,
        '1011': JUMP_VALIDATOR,
        '1100': VOLUME_DOWN_VALIDATOR,
        '1101': BACKWARD_VALIDATOR,
        '1110': PAUSE_VALIDATOR,
        '1111': PLAY_VALIDATOR,
    }

    return INSTRUCTION_DATA_VALIDATORS[code](data)
}