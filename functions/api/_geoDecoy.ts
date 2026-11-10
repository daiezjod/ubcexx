export interface PhantomGeoTarget {
  code: string;
  name: string;
  city: string;
  pop: string;
  asn: string;
}

export const PHANTOM_COUNTRIES: readonly PhantomGeoTarget[] = [
  { code: 'US', name: 'United States', city: 'Ashburn', pop: 'IAD', asn: 'AS13335 Cloudflare Net' },
  { code: 'DE', name: 'Germany', city: 'Frankfurt', pop: 'FRA', asn: 'AS8881 1&1 Telecom' },
  { code: 'CH', name: 'Switzerland', city: 'Zurich', pop: 'ZRH', asn: 'AS13030 SWITCH Switzerland' },
  { code: 'JP', name: 'Japan', city: 'Tokyo', pop: 'NRT', asn: 'AS2514 NTT Communications' },
  { code: 'NL', name: 'Netherlands', city: 'Amsterdam', pop: 'AMS', asn: 'AS1103 SURFnet BV' },
  { code: 'GB', name: 'United Kingdom', city: 'London', pop: 'LHR', asn: 'AS2856 British Telecom' },
  { code: 'CA', name: 'Canada', city: 'Toronto', pop: 'YYZ', asn: 'AS577 Bell Canada' },
  { code: 'SE', name: 'Sweden', city: 'Stockholm', pop: 'ARN', asn: 'AS3301 Telia Company' },
  { code: 'SG', name: 'Singapore', city: 'Singapore', pop: 'SIN', asn: 'AS4657 StarHub Ltd' },
  { code: 'FR', name: 'France', city: 'Paris', pop: 'CDG', asn: 'AS3215 Orange SA' },
  { code: 'AU', name: 'Australia', city: 'Sydney', pop: 'SYD', asn: 'AS1221 Telstra Corp' },
  { code: 'BR', name: 'Brazil', city: 'Sao Paulo', pop: 'GRU', asn: 'AS28573 Claro Telecom' },
  { code: 'NO', name: 'Norway', city: 'Oslo', pop: 'OSL', asn: 'AS2119 Telenor Norge' },
  { code: 'FI', name: 'Finland', city: 'Helsinki', pop: 'HEL', asn: 'AS719 Elisa Oyj' },
  { code: 'DK', name: 'Denmark', city: 'Copenhagen', pop: 'CPH', asn: 'AS3292 TDC Holding' },
  { code: 'IS', name: 'Iceland', city: 'Reykjavik', pop: 'KEF', asn: 'AS44546 Siminn hf' },
  { code: 'IE', name: 'Ireland', city: 'Dublin', pop: 'DUB', asn: 'AS5466 Eircom Ltd' },
  { code: 'AT', name: 'Austria', city: 'Vienna', pop: 'VIE', asn: 'AS8447 A1 Telekom' },
  { code: 'BE', name: 'Belgium', city: 'Brussels', pop: 'BRU', asn: 'AS5432 Proximus' },
  { code: 'ES', name: 'Spain', city: 'Madrid', pop: 'MAD', asn: 'AS3352 Telefonica Espana' },
  { code: 'IT', name: 'Italy', city: 'Milan', pop: 'MXP', asn: 'AS12874 Fastweb SpA' },
  { code: 'PT', name: 'Portugal', city: 'Lisbon', pop: 'LIS', asn: 'AS2860 MEO Comunicacoes' },
  { code: 'NZ', name: 'New Zealand', city: 'Auckland', pop: 'AKL', asn: 'AS4771 Spark NZ' },
  { code: 'KR', name: 'South Korea', city: 'Seoul', pop: 'ICN', asn: 'AS3786 Korea Telecom' },
  { code: 'HK', name: 'Hong Kong', city: 'Hong Kong', pop: 'HKG', asn: 'AS9269 HKBN' },
  { code: 'TW', name: 'Taiwan', city: 'Taipei', pop: 'TPE', asn: 'AS3462 Chunghwa Telecom' },
  { code: 'PL', name: 'Poland', city: 'Warsaw', pop: 'WAW', asn: 'AS5617 Orange Polska' },
  { code: 'CZ', name: 'Czech Republic', city: 'Prague', pop: 'PRG', asn: 'AS28725 O2 Czech' },
  { code: 'RO', name: 'Romania', city: 'Bucharest', pop: 'OTP', asn: 'AS8708 RCS & RDS' },
  { code: 'HU', name: 'Hungary', city: 'Budapest', pop: 'BUD', asn: 'AS5483 Magyar Telekom' },
  { code: 'GR', name: 'Greece', city: 'Athens', pop: 'ATH', asn: 'AS6799 OTE SA' },
  { code: 'BG', name: 'Bulgaria', city: 'Sofia', pop: 'SOF', asn: 'AS8866 Vivacom Bulgaria' },
  { code: 'HR', name: 'Croatia', city: 'Zagreb', pop: 'ZAG', asn: 'AS5391 Hrvatski Telekom' },
  { code: 'SK', name: 'Slovakia', city: 'Bratislava', pop: 'BTS', asn: 'AS6855 Slovak Telekom' },
  { code: 'SI', name: 'Slovenia', city: 'Ljubljana', pop: 'LJU', asn: 'AS24971 Telekom Slovenije' },
  { code: 'EE', name: 'Estonia', city: 'Tallinn', pop: 'TLL', asn: 'AS3249 Telia Eesti' },
  { code: 'LV', name: 'Latvia', city: 'Riga', pop: 'RIX', asn: 'AS12578 Tet SIA' },
  { code: 'LT', name: 'Lithuania', city: 'Vilnius', pop: 'VNO', asn: 'AS8764 Telia Lietuva' },
  { code: 'CY', name: 'Cyprus', city: 'Nicosia', pop: 'LCA', asn: 'AS6866 Cyta' },
  { code: 'MT', name: 'Malta', city: 'Valletta', pop: 'MLA', asn: 'AS29405 GO plc' },
  { code: 'LU', name: 'Luxembourg', city: 'Luxembourg', pop: 'LUX', asn: 'AS6661 POST Luxembourg' },
  { code: 'LI', name: 'Liechtenstein', city: 'Vaduz', pop: 'VAD', asn: 'AS15435 Telecom Liechtenstein' },
  { code: 'MC', name: 'Monaco', city: 'Monaco', pop: 'MCM', asn: 'AS6774 Monaco Telecom' },
  { code: 'SM', name: 'San Marino', city: 'San Marino', pop: 'RMI', asn: 'AS44199 Telecom Italia San Marino' },
  { code: 'AD', name: 'Andorra', city: 'Andorra la Vella', pop: 'ALV', asn: 'AS6752 Andorra Telecom' },
  { code: 'CL', name: 'Chile', city: 'Santiago', pop: 'SCL', asn: 'AS27651 Entel Chile' },
  { code: 'AR', name: 'Argentina', city: 'Buenos Aires', pop: 'EZE', asn: 'AS7303 Telecom Argentina' },
  { code: 'CO', name: 'Colombia', city: 'Bogota', pop: 'BOG', asn: 'AS3816 Colombia Telecom' },
  { code: 'PE', name: 'Peru', city: 'Lima', pop: 'LIM', asn: 'AS6147 Telefonica del Peru' },
  { code: 'MX', name: 'Mexico', city: 'Mexico City', pop: 'MEX', asn: 'AS8151 Uninet SA' },
  { code: 'PA', name: 'Panama', city: 'Panama City', pop: 'PTY', asn: 'AS11562 Cable & Wireless Panama' },
  { code: 'CR', name: 'Costa Rica', city: 'San Jose', pop: 'SJO', asn: 'AS11830 ICE Telecom' },
  { code: 'UY', name: 'Uruguay', city: 'Montevideo', pop: 'MVD', asn: 'AS6057 Antel Uruguay' },
  { code: 'ZA', name: 'South Africa', city: 'Johannesburg', pop: 'JNB', asn: 'AS37468 Vodacom' },
  { code: 'KE', name: 'Kenya', city: 'Nairobi', pop: 'NBO', asn: 'AS37061 Safaricom PLC' },
  { code: 'NG', name: 'Nigeria', city: 'Lagos', pop: 'LOS', asn: 'AS37148 MTN Nigeria' },
  { code: 'EG', name: 'Egypt', city: 'Cairo', pop: 'CAI', asn: 'AS8452 Telecom Egypt' },
  { code: 'MA', name: 'Morocco', city: 'Casablanca', pop: 'CMN', asn: 'AS6713 Maroc Telecom' },
  { code: 'AE', name: 'United Arab Emirates', city: 'Dubai', pop: 'DXB', asn: 'AS5384 Emirates Telecom' },
  { code: 'QA', name: 'Qatar', city: 'Doha', pop: 'DOH', asn: 'AS8781 Ooredoo QPSC' },
  { code: 'SA', name: 'Saudi Arabia', city: 'Riyadh', pop: 'RUH', asn: 'AS25019 Saudi Telecom' },
  { code: 'KW', name: 'Kuwait', city: 'Kuwait City', pop: 'KWI', asn: 'AS42961 Zain Kuwait' },
  { code: 'OM', name: 'Oman', city: 'Muscat', pop: 'MCT', asn: 'AS28885 Omantel' },
  { code: 'BH', name: 'Bahrain', city: 'Manama', pop: 'BAH', asn: 'AS25543 Batelco' },
  { code: 'IL', name: 'Israel', city: 'Tel Aviv', pop: 'TLV', asn: 'AS12849 Bezeq The Israel Telecom' },
  { code: 'IN', name: 'India', city: 'Mumbai', pop: 'BOM', asn: 'AS55836 Reliance Jio' },
  { code: 'TH', name: 'Thailand', city: 'Bangkok', pop: 'BKK', asn: 'AS17552 True Internet' },
  { code: 'MY', name: 'Malaysia', city: 'Kuala Lumpur', pop: 'KUL', asn: 'AS4788 TM Net' },
  { code: 'ID', name: 'Indonesia', city: 'Jakarta', pop: 'CGK', asn: 'AS7713 Telkom Indonesia' },
  { code: 'VN', name: 'Vietnam', city: 'Hanoi', pop: 'HAN', asn: 'AS7552 Viettel Group' },
  { code: 'PH', name: 'Philippines', city: 'Manila', pop: 'MNL', asn: 'AS9299 PLDT Corp' },
  { code: 'TR', name: 'Turkey', city: 'Istanbul', pop: 'IST', asn: 'AS9121 Turk Telekom' },
  { code: 'GE', name: 'Georgia', city: 'Tbilisi', pop: 'TBS', asn: 'AS35805 Silknet JSC' },
  { code: 'AM', name: 'Armenia', city: 'Yerevan', pop: 'EVN', asn: 'AS49800 Team Telecom' },
  { code: 'KZ', name: 'Kazakhstan', city: 'Almaty', pop: 'ALA', asn: 'AS9198 Kazakhtelecom' },
  { code: 'UZ', name: 'Uzbekistan', city: 'Tashkent', pop: 'TAS', asn: 'AS28910 Uzbektelecom' },
  { code: 'AZ', name: 'Azerbaijan', city: 'Baku', pop: 'GYD', asn: 'AS29049 Aztelekom' },
  { code: 'RS', name: 'Serbia', city: 'Belgrade', pop: 'BEG', asn: 'AS8400 Telekom Srbija' },
  { code: 'BA', name: 'Bosnia and Herzegovina', city: 'Sarajevo', pop: 'SJJ', asn: 'AS9146 BH Telecom' },
  { code: 'ME', name: 'Montenegro', city: 'Podgorica', pop: 'TGD', asn: 'AS8585 Crnogorski Telekom' },
  { code: 'MK', name: 'North Macedonia', city: 'Skopje', pop: 'SKP', asn: 'AS6823 Makedonski Telekom' },
  { code: 'AL', name: 'Albania', city: 'Tirana', pop: 'TIA', asn: 'AS8638 Albtelecom' },
  { code: 'MD', name: 'Moldova', city: 'Chisinau', pop: 'KIV', asn: 'AS25453 Moldtelecom' },
  { code: 'UA', name: 'Ukraine', city: 'Kyiv', pop: 'KBP', asn: 'AS6849 Ukrtelecom' },
  { code: 'EC', name: 'Ecuador', city: 'Quito', pop: 'UIO', asn: 'AS28006 CNT EP' },
  { code: 'DO', name: 'Dominican Republic', city: 'Santo Domingo', pop: 'SDQ', asn: 'AS6412 Claro Dominicana' },
  { code: 'JM', name: 'Jamaica', city: 'Kingston', pop: 'KIN', asn: 'AS23520 Flow Jamaica' },
  { code: 'TT', name: 'Trinidad and Tobago', city: 'Port of Spain', pop: 'POS', asn: 'AS27796 TSTT' },
  { code: 'BS', name: 'Bahamas', city: 'Nassau', pop: 'NAS', asn: 'AS3597 BTC Bahamas' },
  { code: 'BB', name: 'Barbados', city: 'Bridgetown', pop: 'BGI', asn: 'AS11142 Flow Barbados' },
  { code: 'MU', name: 'Mauritius', city: 'Port Louis', pop: 'MRU', asn: 'AS23889 Mauritius Telecom' },
  { code: 'SC', name: 'Seychelles', city: 'Victoria', pop: 'SEZ', asn: 'AS36908 Cable & Wireless Seychelles' },
  { code: 'MV', name: 'Maldives', city: 'Male', pop: 'MLE', asn: 'AS7642 Dhiraagu' },
  { code: 'LK', name: 'Sri Lanka', city: 'Colombo', pop: 'CMB', asn: 'AS9329 Sri Lanka Telecom' },
  { code: 'NP', name: 'Nepal', city: 'Kathmandu', pop: 'KTM', asn: 'AS4007 Nepal Telecom' },
  { code: 'BD', name: 'Bangladesh', city: 'Dhaka', pop: 'DAC', asn: 'AS24432 Grameenphone' },
  { code: 'PK', name: 'Pakistan', city: 'Karachi', pop: 'KHI', asn: 'AS4565 PTCL' },
  { code: 'KH', name: 'Cambodia', city: 'Phnom Penh', pop: 'PNH', asn: 'AS38235 Smart Axiata' },
  { code: 'LA', name: 'Laos', city: 'Vientiane', pop: 'VTE', asn: 'AS9873 Lao Telecom' },
  { code: 'BN', name: 'Brunei', city: 'Bandar Seri Begawan', pop: 'BWN', asn: 'AS10094 UNN Brunei' },
  { code: 'MN', name: 'Mongolia', city: 'Ulaanbaatar', pop: 'UBN', asn: 'AS9484 Telecom Mongolia' },
  { code: 'GH', name: 'Ghana', city: 'Accra', pop: 'ACC', asn: 'AS30997 MTN Ghana' },
  { code: 'SN', name: 'Senegal', city: 'Dakar', pop: 'DKR', asn: 'AS8346 Sonatel' },
  { code: 'CI', name: 'Ivory Coast', city: 'Abidjan', pop: 'ABJ', asn: 'AS36924 Orange CI' },
  { code: 'TZ', name: 'Tanzania', city: 'Dar es Salaam', pop: 'DAR', asn: 'AS36937 Vodacom Tanzania' },
  { code: 'UG', name: 'Uganda', city: 'Kampala', pop: 'EBB', asn: 'AS21491 MTN Uganda' },
  { code: 'RW', name: 'Rwanda', city: 'Kigali', pop: 'KGL', asn: 'AS37075 MTN Rwanda' },
  { code: 'ET', name: 'Ethiopia', city: 'Addis Ababa', pop: 'ADD', asn: 'AS24757 Ethio Telecom' },
  { code: 'TN', name: 'Tunisia', city: 'Tunis', pop: 'TUN', asn: 'AS37705 Tunisie Telecom' },
  { code: 'DZ', name: 'Algeria', city: 'Algiers', pop: 'ALG', asn: 'AS36947 Algerie Telecom' }
];

