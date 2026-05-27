export interface PasswordGeneratorOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
}

const CHARSETS = {
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lowercase: 'abcdefghijkmnopqrstuvwxyz',
  numbers: '23456789',
  symbols: '!@#$%^&*()-_=+[]{}:;,.?/',
}

function pickRandom(text: string): string {
  const index = crypto.getRandomValues(new Uint32Array(1))[0] % text.length
  return text[index]
}

export function generatePassword(options: PasswordGeneratorOptions): string {
  const pools: string[] = []
  if (options.uppercase) pools.push(CHARSETS.uppercase)
  if (options.lowercase) pools.push(CHARSETS.lowercase)
  if (options.numbers) pools.push(CHARSETS.numbers)
  if (options.symbols) pools.push(CHARSETS.symbols)

  if (pools.length === 0) {
    throw new Error('At least one character set must be enabled.')
  }

  const required = pools.map((pool) => pickRandom(pool))
  const merged = pools.join('')
  const output: string[] = []

  for (let i = 0; i < options.length - required.length; i += 1) {
    output.push(pickRandom(merged))
  }

  output.push(...required)

  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[output[i], output[j]] = [output[j], output[i]]
  }

  return output.join('')
}
