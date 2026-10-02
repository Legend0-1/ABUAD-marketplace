/**
 * Countries & tertiary institutions catalog.
 *
 * This is the single source of truth for the Country + Institution dropdowns at
 * registration. The platform is going global, so the data is keyed by country
 * (ISO 3166-1 alpha-2). Each country also maps to a display/payment currency
 * (must match a code in `src/lib/currency.ts` CURRENCIES).
 *
 * WHICH countries actually appear at registration is controlled at runtime by
 * the admin via the ENABLED_COUNTRIES setting (see `src/lib/settings.ts`), not
 * here. This file only holds the full catalog; `getEnabledCountries(codes)`
 * intersects it with whatever the admin has switched on. For now only Nigeria
 * ("NG") has an institution list and is enabled by default; other countries are
 * listed so the admin can switch them on once their catalog is added.
 *
 * MAINTENANCE / ACCURACY NOTE: the Nigerian list below was compiled from
 * best-available knowledge (categorised by NUC/NBTE/NCCE type) and is intended
 * to be easy to edit — it is just data. It is NOT guaranteed exhaustive or
 * perfectly current (institutions are created, renamed, upgraded, or suspended
 * regularly). A student whose institution is not listed can always pick
 * "Other (not listed)" and type it in, so the list never blocks a sign-up.
 * To correct or extend it, edit this one file.
 */

export type InstitutionCategory =
  // Nigeria
  | 'Federal University'
  | 'State University'
  | 'Private University'
  | 'Federal Polytechnic'
  | 'State Polytechnic'
  | 'Private Polytechnic'
  | 'Federal College of Education'
  | 'State College of Education'
  | 'Private College of Education'
  // Shared / other countries (Ghana, Kenya, South Africa, UK, Canada, US).
  // Different education systems use different institution types, so the taxonomy
  // is per-country — each country's groups below use the labels that fit it.
  | 'Public University'
  | 'Technical University'
  | 'College of Education'
  | 'National Polytechnic'
  | 'University of Technology'
  | 'Private Higher Institution'
  | 'TVET College'
  | 'University'
  | 'University College / Specialist Institution'
  | 'College / Polytechnic'
  | 'University (Public)'
  | 'University (Private)'
  | 'Liberal Arts College'
  | 'Community / Technical College'

/** A set of institutions sharing one category, for grouped rendering. */
export type InstitutionGroup = { category: InstitutionCategory; institutions: string[] }

export type CountryInfo = {
  /** ISO 3166-1 alpha-2 code, e.g. 'NG'. Used as the stored value + map key. */
  code: string
  name: string
  /** Currency code — MUST exist in CURRENCIES (src/lib/currency.ts). */
  currency: string
  /** Emoji flag, display only. */
  flag: string
}

/** Order in which institution categories are shown in the dropdown. */
export const CATEGORY_ORDER: InstitutionCategory[] = [
  'Federal University',
  'State University',
  'Private University',
  'Federal Polytechnic',
  'State Polytechnic',
  'Private Polytechnic',
  'Federal College of Education',
  'State College of Education',
  'Private College of Education',
]

/**
 * Master country catalog. Every entry maps to a supported currency so that a
 * user registering from that country can be defaulted to their local currency.
 * Only countries that ALSO have an entry in INSTITUTIONS_BY_COUNTRY can be
 * usefully enabled for registration.
 */
export const COUNTRIES: CountryInfo[] = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', flag: '🇿🇦' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  { code: 'US', name: 'United States', currency: 'USD', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', currency: 'CAD', flag: '🇨🇦' },
]

/** Sentinel option that reveals a free-text field for anything not listed. */
export const OTHER_INSTITUTION = 'Other (not listed)'

/**
 * Sentinel category for the "Institution Category" picker. Choosing it skips the
 * institution dropdown and lets the student type any institution name directly,
 * for schools whose type isn't one of the listed categories.
 */
export const OTHER_CATEGORY = 'Other / Not listed'

// --- Nigeria -----------------------------------------------------------------

