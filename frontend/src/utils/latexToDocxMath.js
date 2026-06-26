import {
  Math,
  MathCurlyBrackets,
  MathFraction,
  MathIntegral,
  MathRadical,
  MathRoundBrackets,
  MathRun,
  MathSquareBrackets,
  MathSubScript,
  MathSubSuperScript,
  MathSum,
  MathSuperScript
} from 'docx'

const GREEK_MAP = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω'
}

const SYMBOL_MAP = {
  cdot: '·',
  times: '×',
  div: '÷',
  pm: '±',
  mp: '∓',
  neq: '≠',
  ne: '≠',
  leq: '≤',
  geq: '≥',
  approx: '≈',
  sim: '∼',
  to: '→',
 rightarrow: '→',
  leftarrow: '←',
  leftrightarrow: '↔',
  infty: '∞',
  degree: '°',
  angle: '∠',
  perp: '⊥',
  parallel: '∥',
  percent: '%',
  prime: '′',
  ',': ',',
  ':': ':',
  ';': ';'
}

const STYLE_COMMANDS = new Set(['text', 'mathrm', 'textrm', 'mathbf', 'mathit', 'textbf', 'textit'])

class LatexMathParser {
  constructor(input) {
    this.input = input
    this.pos = 0
  }

  parse() {
    const children = this.parseExpression()
    return new Math({ children: children.length ? children : [new MathRun('')] })
  }

  parseExpression(stopChars = []) {
    const components = []

    while (!this.isAtEnd()) {
      const current = this.peek()
      if (stopChars.includes(current)) break

      if (/\s/.test(current)) {
        this.consumeWhitespace()
        components.push(new MathRun(' '))
        continue
      }

      const atom = this.parseAtom()
      if (!atom.length) continue

      const scripted = this.applyScripts(atom)
      components.push(...scripted)
    }

    return components
  }

  parseAtom() {
    if (this.isAtEnd()) return []

    const current = this.peek()

    if (current === '{') {
      return this.parseGroup('{', '}')
    }

    if (current === '(') {
      this.pos++
      return [new MathRoundBrackets({ children: this.parseUntilMatching('(', ')') })]
    }

    if (current === '[') {
      this.pos++
      return [new MathSquareBrackets({ children: this.parseUntilMatching('[', ']') })]
    }

    if (current === '\\') {
      return this.parseCommand()
    }

    this.pos++
    return [new MathRun(current)]
  }

  parseCommand() {
    this.pos++
    if (this.isAtEnd()) return [new MathRun('\\')]

    const next = this.peek()
    if (!/[A-Za-z]/.test(next)) {
      this.pos++
      return [new MathRun(this.decodeEscapedChar(next))]
    }

    const name = this.readWhile(/[A-Za-z]/)

    if (name === 'frac') {
      const numerator = this.parseRequiredArgument()
      const denominator = this.parseRequiredArgument()
      return [new MathFraction({ numerator, denominator })]
    }

    if (name === 'sqrt') {
      const degree = this.peek() === '[' ? this.parseOptionalBracketArgument() : undefined
      const children = this.parseRequiredArgument()
      return [new MathRadical({ children, degree })]
    }

    if (name === 'sum') {
      const { subScript, superScript } = this.parseScriptPair()
      const children = this.parseOperatorBody()
      return [new MathSum({ children, subScript, superScript })]
    }

    if (name === 'int') {
      const { subScript, superScript } = this.parseScriptPair()
      const children = this.parseOperatorBody()
      return [new MathIntegral({ children, subScript, superScript })]
    }

    if (STYLE_COMMANDS.has(name)) {
      return this.parseRequiredArgument()
    }

    if (name === 'left' || name === 'right') {
      return []
    }

    if (GREEK_MAP[name]) {
      return [new MathRun(GREEK_MAP[name])]
    }

    if (SYMBOL_MAP[name]) {
      return [new MathRun(SYMBOL_MAP[name])]
    }

    return [new MathRun(name)]
  }

  applyScripts(baseChildren) {
    let subScript
    let superScript

    while (!this.isAtEnd()) {
      const current = this.peek()
      if (current !== '_' && current !== '^') break

      this.pos++
      const value = this.parseScriptArgument()
      if (current === '_') subScript = value
      else superScript = value
    }

    if (subScript && superScript) {
      return [new MathSubSuperScript({ children: baseChildren, subScript, superScript })]
    }

    if (subScript) {
      return [new MathSubScript({ children: baseChildren, subScript })]
    }

    if (superScript) {
      return [new MathSuperScript({ children: baseChildren, superScript })]
    }

    return baseChildren
  }

