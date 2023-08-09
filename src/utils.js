function hexToBase58(hexString) {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const BASE = ALPHABET.length;
  let num = BigInt(hexString);
  let encoded = "";
  while (num > BigInt(0)) {
    let remainder = num % BigInt(BASE);
    num = num / BigInt(BASE);
    encoded = ALPHABET[remainder] + encoded;
  }
  return encoded;
}

export function JBIpfsDecode(hexString) {
  return hexToBase58("0x1220" + hexString.substring(2));
}

export function formatNumber(num) {
  const bigNum = BigInt(num);
  const units = [
    { value: BigInt(1000000000000), suffix: 'T' },
    { value: BigInt(1000000000), suffix: 'B' },
    { value: BigInt(1000000), suffix: 'M' },
    { value: BigInt(1000), suffix: 'K' }
  ];

  for (const unit of units) {
    if (bigNum >= unit.value) {
      const integerPart = bigNum / unit.value;
      const decimalPart = ((bigNum % unit.value) * BigInt(100)) / unit.value;
      const decimals = decimalPart.toString().padStart(2, '0');
      return integerPart.toLocaleString() + (decimals !== '00' ? '.' + decimals : '') + unit.suffix;
    }
  }

  return bigNum.toLocaleString();
}
