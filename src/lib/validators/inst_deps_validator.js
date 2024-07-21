// @ts-check
import { INSTRUCTION_DEPENDENCIES } from "../../constants.js";
import { showErrMsgAndExit } from "../../utils.js";


/**
 * Check if at least one of the previous instructions is a dependency.
 * @param {string[]} prevInstructions
 * @param {string[]} dependencies 
 * @returns {boolean}
 */
const hasAtLeastOneDependency = (prevInstructions, dependencies) => {
    return dependencies.some((dependency) => prevInstructions.includes(dependency))
}

/**
 * Check if none of the previous instructions is a dependency.
 * @param {string[]} prevInstructions
 * @param {string[]} dependencies
 * @returns {boolean}
 */
const hasNoDependency = (prevInstructions, dependencies) => {
    return !hasAtLeastOneDependency(prevInstructions, dependencies)
}

// The validators

/**
 * @param {string[]} pInstructions 
 * @param {string[]} deps
 * @returns {boolean} 
 */
function HALT_VALIDATOR(pInstructions, deps) {
    return pInstructions.length === 0 || hasAtLeastOneDependency(pInstructions, deps)
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function DELAY_VALIDATOR(pInstructions, deps) {
    return true
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function FORWARD_VALIDATOR(pInstructions, deps) {
    return hasAtLeastOneDependency(pInstructions, deps)
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function VOLUME_UP_VALIDATOR(pInstructions, deps) {
    return hasAtLeastOneDependency(pInstructions, deps)
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function REPEAT_VALIDATOR(pInstructions, deps) {
    return (
        (pInstructions.length === 0 || hasNoDependency(pInstructions, deps)) && 
        !pInstructions.includes('0100')
    )
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function SPEED_UP_VALIDATOR(pInstructions, deps) {
    return hasAtLeastOneDependency(pInstructions, deps)
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function SPEED_DOWN_VALIDATOR(pInstructions, deps) {
    return SPEED_UP_VALIDATOR(pInstructions, deps)
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function JUMP_VALIDATOR(pInstructions, deps) {
    return pInstructions.length === 0 || hasAtLeastOneDependency(pInstructions, deps)
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function VOLUME_DOWN_VALIDATOR(pInstructions, deps) {
    return VOLUME_UP_VALIDATOR(pInstructions, deps)
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function BACKWARD_VALIDATOR(pInstructions, deps) {
    return FORWARD_VALIDATOR(pInstructions, deps)
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function PAUSE_VALIDATOR(pInstructions, deps) {
    return hasAtLeastOneDependency(pInstructions, deps)
}

/**
 * @param {string[]} pInstructions
 * @param {string[]} deps
 * @returns {boolean}
 */
function PLAY_VALIDATOR(pInstructions, deps) {
    return pInstructions.length === 0 || hasAtLeastOneDependency(pInstructions, deps)
}

const INSTRUCTION_DEPS_VALIDATORS = {
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

/**
* @description: The validate method will check if the current instruction has
* all the dependencies met by the previous instructions.
* @param {string[]} prevInstructions
* @param {{code: string, line: number, data: string[]}} instruction
* 
* @returns {boolean}
*/
export default function (prevInstructions, instruction) {
    if (!Array.isArray(prevInstructions)) {
        showErrMsgAndExit('The previous instructions should be an array')
    }

   if (typeof instruction !== 'object' || Array.isArray(instruction)) {
       showErrMsgAndExit('The current instruction should be an object')
   }

   const dependencies = INSTRUCTION_DEPENDENCIES.get(instruction.code)
   if (dependencies === undefined || dependencies.length === 0) {
       return true
   }

   const validator = INSTRUCTION_DEPS_VALIDATORS[instruction.code]
   if (typeof validator !== 'function') {
       showErrMsgAndExit('The validator function is not defined')
   }

   return validator.call(this, prevInstructions, dependencies)
}