export function getRandomPhantomGeo(): PhantomGeoTarget {
  const index = Math.floor(Math.random() * PHANTOM_COUNTRIES.length);
  return PHANTOM_COUNTRIES[index];
}

export function generatePhantomRay(pop: string): string {
  const hex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex}-${pop}`;
}

export function applyGeoDecoyHeaders(headers: Headers): PhantomGeoTarget {
  const phantom = getRandomPhantomGeo();
  const phantomRay = generatePhantomRay(phantom.pop);
  const nodeId = `phantom-relay-${phantom.code}-${Math.floor(Math.random() * 900000 + 100000).toString(16)}`;

  headers.set('Server', 'Cloudflare-Phantom-Edge/2.4');
  headers.set('CF-IPCountry', phantom.code);
  headers.set('CF-Ray', phantomRay);
  headers.set('X-Phantom-Geo-Country', phantom.name);
  headers.set('X-Phantom-Geo-ISO', phantom.code);
  headers.set('X-Phantom-Geo-City', phantom.city);
  headers.set('X-Phantom-Edge-POP', phantom.pop);
  headers.set('X-Phantom-ASN', phantom.asn);
  headers.set('X-Edge-Routing-Node', nodeId);
  headers.set('X-Decoy-Route', `relay://edge.${phantom.code.toLowerCase()}.ubcexx-cdn.net:443`);
  headers.set('X-Anti-Trace-Shield', 'active-anonymized-v4');

  headers.delete('x-powered-by');
  headers.delete('x-real-ip');
  headers.delete('x-forwarded-for');
  headers.delete('cf-connecting-ip');

  return phantom;
}
