import chalk from "chalk"

export function showErrMsgAndExit(msg) {
  console.error(chalk.red(`ERROR: ${msg}`))
  process.exit(1)
}

export function showInfoMsg(msg) {
  console.log(chalk.blue(`INFO: ${msg}`))
}

export function showSuccessMsg(msg) {
  console.log(chalk.green(`SUCCESS: ${msg}`))
}

export function showWarningMsg(msg) {
  console.log(chalk.yellow(`WARNING: ${msg}`))
}

export function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj))
}