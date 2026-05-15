const ROMAN_NUMERAL_VALUES:ReadonlyArray<{ value:number, numeral:string }> = [
  { value:500, numeral:'D' },
  { value:400, numeral:'CD' },
  { value:100, numeral:'C' },
  { value:90, numeral:'XC' },
  { value:50, numeral:'L' },
  { value:40, numeral:'XL' },
  { value:10, numeral:'X' },
  { value:9, numeral:'IX' },
  { value:5, numeral:'V' },
  { value:4, numeral:'IV' },
  { value:1, numeral:'I' }
];

export function convertNumberToRomanNumeral(value:number):string {
  if (!Number.isInteger(value) || value < 0 || value > 500) {
    throw new Error(`expected integer from 0 to 500, got ${value}`);
  }
  if (value === 0) return '0';

  let remainingValue = value;
  let romanNumeral = '';

  ROMAN_NUMERAL_VALUES.forEach(entry => {
    while (remainingValue >= entry.value) {
      romanNumeral += entry.numeral;
      remainingValue -= entry.value;
    }
  });

  return romanNumeral;
}
