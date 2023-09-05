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

export function formatLargeBigInt(n) {
  const formatWithSuffix = (divisor, suffix) => {
    const integerPart = n / divisor;
    const decimalPart = ((n % divisor) * BigInt("1000")) / divisor;
    let result = integerPart.toLocaleString();
    if (decimalPart > BigInt("0")) {
      result += "." + decimalPart.toString().padStart(3, "0");
    }
    return result + suffix;
  };

  if (n >= BigInt(1e12)) return formatWithSuffix(BigInt(1e12), "T");
  if (n >= BigInt(1e9)) return formatWithSuffix(BigInt(1e9), "B");
  if (n >= BigInt(1e6)) return formatWithSuffix(BigInt(1e6), "M");
  if (n >= BigInt(1e3)) return formatWithSuffix(BigInt(1e3), "K");

  return n.toLocaleString();
}

export const html = String.raw