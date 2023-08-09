function hexToBase58(hexString) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE = ALPHABET.length;
  let num = BigInt(hexString);
  let encoded = '';
  while (num > BigInt(0)) {
    let remainder = num % BigInt(BASE);
    num = num / BigInt(BASE);
    encoded = ALPHABET[remainder] + encoded;
  }
  return encoded;
}

export function JBIpfsDecode(hexString) {
  return hexToBase58('0x1220' + hexString.substring(2));
}