const NG_FEDERAL_UNIVERSITIES: string[] = [
  'Abubakar Tafawa Balewa University, Bauchi',
  'Adeyemi Federal University of Education, Ondo',
  'Ahmadu Bello University, Zaria',
  'Alex Ekwueme Federal University, Ndufu-Alike',
  'Alvan Ikoku Federal University of Education, Owerri',
  'Bayero University, Kano',
  'Federal University of Agriculture, Abeokuta',
  'Federal University of Health Sciences, Azare',
  'Federal University of Health Sciences, Otukpo',
  'Federal University of Petroleum Resources, Effurun',
  'Federal University of Technology, Akure',
  'Federal University of Technology, Minna',
  'Federal University of Technology, Owerri',
  'Federal University, Birnin Kebbi',
  'Federal University, Dutse',
  'Federal University, Dutsin-Ma',
  'Federal University, Gashua',
  'Federal University, Gusau',
  'Federal University, Kashere',
  'Federal University, Lafia',
  'Federal University, Lokoja',
  'Federal University, Otuoke',
  'Federal University, Oye-Ekiti',
  'Federal University, Wukari',
  'Joseph Sarwuan Tarka University, Makurdi',
  'Michael Okpara University of Agriculture, Umudike',
  'Modibbo Adama University, Yola',
  'National Open University of Nigeria',
  'Nigeria Police Academy, Wudil',
  'Nigerian Defence Academy, Kaduna',
  'Nigerian Maritime University, Okerenkoko',
  'Nnamdi Azikiwe University, Awka',
  'Obafemi Awolowo University, Ile-Ife',
  'University of Abuja',
  'University of Benin',
  'University of Calabar',
  'University of Ibadan',
  'University of Ilorin',
  'University of Jos',
  'University of Lagos',
  'University of Maiduguri',
  'University of Nigeria, Nsukka',
  'University of Port Harcourt',
  'University of Uyo',
  'Usmanu Danfodiyo University, Sokoto',
]

const NG_STATE_UNIVERSITIES: string[] = [
  'Abia State University, Uturu',
  'Adamawa State University, Mubi',
  'Adekunle Ajasin University, Akungba-Akoko',
  'Akwa Ibom State University, Ikot Akpaden',
  'Ambrose Alli University, Ekpoma',
  'Bamidele Olumilua University of Education, Science and Technology, Ikere-Ekiti',
  'Bauchi State University, Gadau',
  'Bayelsa Medical University, Yenagoa',
  'Benue State University, Makurdi',
  'Chukwuemeka Odumegwu Ojukwu University, Uli',
  'Delta State University, Abraka',
  'Ebonyi State University, Abakaliki',
  'Edo State University, Uzairue',
  'Ekiti State University, Ado-Ekiti',
  'Emmanuel Alayande University of Education, Oyo',
  'Enugu State University of Science and Technology, Enugu',
  'Gombe State University, Gombe',
  'Ibrahim Badamasi Babangida University, Lapai',
  'Ignatius Ajuru University of Education, Port Harcourt',
  'Imo State University, Owerri',
  'Kaduna State University, Kaduna',
  'Kano University of Science and Technology, Wudil',
  'Kebbi State University of Science and Technology, Aliero',
  'Kwara State University, Malete',
  'Ladoke Akintola University of Technology, Ogbomoso',
  'Lagos State University of Education, Ijanikin',
  'Lagos State University of Science and Technology, Ikorodu',
  'Lagos State University, Ojo',
  'Nasarawa State University, Keffi',
  'Niger Delta University, Amassoma',
  'Olabisi Onabanjo University, Ago-Iwoye',
  'Ondo State University of Science and Technology, Okitipupa',
  'Osun State University, Osogbo',
  'Plateau State University, Bokkos',
  'Prince Abubakar Audu University, Anyigba',
  'Rivers State University, Port Harcourt',
  'Sa\'adatu Rimi University of Education, Kano',
  'Sokoto State University, Sokoto',
  'Tai Solarin University of Education, Ijebu-Ode',
  'Taraba State University, Jalingo',
  'Umaru Musa Yar\'adua University, Katsina',
  'University of Cross River State, Calabar',
  'Yobe State University, Damaturu',
]

