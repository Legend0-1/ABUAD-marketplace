/**
 * Afe Babalola University, Ado-Ekiti (ABUAD) — academic departments / degree
 * programmes, grouped by college, used to populate the "Department" dropdown at
 * registration and on the profile-edit form.
 *
 * NOTE: This roster was compiled from best available knowledge and is intended
 * to be easy to maintain — it is the single source of truth for the whole app.
 * If ABUAD adds, renames, or removes a programme, edit this one file. A student
 * whose exact programme is not listed can always pick "Other (not listed)" and
 * type it in, so the list never blocks a sign-up.
 */

export type DepartmentGroup = { college: string; departments: string[] }

export const ABUAD_DEPARTMENT_GROUPS: DepartmentGroup[] = [
  {
    college: 'College of Law',
    departments: ['Law'],
  },
  {
    college: 'College of Medicine and Health Sciences',
    departments: [
      'Medicine and Surgery',
      'Nursing Science',
      'Medical Laboratory Science',
      'Anatomy',
      'Physiology',
      'Physiotherapy',
      'Radiography',
      'Human Nutrition and Dietetics',
      'Public Health',
    ],
  },
  {
    college: 'College of Dentistry',
    departments: ['Dentistry'],
  },
  {
    college: 'College of Pharmacy',
    departments: ['Pharmacy'],
  },
  {
    college: 'College of Engineering',
    departments: [
      'Aerospace Engineering',
      'Agricultural and Bioresources Engineering',
      'Biomedical Engineering',
      'Chemical Engineering',
      'Civil Engineering',
      'Computer Engineering',
      'Electrical and Electronics Engineering',
      'Marine Engineering',
      'Mechanical Engineering',
      'Mechatronics Engineering',
      'Metallurgical and Materials Engineering',
      'Mining Engineering',
      'Petroleum and Gas Engineering',
    ],
  },
  {
    college: 'College of Sciences',
    departments: [
      'Biochemistry',
      'Chemistry',
      'Computer Science',
      'Cyber Security',
      'Data Science',
      'Industrial Chemistry',
      'Information Technology',
      'Mathematics',
      'Microbiology',
      'Physics with Electronics',
      'Software Engineering',
      'Statistics',
    ],
  },
  {
    college: 'College of Social and Management Sciences',
    departments: [
      'Accounting',
      'Banking and Finance',
      'Business Administration',
      'Criminology and Security Studies',
      'Economics',
      'International Relations and Diplomacy',
      'Mass Communication',
      'Political Science',
      'Psychology',
      'Public Administration',
      'Sociology',
      'Taxation',
    ],
  },
  {
    college: 'College of Environmental Sciences',
    departments: [
      'Architecture',
      'Building',
      'Estate Management',
      'Quantity Surveying',
      'Surveying and Geoinformatics',
      'Urban and Regional Planning',
    ],
  },
  {
    college: 'College of Arts and Humanities',
    departments: [
      'English and Literary Studies',
      'History and International Studies',
      'Philosophy',
      'Religious Studies',
      'Theatre and Media Arts',
    ],
  },
  {
    college: 'College of Agricultural Sciences',
    departments: [
      'Agricultural Economics and Extension',
      'Animal Science',
      'Crop Science and Horticulture',
      'Fisheries and Aquaculture',
      'Food Science and Technology',
      'Forestry and Wildlife Management',
      'Soil Science',
    ],
  },
]

/** Sentinel option that reveals a free-text field for anything not listed. */
export const OTHER_DEPARTMENT = 'Other (not listed)'

/** Flat, de-duplicated list of every known department name. */
export const ABUAD_DEPARTMENTS: string[] = Array.from(
  new Set(ABUAD_DEPARTMENT_GROUPS.flatMap((g) => g.departments)),
)

/** True if `name` exactly matches one of the known departments. */
export function isKnownDepartment(name: string | null | undefined): boolean {
  if (!name) return false
  return ABUAD_DEPARTMENTS.includes(name.trim())
}
