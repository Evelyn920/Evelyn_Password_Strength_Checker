'use strict';

const Passwork = (() => {
  const groups = Object.freeze({
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    number: '0123456789',
    symbol: '!@#$%^&*()-_=+[]{}:,.?~'
  });

  const common = new Set(`password password1 password123 password1234 passw0rd p@ssw0rd
    123456 1234567 12345678 123456789 1234567890 123123 112233 111111 000000 12345
    qwerty qwerty123 qwertyuiop abc123 iloveyou welcome welcome1 admin admin123
    letmein monkey dragon sunshine princess football baseball master login access
    trustno1 computer starwars whatever secret 654321 1q2w3e4r 1qaz2wsx
    changeme default administrator test123 asdfgh zxcvbn qazwsx user123 pass123
    loveyou mypassword 123qwe 1q2w3e4r5t 123456a`.split(/\s+/));
  const substitutions = { '@': 'a', '4': 'a', '0': 'o', '1': 'i', '!': 'i', '3': 'e', '$': 's', '5': 's', '7': 't' };

  function isCommon(folded) {
    const stem = folded.replace(/[\d\p{P}\p{S}\s]+$/gu, '');
    const plain = stem.replace(/[@401!3$57]/g, char => substitutions[char]);
    return [folded, stem, plain].some(value => common.has(value));
  }

  function hasSequence(folded) {
    const lines = ['01234567890', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    return lines.some(line => [line, [...line].reverse().join('')].some(direction => {
      for (let i = 0; i <= direction.length - 5; i += 1) {
        if (folded.includes(direction.slice(i, i + 5))) return true;
      }
      return false;
    }));
  }

  function analyze(password) {
    const normalized = password.normalize('NFC');
    const characters = [...normalized];
    const length = characters.length;
    const rules = {
      length: length >= 15,
      upper: /\p{Lu}/u.test(normalized),
      lower: /\p{Ll}/u.test(normalized),
      number: /\p{Nd}/u.test(normalized),
      symbol: /[\p{P}\p{S}]/u.test(normalized)
    };
    if (!length) return { score: 0, level: 'empty', label: 'Awaiting input', rules, feedback: 'Try a sample password to see what makes it easier or harder to guess.' };

    const folded = normalized.toLowerCase().trim();
    const distinct = new Set(characters.map(char => char.toLowerCase())).size;
    const variety = [rules.upper, rules.lower, rules.number, rules.symbol].filter(Boolean).length;
    const repeated = /(.)\1{3,}|^(.{2,12})\2+$/u.test(folded);
    const commonPassword = isCommon(folded);
    const sequence = hasSequence(folded);
    const onlyWhitespace = !folded;
    const numeric = /^[\p{Nd}\s]+$/u.test(normalized);
    let score = Math.min(100, length * 3.5 + distinct * 1.2 + Math.max(0, variety - 1) * 3);
    if (length < 8) score = Math.min(score, 25);
    if (length < 12) score = Math.min(score, 49);
    if (length < 15) score = Math.min(score, 69);
    if (numeric) score = Math.min(score, 55);
    if (sequence) score = Math.min(score, 39);
    if (repeated || distinct < 5) score = Math.min(score, 29);
    if (commonPassword) score = Math.min(score, 10);
    if (onlyWhitespace) score = 0;
    score = Math.round(score);

    const level = score < 40 ? 'weak' : score < 70 ? 'fair' : 'strong';
    const label = { weak: 'Weak', fair: 'Fair', strong: 'Strong' }[level];
    const advice = [];
    if (onlyWhitespace) advice.push('Choose a password with more than whitespace.');
    if (commonPassword) advice.push('Common password detected. Pick something entirely different.');
    if (sequence) advice.push('Avoid predictable sequences such as keyboard runs.');
    if (!onlyWhitespace && (repeated || distinct < 5)) advice.push('Avoid repeated characters and patterns.');
    if (!rules.length) advice.push('Aim for at least 15 characters.');
    if (numeric && !onlyWhitespace) advice.push('Use a random password or a passphrase instead of a number-only password.');
    if (!advice.length) advice.push(level === 'strong'
      ? 'Looks strong by these checks. Use it for one account only.'
      : 'Try a longer password or a passphrase with randomly chosen words.');
    return { score, level, label, rules, feedback: advice.slice(0, 2).join(' ') };
  }

  function generate(length, selected, random = globalThis.crypto) {
    const sets = [...new Set(selected)].map(group => Object.hasOwn(groups, group) ? groups[group] : null);
    if (!Number.isInteger(length) || length < 16 || length > 64) throw new RangeError('Choose a length between 16 and 64.');
    if (!sets.length || sets.includes(null)) throw new RangeError('Select at least one character group.');
    if (!random?.getRandomValues) throw new Error('Secure random generation is unavailable in this browser.');

    const alphabet = sets.join('');
    const limit = 256 - (256 % alphabet.length);
    const buffer = new Uint8Array(128);
    let cursor = buffer.length;
    let result;
    do {
      result = '';
      while (result.length < length) {
        if (cursor === buffer.length) {
          random.getRandomValues(buffer);
          cursor = 0;
        }
        const byte = buffer[cursor];
        cursor += 1;
        if (byte < limit) result += alphabet[byte % alphabet.length];
      }
    } while (!sets.every(set => [...result].some(char => set.includes(char))));
    return result;
  }

  return Object.freeze({ analyze, generate });
})();