const NG_PRIVATE_UNIVERSITIES: string[] = [
  'Achievers University, Owo',
  'Admiralty University of Nigeria, Ibusa',
  'Adeleke University, Ede',
  'Afe Babalola University, Ado-Ekiti',
  'Ajayi Crowther University, Oyo',
  'Al-Hikmah University, Ilorin',
  'American University of Nigeria, Yola',
  'Arthur Jarvis University, Akpabuyo',
  'Atiba University, Oyo',
  'Augustine University, Ilara-Epe',
  'Babcock University, Ilishan-Remo',
  'Baze University, Abuja',
  'Bells University of Technology, Ota',
  'Bingham University, Karu',
  'Bowen University, Iwo',
  'Caleb University, Lagos',
  'Caritas University, Enugu',
  'Chrisland University, Abeokuta',
  'Christopher University, Mowe',
  'Clifford University, Owerrinta',
  'Coal City University, Enugu',
  'Covenant University, Ota',
  'Crawford University, Igbesa',
  'Crescent University, Abeokuta',
  'Dominican University, Ibadan',
  'Edwin Clark University, Kiagbodo',
  'Eko University of Medicine and Health Sciences, Ijanikin',
  'Elizade University, Ilara-Mokin',
  'Evangel University, Akaeze',
  'Fountain University, Osogbo',
  'Godfrey Okoye University, Enugu',
  'Gregory University, Uturu',
  'Hallmark University, Ijebu-Itele',
  'Hezekiah University, Umudi',
  'Igbinedion University, Okada',
  'Joseph Ayo Babalola University, Ikeji-Arakeji',
  'Kings University, Ode-Omu',
  'Kola Daisi University, Ibadan',
  'Landmark University, Omu-Aran',
  'Lead City University, Ibadan',
  'Madonna University, Okija',
  'McPherson University, Seriki Sotayo',
  'Mountain Top University, Prayer City',
  'Nile University of Nigeria, Abuja',
  'Novena University, Ogume',
  'Obong University, Obong Ntak',
  'Oduduwa University, Ipetumodu',
  'PAMO University of Medical Sciences, Port Harcourt',
  'Pan-Atlantic University, Lagos',
  'Precious Cornerstone University, Ibadan',
  'Redeemer\'s University, Ede',
  'Renaissance University, Enugu',
  'Rhema University, Aba',
  'Salem University, Lokoja',
  'Skyline University Nigeria, Kano',
  'Southwestern University, Okun-Owa',
  'Spiritan University, Nneochi',
  'Summit University, Offa',
  'Tansian University, Umunya',
  'Trinity University, Ofada',
  'Veritas University, Abuja',
  'Wellspring University, Benin City',
  'Wesley University, Ondo',
  'Western Delta University, Oghara',
]

const NG_FEDERAL_POLYTECHNICS: string[] = [
  'Akanu Ibiam Federal Polytechnic, Unwana',
  'Federal Polytechnic, Ado-Ekiti',
  'Federal Polytechnic, Auchi',
  'Federal Polytechnic, Ayede',
  'Federal Polytechnic, Bali',
  'Federal Polytechnic, Bauchi',
  'Federal Polytechnic, Bida',
  'Federal Polytechnic, Damaturu',
  'Federal Polytechnic, Daura',
  'Federal Polytechnic, Ede',
  'Federal Polytechnic, Ekowe',
  'Federal Polytechnic, Idah',
  'Federal Polytechnic, Ilaro',
  'Federal Polytechnic, Ile-Oluji',
  'Federal Polytechnic, Kabo',
  'Federal Polytechnic, Kaltungo',
  'Federal Polytechnic, Kaura Namoda',
  'Federal Polytechnic, Monguno',
  'Federal Polytechnic, Mubi',
  'Federal Polytechnic, Nasarawa',
  'Federal Polytechnic, Nekede',
  'Federal Polytechnic, Nyak (Shendam)',
  'Federal Polytechnic, Offa',
  'Federal Polytechnic, Ohodo',
  'Federal Polytechnic, Oko',
  'Federal Polytechnic, Orogun',
  'Federal Polytechnic, Ugep',
  'Federal Polytechnic, Ukana',
  'Federal Polytechnic, Wannune',
  'Hussaini Adamu Federal Polytechnic, Kazaure',
  'Waziri Umaru Federal Polytechnic, Birnin Kebbi',
  'Yaba College of Technology, Lagos',
]

