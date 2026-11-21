'use strict';

const byId = id => document.getElementById(id);
const password = byId('password');
const reveal = byId('reveal');
const generated = byId('generated');
const lengthInput = byId('length');
const groups = [...document.querySelectorAll('input[name="group"]')];
const copy = byId('copy');
const check = byId('analyze');
const status = byId('generator-status');

function setVisibility(visible) {
  password.type = visible ? 'text' : 'password';
  reveal.textContent = visible ? 'Hide' : 'Show';
  reveal.setAttribute('aria-pressed', String(visible));
}

function updateAnalysis() {
  const result = Passwork.analyze(password.value);
  byId('rating').textContent = result.label;
  byId('score').textContent = result.score;
  byId('meter').value = result.score;
  byId('meter').dataset.level = result.level;
  const feedback = byId('feedback');
  const message = result.level === 'empty' ? result.feedback : `${result.label} (${result.score}/100). ${result.feedback}`;
  if (feedback.textContent !== message) feedback.textContent = message;
  for (const rule of document.querySelectorAll('[data-rule]')) {
    const met = result.rules[rule.dataset.rule];
    rule.classList.toggle('met', met);
    rule.setAttribute('aria-label', `${rule.textContent}: ${met ? 'present' : 'absent'}`);
  }
}

function resetOutput() {
  generated.value = '';
  copy.disabled = true;
  check.disabled = true;
  status.textContent = '';
}

password.addEventListener('input', updateAnalysis);
reveal.addEventListener('click', () => setVisibility(password.type === 'password'));
lengthInput.addEventListener('input', () => {
  byId('length-value').value = lengthInput.value;
  resetOutput();
});
groups.forEach(group => group.addEventListener('change', resetOutput));

byId('generate').addEventListener('click', () => {
  resetOutput();
  try {
    generated.value = Passwork.generate(lengthInput.valueAsNumber, groups.filter(group => group.checked).map(group => group.value));
    copy.disabled = false;
    check.disabled = false;
    status.textContent = 'Password generated on this device.';
  } catch (error) {
    status.textContent = error.message;
  }
});

copy.addEventListener('click', async () => {
  const value = generated.value;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    if (generated.value === value) status.textContent = 'Copied to your clipboard.';
  } catch {
    if (generated.value !== value) return;
    generated.select();
    status.textContent = 'Automatic copy is unavailable. Copy the selected text manually.';
  }
});

check.addEventListener('click', () => {
  password.value = generated.value;
  setVisibility(false);
  updateAnalysis();
  password.focus();
});

window.addEventListener('pageshow', event => {
  if (event.persisted) {
    password.value = '';
    setVisibility(false);
    resetOutput();
  }
  byId('length-value').value = lengthInput.value;
  updateAnalysis();
});