  parseScriptPair() {
    let subScript
    let superScript

    while (!this.isAtEnd()) {
      if (/\s/.test(this.peek())) {
        this.consumeWhitespace()
        continue
      }

      const current = this.peek()
      if (current !== '_' && current !== '^') break

      this.pos++
      const value = this.parseScriptArgument()
      if (current === '_') subScript = value
      else superScript = value
    }

    return { subScript, superScript }
  }

  parseScriptArgument() {
    while (!this.isAtEnd() && /\s/.test(this.peek())) {
      this.consumeWhitespace()
    }

    if (this.peek() === '{') {
      return this.parseGroup('{', '}')
    }

    return this.parseAtom()
  }

  parseOperatorBody() {
    while (!this.isAtEnd() && /\s/.test(this.peek())) {
      this.consumeWhitespace()
    }

    if (this.isAtEnd()) return [new MathRun('')]

    return this.parseAtom()
  }

  parseRequiredArgument() {
    while (!this.isAtEnd() && /\s/.test(this.peek())) {
      this.consumeWhitespace()
    }

    if (this.peek() === '{') {
      return this.parseGroup('{', '}')
    }

    return this.parseAtom()
  }

  parseOptionalBracketArgument() {
    if (this.peek() !== '[') return undefined
    this.pos++
    return this.parseUntilMatching('[', ']')
  }

  parseGroup(openChar, closeChar) {
    if (this.peek() !== openChar) return []
    this.pos++
    return this.parseUntilMatching(openChar, closeChar)
  }

  parseUntilMatching(openChar, closeChar) {
    const components = []

    while (!this.isAtEnd()) {
      const current = this.peek()
      if (current === closeChar) {
        this.pos++
        break
      }

      if (current === openChar && openChar !== closeChar) {
        const grouped = this.parseGroup(openChar, closeChar)
        const scripted = this.applyScripts(grouped)
        components.push(...scripted)
        continue
      }

      if (/\s/.test(current)) {
        this.consumeWhitespace()
        components.push(new MathRun(' '))
        continue
      }

      const atom = this.parseAtom()
      const scripted = this.applyScripts(atom)
      components.push(...scripted)
    }

    return components
  }

  decodeEscapedChar(char) {
    const map = {
      '{': '{',
      '}': '}',
      '[': '[',
      ']': ']',
      '(': '(',
      ')': ')',
      '$': '$',
      '%': '%',
      '_': '_',
      '^': '^',
      '\\': '\\'
    }

    return map[char] || char
  }

  consumeWhitespace() {
    while (!this.isAtEnd() && /\s/.test(this.peek())) {
      this.pos++
    }
  }

  readWhile(pattern) {
    const start = this.pos
    while (!this.isAtEnd() && pattern.test(this.peek())) {
      this.pos++
    }
    return this.input.slice(start, this.pos)
  }

  peek(offset = 0) {
    return this.input[this.pos + offset]
  }

  isAtEnd() {
    return this.pos >= this.input.length
  }
}

function isEscaped(text, index) {
  let backslashes = 0
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
    backslashes++
  }
  return backslashes % 2 === 1
}

function findDelimiter(text, delimiter, startIndex) {
  let index = text.indexOf(delimiter, startIndex)
  while (index !== -1) {
    if (!isEscaped(text, index)) return index
    index = text.indexOf(delimiter, index + delimiter.length)
  }
  return -1
}

function findNextOpening(text, startIndex) {
  const delimiters = ['$$', '\\[', '\\(', '$']
  let best = null

  for (const delimiter of delimiters) {
    const index = findDelimiter(text, delimiter, startIndex)
    if (index === -1) continue
    if (!best || index < best.index || (index === best.index && delimiter.length > best.delimiter.length)) {
      best = { index, delimiter }
    }
  }

  return best
}

export function parseMixedLatexToDocxChildren(text, createTextRun) {
  if (!text) return []

  const children = []
  let cursor = 0

  while (cursor < text.length) {
    const match = findNextOpening(text, cursor)
    if (!match) {
      const plain = text.slice(cursor)
      if (plain) children.push(createTextRun(plain))
      break
    }

    if (match.index > cursor) {
      children.push(createTextRun(text.slice(cursor, match.index)))
    }

    const closing = findDelimiter(text, match.delimiter, match.index + match.delimiter.length)
    if (closing === -1) {
      children.push(createTextRun(text.slice(match.index)))
      break
    }

    const latex = text.slice(match.index + match.delimiter.length, closing).trim()
    if (latex) {
      children.push(new LatexMathParser(latex).parse())
    }

    cursor = closing + match.delimiter.length
  }

  return children
}