const NG_STATE_POLYTECHNICS: string[] = [
  'Abdu Gusau Polytechnic, Talata Mafara',
  'Abia State Polytechnic, Aba',
  'Abraham Adesanya Polytechnic, Ijebu-Igbo',
  'Abubakar Tatari Ali Polytechnic, Bauchi',
  'Adamawa State Polytechnic, Yola',
  'Akwa Ibom State Polytechnic, Ikot Osurua',
  'Anambra State Polytechnic, Mgbakwu',
  'Bayelsa State Polytechnic, Aleibiri',
  'Benue State Polytechnic, Ugbokolo',
  'Binyaminu Usman Polytechnic, Hadejia',
  'Captain Elechi Amadi Polytechnic, Port Harcourt',
  'D.S. Adegbenro ICT Polytechnic, Itori',
  'Delta State Polytechnic, Ogwashi-Uku',
  'Delta State Polytechnic, Otefe-Oghara',
  'Delta State Polytechnic, Ozoro',
  'Edo State Polytechnic, Usen',
  'Gateway ICT Polytechnic, Saapade',
  'Gombe State Polytechnic, Bajoga',
  'Hassan Usman Katsina Polytechnic, Katsina',
  'Imo State Polytechnic, Umuagwo',
  'Institute of Management and Technology, Enugu',
  'Jigawa State Polytechnic, Dutse',
  'Kaduna Polytechnic, Kaduna',
  'Kano State Polytechnic, Kano',
  'Kebbi State Polytechnic, Dakingari',
  'Kenule Beeson Saro-Wiwa Polytechnic, Bori',
  'Kogi State Polytechnic, Lokoja',
  'Kwara State Polytechnic, Ilorin',
  'Mai Idris Alooma Polytechnic, Geidam',
  'Moshood Abiola Polytechnic, Abeokuta',
  'Nasarawa State Polytechnic, Lafia',
  'Niger State Polytechnic, Zungeru',
  'Nuhu Bamalli Polytechnic, Zaria',
  'Osun State College of Technology, Esa-Oke',
  'Osun State Polytechnic, Iree',
  'Plateau State Polytechnic, Barkin Ladi',
  'Ramat Polytechnic, Maiduguri',
  'Rufus Giwa Polytechnic, Owo',
  'Taraba State Polytechnic, Suntai',
  'The Polytechnic, Ibadan',
  'Umaru Ali Shinkafi Polytechnic, Sokoto',
]

const NG_PRIVATE_POLYTECHNICS: string[] = [
  'Allover Central Polytechnic, Sango-Ota',
  'Best Solution Polytechnic, Akure',
  'Covenant Polytechnic, Aba',
  'Crown Polytechnic, Ado-Ekiti',
  'Dorben Polytechnic, Abuja',
  'Eastern Polytechnic, Port Harcourt',
  'Fidei Polytechnic, Gboko',
  'Grace Polytechnic, Lagos',
  'Grundtvig Polytechnic, Oba',
  'Heritage Polytechnic, Eket',
  'Ibadan City Polytechnic, Ibadan',
  'Igbajo Polytechnic, Igbajo',
  'Interlink Polytechnic, Ijebu-Jesa',
  'Kings Polytechnic, Ubiaja',
  'Lagos City Polytechnic, Ikeja',
  'Lens Polytechnic, Offa',
  'Nacabs Polytechnic, Akwanga',
  'OSISATECH Polytechnic, Enugu',
  'Ronik Polytechnic, Ejigbo',
  'Shaka Polytechnic, Benin City',
  'Sure Foundation Polytechnic, Ikot Akpaden',
  'Temple Gate Polytechnic, Aba',
  'Tower Polytechnic, Ibadan',
  'Villanova Polytechnic, Imesi-Ile',
  'Wolex Polytechnic, Lagos',
]

