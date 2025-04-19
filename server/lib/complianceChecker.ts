import { checkCompliance } from "./openai";

interface ComplianceResult {
  passed: boolean;
  status: 'Passed' | 'Review' | 'Failed';
  details: {
    passed: boolean;
    score: number;
    issues?: string[];
    recommendations?: string[];
  };
}

/**
 * Checks if a script is PMDA compliant
 * @param script The script to evaluate
 * @returns Compliance status details
 */
export async function evaluateCompliance(script: string): Promise<ComplianceResult> {
  try {
    // Use OpenAI to check compliance
    const complianceDetails = await checkCompliance(script);
    
    // Determine compliance status
    let status: 'Passed' | 'Review' | 'Failed';
    
    if (complianceDetails.passed) {
      status = 'Passed';
    } else if (complianceDetails.score >= 60) {
      status = 'Review';
    } else {
      status = 'Failed';
    }
    
    // Simple rule-based check for evidence-based language
    const evidenceBasedCheck = containsEvidenceBasedLanguage(script);
    
    // If we found evidence-based language but OpenAI didn't pass it,
    // adjust to 'Review' status as a fallback
    if (evidenceBasedCheck && status === 'Failed') {
      status = 'Review';
    }
    
    return {
      passed: status === 'Passed',
      status,
      details: complianceDetails
    };
  } catch (error) {
    console.error("Error evaluating compliance:", error);
    
    // Fallback to simple rule-based compliance check
    const fallbackResult = simpleComplianceCheck(script);
    
    return {
      passed: fallbackResult.passed,
      status: fallbackResult.passed ? 'Passed' : 'Review',
      details: {
        passed: fallbackResult.passed,
        score: fallbackResult.passed ? 80 : 50,
        issues: fallbackResult.passed ? [] : ["Compliance check error - limited validation performed"],
        recommendations: fallbackResult.passed ? [] : ["Include explicit evidence-based language"]
      }
    };
  }
}

/**
 * Simple check for evidence-based language in the script
 * @param script Script to check
 * @returns Whether evidence-based language was found
 */
function containsEvidenceBasedLanguage(script: string): boolean {
  const evidenceTerms = [
    'evidence-based',
    'clinical trial',
    'study shows',
    'research indicates',
    'data suggest',
    'demonstrated efficacy',
    'proven',
    'clinically validated',
    'statistically significant',
    'peer-reviewed',
    'meta-analysis',
    'randomized controlled trial',
    'rct'
  ];
  
  const lowerScript = script.toLowerCase();
  return evidenceTerms.some(term => lowerScript.includes(term));
}

/**
 * Simple rule-based compliance check as a fallback
 * @param script Script to check
 * @returns Simple compliance result
 */
function simpleComplianceCheck(script: string): { passed: boolean } {
  const lowerScript = script.toLowerCase();
  
  // Check for evidence-based language
  const hasEvidenceBasedLanguage = containsEvidenceBasedLanguage(script);
  
  // Check for potentially non-compliant language
  const nonCompliantTerms = [
    'best in class',
    'superior to',
    'better than',
    'most effective',
    'guaranteed',
    'miracle',
    'cure',
    'no side effects',
    'risk free',
    'immediate results',
    'complete relief',
    'revolutionary',
    'breakthrough'
  ];
  
  const hasNonCompliantLanguage = nonCompliantTerms.some(term => lowerScript.includes(term));
  
  return {
    passed: hasEvidenceBasedLanguage && !hasNonCompliantLanguage
  };
}
