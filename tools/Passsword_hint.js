const _0x1a2b = {
  "am9obl9kb2U=": "WW91ciBmYXZvcml0ZSBjaGlsZGhvb2QgY2FydG9vbi4=",
  "amFuZV9zbWl0aA==": "VGhlIG5hbWUgb2YgeW91ciBmaXJzdCBwZXQu",
  "YWxpY2Vfd29uZGVy": "Q2l0eSB3aGVyZSB5b3Ugd2VyZSBib3JuLg==",
  "Ym9iX2J1aWxkZXI=": "WW91ciBmYXZvcml0ZSB0b29sLg=="
};

function _0x4f3d(x) {
  let decodedKey = atob(x);
  if (_0x1a2b[x]) {
    return "Hint: " + atob(_0x1a2b[x]);
  } else {
    return "No password hint found for this username.";
  }
}

console.log(_0x4f3d("am9obl9kb2U="));
console.log(_0x4f3d("dW5rbm93bl91c2Vy"));