const NG_FEDERAL_COLLEGES_OF_EDUCATION: string[] = [
  'Aminu Saleh College of Education, Azare',
  'Federal College of Education (Special), Oyo',
  'Federal College of Education (Technical), Akoka',
  'Federal College of Education (Technical), Bichi',
  'Federal College of Education (Technical), Gombe',
  'Federal College of Education (Technical), Gusau',
  'Federal College of Education (Technical), Omoku',
  'Federal College of Education (Technical), Potiskum',
  'Federal College of Education (Technical), Umunze',
  'Federal College of Education, Abeokuta',
  'Federal College of Education, Eha-Amufu',
  'Federal College of Education, Isu',
  'Federal College of Education, Kano',
  'Federal College of Education, Katsina',
  'Federal College of Education, Kontagora',
  'Federal College of Education, Obudu',
  'Federal College of Education, Okene',
  'Federal College of Education, Pankshin',
  'Federal College of Education, Yola',
  'Federal College of Education, Zaria',
]

const NG_STATE_COLLEGES_OF_EDUCATION: string[] = [
  'Abia State College of Education (Technical), Arochukwu',
  'Adamawa State College of Education, Hong',
  'Adamu Augie College of Education, Argungu',
  'Akwa Ibom State College of Education, Afaha Nsit',
  'College of Education, Agbor',
  'College of Education, Akwanga',
  'College of Education, Gindiri',
  'College of Education, Igueben',
  'College of Education, Katsina-Ala',
  'College of Education, Oju',
  'College of Education, Warri',
  'College of Education, Zing',
  'Cross River State College of Education, Akamkpa',
  'Delta State College of Education, Mosogar',
  'Ebonyi State College of Education, Ikwo',
  'Enugu State College of Education (Technical), Enugu',
  'FCT College of Education, Zuba',
  'Isa Kaita College of Education, Dutsin-Ma',
  'Isaac Jasper Boro College of Education, Sagbama',
  'Jigawa State College of Education and Legal Studies, Ringim',
  'Jigawa State College of Education, Gumel',
  'Kaduna State College of Education, Gidan Waya',
  'Kano State College of Education and Preliminary Studies, Kano',
  'Kashim Ibrahim College of Education, Maiduguri',
  'Kogi State College of Education (Technical), Kabba',
  'Kogi State College of Education, Ankpa',
  'Kwara State College of Education (Technical), Lafiagi',
  'Kwara State College of Education, Ilorin',
  'Kwara State College of Education, Oro',
  'Niger State College of Education, Minna',
  'Nwafor Orizu College of Education, Nsugbe',
  'Shehu Shagari College of Education, Sokoto',
  'Umar Ibn Ibrahim El-Kanemi College of Education, Science and Technology, Bama',
  'Umar Suleiman College of Education, Gashua',
  'Zamfara State College of Education, Maru',
]

const NG_PRIVATE_COLLEGES_OF_EDUCATION: string[] = [
  'African Thinkers Community of Inquiry College of Education, Enugu',
  'Angel Crown College of Education, Gidan Daya',
  'Assanusiyyah College of Education, Odeomu',
  'Best Legacy College of Education, Ogbomoso',
  'City College of Education, Mararaba',
  'ECWA College of Education, Jos',
  'Emirate College of Education, Kano',
  'Hill College of Education, Akwanga',
  'Kinsey College of Education, Ilorin',
  'Muhyideen College of Education, Ilorin',
  'OSISATECH College of Education, Enugu',
  'Peaceland College of Education, Enugu',
  'St. Augustine College of Education (Project Time), Yaba',
]

/**
 * Institutions per country, grouped by category (rendered in CATEGORY_ORDER).
 * Add a new country key here once its list is ready, then the admin can enable
 * it from the admin panel.
 */
