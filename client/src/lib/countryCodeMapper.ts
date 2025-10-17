// Map country names to ISO 3166-1 alpha-2 country codes
export const countryCodeMap: Record<string, string> = {
  // A
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "andorra": "AD",
  "angola": "AO", "antigua and barbuda": "AG", "argentina": "AR", "armenia": "AM",
  "australia": "AU", "austria": "AT", "azerbaijan": "AZ",
  
  // B
  "bahamas": "BS", "bahrain": "BH", "bangladesh": "BD", "barbados": "BB",
  "belarus": "BY", "belgium": "BE", "belize": "BZ", "benin": "BJ",
  "bhutan": "BT", "bolivia": "BO", "bosnia and herzegovina": "BA", "botswana": "BW",
  "brazil": "BR", "brunei": "BN", "bulgaria": "BG", "burkina faso": "BF",
  "burundi": "BI",
  
  // C
  "cabo verde": "CV", "cambodia": "KH", "cameroon": "CM", "canada": "CA",
  "central african republic": "CF", "chad": "TD", "chile": "CL", "china": "CN",
  "colombia": "CO", "comoros": "KM", "congo": "CG", "costa rica": "CR",
  "croatia": "HR", "cuba": "CU", "cyprus": "CY", "czech republic": "CZ", "czechia": "CZ",
  
  // D
  "denmark": "DK", "djibouti": "DJ", "dominica": "DM", "dominican republic": "DO",
  
  // E
  "ecuador": "EC", "egypt": "EG", "el salvador": "SV", "equatorial guinea": "GQ",
  "eritrea": "ER", "estonia": "EE", "eswatini": "SZ", "ethiopia": "ET",
  
  // F
  "fiji": "FJ", "finland": "FI", "france": "FR",
  
  // G
  "gabon": "GA", "gambia": "GM", "georgia": "GE", "germany": "DE",
  "ghana": "GH", "greece": "GR", "grenada": "GD", "guatemala": "GT",
  "guinea": "GN", "guinea-bissau": "GW", "guyana": "GY",
  
  // H
  "haiti": "HT", "honduras": "HN", "hungary": "HU",
  
  // I
  "iceland": "IS", "india": "IN", "indonesia": "ID", "iran": "IR",
  "iraq": "IQ", "ireland": "IE", "israel": "IL", "italy": "IT",
  "ivory coast": "CI",
  
  // J
  "jamaica": "JM", "japan": "JP", "jordan": "JO",
  
  // K
  "kazakhstan": "KZ", "kenya": "KE", "kiribati": "KI", "kosovo": "XK",
  "kuwait": "KW", "kyrgyzstan": "KG",
  
  // L
  "laos": "LA", "latvia": "LV", "lebanon": "LB", "lesotho": "LS",
  "liberia": "LR", "libya": "LY", "liechtenstein": "LI", "lithuania": "LT",
  "luxembourg": "LU",
  
  // M
  "madagascar": "MG", "malawi": "MW", "malaysia": "MY", "maldives": "MV",
  "mali": "ML", "malta": "MT", "marshall islands": "MH", "mauritania": "MR",
  "mauritius": "MU", "mexico": "MX", "micronesia": "FM", "moldova": "MD",
  "monaco": "MC", "mongolia": "MN", "montenegro": "ME", "morocco": "MA",
  "mozambique": "MZ", "myanmar": "MM",
  
  // N
  "namibia": "NA", "nauru": "NR", "nepal": "NP", "netherlands": "NL",
  "new zealand": "NZ", "nicaragua": "NI", "niger": "NE", "nigeria": "NG",
  "north korea": "KP", "north macedonia": "MK", "norway": "NO",
  
  // O
  "oman": "OM",
  
  // P
  "pakistan": "PK", "palau": "PW", "palestine": "PS", "panama": "PA",
  "papua new guinea": "PG", "paraguay": "PY", "peru": "PE", "philippines": "PH",
  "poland": "PL", "portugal": "PT",
  
  // Q
  "qatar": "QA",
  
  // R
  "romania": "RO", "russia": "RU", "rwanda": "RW",
  
  // S
  "saint kitts and nevis": "KN", "saint lucia": "LC", "saint vincent and the grenadines": "VC",
  "samoa": "WS", "san marino": "SM", "sao tome and principe": "ST",
  "saudi arabia": "SA", "senegal": "SN", "serbia": "RS", "seychelles": "SC",
  "sierra leone": "SL", "singapore": "SG", "slovakia": "SK", "slovenia": "SI",
  "solomon islands": "SB", "somalia": "SO", "south africa": "ZA", "south korea": "KR",
  "south sudan": "SS", "spain": "ES", "sri lanka": "LK", "sudan": "SD",
  "suriname": "SR", "sweden": "SE", "switzerland": "CH", "syria": "SY",
  
  // T
  "taiwan": "TW", "tajikistan": "TJ", "tanzania": "TZ", "thailand": "TH",
  "timor-leste": "TL", "togo": "TG", "tonga": "TO", "trinidad and tobago": "TT",
  "tunisia": "TN", "turkey": "TR", "turkmenistan": "TM", "tuvalu": "TV",
  
  // U
  "uganda": "UG", "ukraine": "UA", "united arab emirates": "AE", "uae": "AE",
  "united kingdom": "GB", "uk": "GB", "united states": "US", "usa": "US",
  "uruguay": "UY", "uzbekistan": "UZ",
  
  // V
  "vanuatu": "VU", "vatican city": "VA", "venezuela": "VE", "vietnam": "VN",
  
  // Y
  "yemen": "YE",
  
  // Z
  "zambia": "ZM", "zimbabwe": "ZW"
};

