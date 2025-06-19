export const gradeLevels = [
  // ระบบไทย - อนุบาล
  { value: 'อนุบาล 1', label: 'อนุบาล 1', category: 'ระบบไทย', searchTerms: ['อ1', 'อนุบาล1', 'อ.1'] },
  { value: 'อนุบาล 2', label: 'อนุบาล 2', category: 'ระบบไทย', searchTerms: ['อ2', 'อนุบาล2', 'อ.2'] },
  { value: 'อนุบาล 3', label: 'อนุบาล 3', category: 'ระบบไทย', searchTerms: ['อ3', 'อนุบาล3', 'อ.3'] },
  
  // ระบบไทย - ประถม (เพิ่ม searchTerms)
  { value: 'ป.1', label: 'ป.1 (ประถมศึกษาปีที่ 1)', category: 'ระบบไทย', searchTerms: ['ป1', 'ประถม1', 'ประถมศึกษา1', 'ประถมศึกษาปีที่1', 'ประถมศึกษาปีที่ 1', 'ประถมปีที่1', 'ประถมปีที่ 1'] },
  { value: 'ป.2', label: 'ป.2 (ประถมศึกษาปีที่ 2)', category: 'ระบบไทย', searchTerms: ['ป2', 'ประถม2', 'ประถมศึกษา2', 'ประถมศึกษาปีที่2', 'ประถมศึกษาปีที่ 2', 'ประถมปีที่2', 'ประถมปีที่ 2'] },
  { value: 'ป.3', label: 'ป.3 (ประถมศึกษาปีที่ 3)', category: 'ระบบไทย', searchTerms: ['ป3', 'ประถม3', 'ประถมศึกษา3', 'ประถมศึกษาปีที่3', 'ประถมศึกษาปีที่ 3', 'ประถมปีที่3', 'ประถมปีที่ 3'] },
  { value: 'ป.4', label: 'ป.4 (ประถมศึกษาปีที่ 4)', category: 'ระบบไทย', searchTerms: ['ป4', 'ประถม4', 'ประถมศึกษา4', 'ประถมศึกษาปีที่4', 'ประถมศึกษาปีที่ 4', 'ประถมปีที่4', 'ประถมปีที่ 4'] },
  { value: 'ป.5', label: 'ป.5 (ประถมศึกษาปีที่ 5)', category: 'ระบบไทย', searchTerms: ['ป5', 'ประถม5', 'ประถมศึกษา5', 'ประถมศึกษาปีที่5', 'ประถมศึกษาปีที่ 5', 'ประถมปีที่5', 'ประถมปีที่ 5'] },
  { value: 'ป.6', label: 'ป.6 (ประถมศึกษาปีที่ 6)', category: 'ระบบไทย', searchTerms: ['ป6', 'ประถม6', 'ประถมศึกษา6', 'ประถมศึกษาปีที่6', 'ประถมศึกษาปีที่ 6', 'ประถมปีที่6', 'ประถมปีที่ 6'] },
  
  // ระบบไทย - มัธยม (เพิ่ม searchTerms)
  { value: 'ม.1', label: 'ม.1 (มัธยมศึกษาปีที่ 1)', category: 'ระบบไทย', searchTerms: ['ม1', 'มัธยม1', 'มัธยมศึกษา1', 'มัธยมศึกษาปีที่1', 'มัธยมศึกษาปีที่ 1', 'มัธยมปีที่1', 'มัธยมปีที่ 1', 'มัธยมต้น1'] },
  { value: 'ม.2', label: 'ม.2 (มัธยมศึกษาปีที่ 2)', category: 'ระบบไทย', searchTerms: ['ม2', 'มัธยม2', 'มัธยมศึกษา2', 'มัธยมศึกษาปีที่2', 'มัธยมศึกษาปีที่ 2', 'มัธยมปีที่2', 'มัธยมปีที่ 2', 'มัธยมต้น2'] },
  { value: 'ม.3', label: 'ม.3 (มัธยมศึกษาปีที่ 3)', category: 'ระบบไทย', searchTerms: ['ม3', 'มัธยม3', 'มัธยมศึกษา3', 'มัธยมศึกษาปีที่3', 'มัธยมศึกษาปีที่ 3', 'มัธยมปีที่3', 'มัธยมปีที่ 3', 'มัธยมต้น3'] },
  { value: 'ม.4', label: 'ม.4 (มัธยมศึกษาปีที่ 4)', category: 'ระบบไทย', searchTerms: ['ม4', 'มัธยม4', 'มัธยมศึกษา4', 'มัธยมศึกษาปีที่4', 'มัธยมศึกษาปีที่ 4', 'มัธยมปีที่4', 'มัธยมปีที่ 4', 'มัธยมปลาย1'] },
  { value: 'ม.5', label: 'ม.5 (มัธยมศึกษาปีที่ 5)', category: 'ระบบไทย', searchTerms: ['ม5', 'มัธยม5', 'มัธยมศึกษา5', 'มัธยมศึกษาปีที่5', 'มัธยมศึกษาปีที่ 5', 'มัธยมปีที่5', 'มัธยมปีที่ 5', 'มัธยมปลาย2'] },
  { value: 'ม.6', label: 'ม.6 (มัธยมศึกษาปีที่ 6)', category: 'ระบบไทย', searchTerms: ['ม6', 'มัธยม6', 'มัธยมศึกษา6', 'มัธยมศึกษาปีที่6', 'มัธยมศึกษาปีที่ 6', 'มัธยมปีที่6', 'มัธยมปีที่ 6', 'มัธยมปลาย3'] },
  
  // ระบบไทย - แบบเต็ม (เพิ่มเพื่อให้ค้นหาได้)
  { value: 'ประถมศึกษาปีที่ 1', label: 'ประถมศึกษาปีที่ 1', category: 'ระบบไทย', searchTerms: ['ป1', 'ป.1', 'ประถม1', 'ประถมศึกษา1'] },
  { value: 'ประถมศึกษาปีที่ 2', label: 'ประถมศึกษาปีที่ 2', category: 'ระบบไทย', searchTerms: ['ป2', 'ป.2', 'ประถม2', 'ประถมศึกษา2'] },
  { value: 'ประถมศึกษาปีที่ 3', label: 'ประถมศึกษาปีที่ 3', category: 'ระบบไทย', searchTerms: ['ป3', 'ป.3', 'ประถม3', 'ประถมศึกษา3'] },
  { value: 'ประถมศึกษาปีที่ 4', label: 'ประถมศึกษาปีที่ 4', category: 'ระบบไทย', searchTerms: ['ป4', 'ป.4', 'ประถม4', 'ประถมศึกษา4'] },
  { value: 'ประถมศึกษาปีที่ 5', label: 'ประถมศึกษาปีที่ 5', category: 'ระบบไทย', searchTerms: ['ป5', 'ป.5', 'ประถม5', 'ประถมศึกษา5'] },
  { value: 'ประถมศึกษาปีที่ 6', label: 'ประถมศึกษาปีที่ 6', category: 'ระบบไทย', searchTerms: ['ป6', 'ป.6', 'ประถม6', 'ประถมศึกษา6'] },
  
  { value: 'มัธยมศึกษาปีที่ 1', label: 'มัธยมศึกษาปีที่ 1', category: 'ระบบไทย', searchTerms: ['ม1', 'ม.1', 'มัธยม1', 'มัธยมศึกษา1'] },
  { value: 'มัธยมศึกษาปีที่ 2', label: 'มัธยมศึกษาปีที่ 2', category: 'ระบบไทย', searchTerms: ['ม2', 'ม.2', 'มัธยม2', 'มัธยมศึกษา2'] },
  { value: 'มัธยมศึกษาปีที่ 3', label: 'มัธยมศึกษาปีที่ 3', category: 'ระบบไทย', searchTerms: ['ม3', 'ม.3', 'มัธยม3', 'มัธยมศึกษา3'] },
  { value: 'มัธยมศึกษาปีที่ 4', label: 'มัธยมศึกษาปีที่ 4', category: 'ระบบไทย', searchTerms: ['ม4', 'ม.4', 'มัธยม4', 'มัธยมศึกษา4'] },
  { value: 'มัธยมศึกษาปีที่ 5', label: 'มัธยมศึกษาปีที่ 5', category: 'ระบบไทย', searchTerms: ['ม5', 'ม.5', 'มัธยม5', 'มัธยมศึกษา5'] },
  { value: 'มัธยมศึกษาปีที่ 6', label: 'มัธยมศึกษาปีที่ 6', category: 'ระบบไทย', searchTerms: ['ม6', 'ม.6', 'มัธยม6', 'มัธยมศึกษา6'] },
  
  // International System
  { value: 'Nursery', label: 'Nursery', category: 'International', searchTerms: ['nur', 'nursery'] },
  { value: 'Pre-K', label: 'Pre-K', category: 'International', searchTerms: ['prek', 'pre k', 'pre kindergarten'] },
  { value: 'Kindergarten', label: 'Kindergarten', category: 'International', searchTerms: ['k', 'kg', 'kinder'] },
  { value: 'Grade 1', label: 'Grade 1', category: 'International', searchTerms: ['g1', 'grade1', 'gr1', 'gr 1'] },
  { value: 'Grade 2', label: 'Grade 2', category: 'International', searchTerms: ['g2', 'grade2', 'gr2', 'gr 2'] },
  { value: 'Grade 3', label: 'Grade 3', category: 'International', searchTerms: ['g3', 'grade3', 'gr3', 'gr 3'] },
  { value: 'Grade 4', label: 'Grade 4', category: 'International', searchTerms: ['g4', 'grade4', 'gr4', 'gr 4'] },
  { value: 'Grade 5', label: 'Grade 5', category: 'International', searchTerms: ['g5', 'grade5', 'gr5', 'gr 5'] },
  { value: 'Grade 6', label: 'Grade 6', category: 'International', searchTerms: ['g6', 'grade6', 'gr6', 'gr 6'] },
  { value: 'Grade 7', label: 'Grade 7', category: 'International', searchTerms: ['g7', 'grade7', 'gr7', 'gr 7'] },
  { value: 'Grade 8', label: 'Grade 8', category: 'International', searchTerms: ['g8', 'grade8', 'gr8', 'gr 8'] },
  { value: 'Grade 9', label: 'Grade 9', category: 'International', searchTerms: ['g9', 'grade9', 'gr9', 'gr 9'] },
  { value: 'Grade 10', label: 'Grade 10', category: 'International', searchTerms: ['g10', 'grade10', 'gr10', 'gr 10'] },
  { value: 'Grade 11', label: 'Grade 11', category: 'International', searchTerms: ['g11', 'grade11', 'gr11', 'gr 11'] },
  { value: 'Grade 12', label: 'Grade 12', category: 'International', searchTerms: ['g12', 'grade12', 'gr12', 'gr 12'] },
  
  // British System
  { value: 'Year 1', label: 'Year 1', category: 'British', searchTerms: ['y1', 'year1', 'yr1', 'yr 1'] },
  { value: 'Year 2', label: 'Year 2', category: 'British', searchTerms: ['y2', 'year2', 'yr2', 'yr 2'] },
  { value: 'Year 3', label: 'Year 3', category: 'British', searchTerms: ['y3', 'year3', 'yr3', 'yr 3'] },
  { value: 'Year 4', label: 'Year 4', category: 'British', searchTerms: ['y4', 'year4', 'yr4', 'yr 4'] },
  { value: 'Year 5', label: 'Year 5', category: 'British', searchTerms: ['y5', 'year5', 'yr5', 'yr 5'] },
  { value: 'Year 6', label: 'Year 6', category: 'British', searchTerms: ['y6', 'year6', 'yr6', 'yr 6'] },
  { value: 'Year 7', label: 'Year 7', category: 'British', searchTerms: ['y7', 'year7', 'yr7', 'yr 7'] },
  { value: 'Year 8', label: 'Year 8', category: 'British', searchTerms: ['y8', 'year8', 'yr8', 'yr 8'] },
  { value: 'Year 9', label: 'Year 9', category: 'British', searchTerms: ['y9', 'year9', 'yr9', 'yr 9'] },
  { value: 'Year 10', label: 'Year 10', category: 'British', searchTerms: ['y10', 'year10', 'yr10', 'yr 10'] },
  { value: 'Year 11', label: 'Year 11', category: 'British', searchTerms: ['y11', 'year11', 'yr11', 'yr 11'] },
  { value: 'Year 12', label: 'Year 12', category: 'British', searchTerms: ['y12', 'year12', 'yr12', 'yr 12'] },
  { value: 'Year 13', label: 'Year 13', category: 'British', searchTerms: ['y13', 'year13', 'yr13', 'yr 13'] },
]

// Helper function สำหรับ normalize text (ลบช่องว่างและทำให้เป็นตัวพิมพ์เล็ก)
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
}

// Function สำหรับค้นหาระดับชั้นที่ match กับคำค้นหา
export function searchGradeLevels(searchTerm: string): typeof gradeLevels {
  if (!searchTerm || searchTerm.length < 1) return [];
  
  const normalizedSearch = normalizeText(searchTerm);
  
  return gradeLevels.filter(grade => {
    // ค้นหาจาก value
    if (normalizeText(grade.value).includes(normalizedSearch)) return true;
    
    // ค้นหาจาก label
    if (normalizeText(grade.label).includes(normalizedSearch)) return true;
    
    // ค้นหาจาก searchTerms
    if (grade.searchTerms) {
      return grade.searchTerms.some(term => 
        normalizeText(term).includes(normalizedSearch)
      );
    }
    
    return false;
  });
}