export const INSTITUTIONS_BY_COUNTRY: Record<string, InstitutionGroup[]> = {
  NG: [
    { category: 'Federal University', institutions: NG_FEDERAL_UNIVERSITIES },
    { category: 'State University', institutions: NG_STATE_UNIVERSITIES },
    { category: 'Private University', institutions: NG_PRIVATE_UNIVERSITIES },
    { category: 'Federal Polytechnic', institutions: NG_FEDERAL_POLYTECHNICS },
    { category: 'State Polytechnic', institutions: NG_STATE_POLYTECHNICS },
    { category: 'Private Polytechnic', institutions: NG_PRIVATE_POLYTECHNICS },
    { category: 'Federal College of Education', institutions: NG_FEDERAL_COLLEGES_OF_EDUCATION },
    { category: 'State College of Education', institutions: NG_STATE_COLLEGES_OF_EDUCATION },
    { category: 'Private College of Education', institutions: NG_PRIVATE_COLLEGES_OF_EDUCATION },
  ],
}

// --- Helpers -----------------------------------------------------------------

/** Look up a country by code (case-insensitive). */
export function getCountry(code: string | null | undefined): CountryInfo | undefined {
  if (!code) return undefined
  const c = code.trim().toUpperCase()
  return COUNTRIES.find((x) => x.code === c)
}

/** True if we have an institution catalog for this country. */
export function hasInstitutions(code: string | null | undefined): boolean {
  const c = (code || '').trim().toUpperCase()
  return !!INSTITUTIONS_BY_COUNTRY[c]?.some((g) => g.institutions.length > 0)
}

/** Institution groups for a country (in CATEGORY_ORDER), or [] if none. */
export function getInstitutionGroups(code: string | null | undefined): InstitutionGroup[] {
  const c = (code || '').trim().toUpperCase()
  return INSTITUTIONS_BY_COUNTRY[c] ?? []
}

/** Flat, de-duplicated list of every known institution in a country. */
export function getAllInstitutions(code: string | null | undefined): string[] {
  return Array.from(new Set(getInstitutionGroups(code).flatMap((g) => g.institutions)))
}

/** True if `name` exactly matches a known institution in that country. */
export function isKnownInstitution(code: string | null | undefined, name: string | null | undefined): boolean {
  if (!name) return false
  return getAllInstitutions(code).includes(name.trim())
}

/** The category a known institution belongs to, or null if not found. */
export function institutionCategoryOf(
  code: string | null | undefined,
  name: string | null | undefined,
): InstitutionCategory | null {
  if (!name) return null
  const target = name.trim()
  for (const g of getInstitutionGroups(code)) {
    if (g.institutions.includes(target)) return g.category
  }
  return null
}

/** The category labels available for a country, in catalog order (or []). */
export function getInstitutionCategories(code: string | null | undefined): InstitutionCategory[] {
  return getInstitutionGroups(code).map((g) => g.category)
}

/** Institutions within a single category for a country (or [] if none). */
export function getInstitutionsInCategory(
  code: string | null | undefined,
  category: string | null | undefined,
): string[] {
  if (!category) return []
  const target = category.trim()
  const group = getInstitutionGroups(code).find((g) => g.category === target)
  return group ? group.institutions : []
}

/** True if `category` is a real category in that country's catalog. */
export function isKnownCategory(
  code: string | null | undefined,
  category: string | null | undefined,
): boolean {
  if (!category) return false
  return getInstitutionCategories(code).includes(category.trim() as InstitutionCategory)
}

/** The currency code for a country (falls back to 'NGN' if unknown). */
export function getCountryCurrency(code: string | null | undefined): string {
  return getCountry(code)?.currency ?? 'NGN'
}

/**
 * Intersect the full catalog with the admin's enabled list. Only returns
 * countries that are both enabled AND present in the catalog. Order follows
 * COUNTRIES (Nigeria first).
 */
export function getEnabledCountries(enabledCodes: string[]): CountryInfo[] {
  const set = new Set(enabledCodes.map((c) => c.trim().toUpperCase()))
  return COUNTRIES.filter((c) => set.has(c.code))
}

/** True if `code` is a country we have in the master catalog. */
export function isCatalogCountry(code: string | null | undefined): boolean {
  return !!getCountry(code)
}
