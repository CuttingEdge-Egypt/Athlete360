// Utility function to convert Western numerals to Arabic-Indic numerals
export const toArabicNumbers = (input: string | number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  const inputStr = input.toString();
  let result = inputStr;
  
  for (let i = 0; i < westernNumerals.length; i++) {
    result = result.replace(new RegExp(westernNumerals[i], 'g'), arabicNumerals[i]);
  }
  
  return result;
};

// Helper function to conditionally convert numbers based on language
export const formatNumber = (number: string | number, isArabic: boolean): string => {
  return isArabic ? toArabicNumbers(number) : number.toString();
};