// Map 3-letter ISO codes to 2-letter codes
const iso3ToIso2Map: Record<string, string> = {
  "AFG": "AF", "ALB": "AL", "DZA": "DZ", "AND": "AD", "AGO": "AO", "ATG": "AG",
  "ARG": "AR", "ARM": "AM", "AUS": "AU", "AUT": "AT", "AZE": "AZ", "BHS": "BS",
  "BHR": "BH", "BGD": "BD", "BRB": "BB", "BLR": "BY", "BEL": "BE", "BLZ": "BZ",
  "BEN": "BJ", "BTN": "BT", "BOL": "BO", "BIH": "BA", "BWA": "BW", "BRA": "BR",
  "BRN": "BN", "BGR": "BG", "BFA": "BF", "BDI": "BI", "CPV": "CV", "KHM": "KH",
  "CMR": "CM", "CAN": "CA", "CAF": "CF", "TCD": "TD", "CHL": "CL", "CHN": "CN",
  "COL": "CO", "COM": "KM", "COG": "CG", "CRI": "CR", "HRV": "HR", "CUB": "CU",
  "CYP": "CY", "CZE": "CZ", "DNK": "DK", "DJI": "DJ", "DMA": "DM", "DOM": "DO",
  "ECU": "EC", "EGY": "EG", "SLV": "SV", "GNQ": "GQ", "ERI": "ER", "EST": "EE",
  "SWZ": "SZ", "ETH": "ET", "FJI": "FJ", "FIN": "FI", "FRA": "FR", "GAB": "GA",
  "GMB": "GM", "GEO": "GE", "DEU": "DE", "GHA": "GH", "GRC": "GR", "GRD": "GD",
  "GTM": "GT", "GIN": "GN", "GNB": "GW", "GUY": "GY", "HTI": "HT", "HND": "HN",
  "HUN": "HU", "ISL": "IS", "IND": "IN", "IDN": "ID", "IRN": "IR", "IRQ": "IQ",
  "IRL": "IE", "ISR": "IL", "ITA": "IT", "CIV": "CI", "JAM": "JM", "JPN": "JP",
  "JOR": "JO", "KAZ": "KZ", "KEN": "KE", "KIR": "KI", "XKX": "XK", "KWT": "KW",
  "KGZ": "KG", "LAO": "LA", "LVA": "LV", "LBN": "LB", "LSO": "LS", "LBR": "LR",
  "LBY": "LY", "LIE": "LI", "LTU": "LT", "LUX": "LU", "MDG": "MG", "MWI": "MW",
  "MYS": "MY", "MDV": "MV", "MLI": "ML", "MLT": "MT", "MHL": "MH", "MRT": "MR",
  "MUS": "MU", "MEX": "MX", "FSM": "FM", "MDA": "MD", "MCO": "MC", "MNG": "MN",
  "MNE": "ME", "MAR": "MA", "MOZ": "MZ", "MMR": "MM", "NAM": "NA", "NRU": "NR",
  "NPL": "NP", "NLD": "NL", "NZL": "NZ", "NIC": "NI", "NER": "NE", "NGA": "NG",
  "PRK": "KP", "MKD": "MK", "NOR": "NO", "OMN": "OM", "PAK": "PK", "PLW": "PW",
  "PSE": "PS", "PAN": "PA", "PNG": "PG", "PRY": "PY", "PER": "PE", "PHL": "PH",
  "POL": "PL", "PRT": "PT", "QAT": "QA", "ROU": "RO", "RUS": "RU", "RWA": "RW",
  "KNA": "KN", "LCA": "LC", "VCT": "VC", "WSM": "WS", "SMR": "SM", "STP": "ST",
  "SAU": "SA", "SEN": "SN", "SRB": "RS", "SYC": "SC", "SLE": "SL", "SGP": "SG",
  "SVK": "SK", "SVN": "SI", "SLB": "SB", "SOM": "SO", "ZAF": "ZA", "KOR": "KR",
  "SSD": "SS", "ESP": "ES", "LKA": "LK", "SDN": "SD", "SUR": "SR", "SWE": "SE",
  "CHE": "CH", "SYR": "SY", "TWN": "TW", "TJK": "TJ", "TZA": "TZ", "THA": "TH",
  "TLS": "TL", "TGO": "TG", "TON": "TO", "TTO": "TT", "TUN": "TN", "TUR": "TR",
  "TKM": "TM", "TUV": "TV", "UGA": "UG", "UKR": "UA", "ARE": "AE", "GBR": "GB",
  "USA": "US", "URY": "UY", "UZB": "UZ", "VUT": "VU", "VAT": "VA", "VEN": "VE",
  "VNM": "VN", "YEM": "YE", "ZMB": "ZM", "ZWE": "ZW"
};

/**
 * Get ISO 3166-1 alpha-2 country code from country name or ISO code
 * @param countryName - Full country name, 3-letter ISO code, or 2-letter ISO code (case-insensitive)
 * @returns Two-letter country code or null if not found
 */
export function getCountryCode(countryName: string): string | null {
  if (!countryName) return null;
  
  const normalized = countryName.trim().toUpperCase();
  
  // If it's already a 2-letter code and valid, return it
  if (normalized.length === 2) {
    const isValid = Object.values(countryCodeMap).includes(normalized);
    return isValid ? normalized : null;
  }
  
  // If it's a 3-letter ISO code, convert to 2-letter
  if (normalized.length === 3 && iso3ToIso2Map[normalized]) {
    return iso3ToIso2Map[normalized];
  }
  
  // Otherwise, try to find by full country name
  const normalizedName = countryName.toLowerCase().trim();
  return countryCodeMap[normalizedName] || null;
}
