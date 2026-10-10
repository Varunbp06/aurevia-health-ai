/**
 * Programmatic SEO & Schema.org JSON-LD Structured Metadata Generator.
 * Enables automatic rich snippet ranking on Google Search, Bing, and AI search engines
 * (Perplexity, ChatGPT Search) for clinical calculators, models, and digital twins.
 */

export interface MedicalSEOConfig {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  medicalSpecialty?: string;
  conditionName?: string;
  loincCode?: string;
  snomedCode?: string;
}

export function generateMedicalJsonLd(config: MedicalSEOConfig): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "name": config.title,
    "description": config.description,
    "url": config.canonicalUrl,
    "keywords": config.keywords.join(", "),
    "about": {
      "@type": "MedicalCondition",
      "name": config.conditionName || "Clinical Risk Screening",
      "code": {
        "@type": "MedicalCode",
        "code": config.snomedCode || "386053000",
        "codingSystem": "SNOMED-CT"
      }
    },
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "Aurevia Health AI — Clinical Intelligence Platform",
      "applicationCategory": "HealthApplication",
      "operatingSystem": "Web, Linux, Cloudflare Edge",
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD"
      }
    },
    "publisher": {
      "@type": "Organization",
      "name": "Aurevia Health AI",
      "url": "https://aurevia-health-ai.vercel.app"
    }
  };

  return JSON.stringify(schema, null, 2);
}

export const SEO_PRESETS: Record<string, MedicalSEOConfig> = {
  diabetes: {
    title: "Aurevia Health AI — Diabetes Risk Screening (CDC BRFSS • TabICLv2)",
    description: "Aurevia Health AI — population-level diabetes and prediabetes risk screening calibrated on 253,000+ CDC BRFSS records with Conformal 95% Confidence Sets.",
    keywords: ["Aurevia diabetes risk", "diabetes risk calculator", "AI diabetes screening", "BRFSS diabetes model", "conformal prediction diabetes", "HbA1c risk estimator"],
    canonicalUrl: "https://aurevia-health-ai.vercel.app/predict/diabetes",
    conditionName: "Type 2 Diabetes Mellitus",
    snomedCode: "44054006"
  },
  cardiovascular: {
    title: "Aurevia Health AI — Cardiovascular & Heart Disease Risk Screening",
    description: "Aurevia Health AI — 10-year cardiovascular risk screener combining Cleveland clinical markers and CDC epidemiological surveys with SHAP explainability.",
    keywords: ["Aurevia heart risk", "heart disease risk calculator", "cardiovascular AI screener", "ASCVD risk tool", "Cleveland heart disease model"],
    canonicalUrl: "https://aurevia-health-ai.vercel.app/predict/heart",
    conditionName: "Coronary Artery Disease",
    snomedCode: "53741008"
  },
  digitalTwin: {
    title: "Aurevia Health AI — 10-Year Multi-Organ Clinical Digital Twin",
    description: "Aurevia Health AI — simulate non-linear cross-organ disease trajectories (cardiovascular, renal eGFR, metabolic glucose, hepatic enzymes) using coupled ODEs.",
    keywords: ["Aurevia digital twin", "clinical digital twin", "multi-organ simulation", "eGFR decay prediction", "cardio-renal metabolic modeling", "ODE health simulator"],
    canonicalUrl: "https://aurevia-health-ai.vercel.app/intelligence",
    conditionName: "Cardiorenal Metabolic Syndrome",
    snomedCode: "73211009"
  },
  pharmacogenomics: {
    title: "Aurevia Health AI — CPIC Pharmacogenomics & Drug Interaction Engine",
    description: "Aurevia Health AI — CPIC guideline lookup for Warfarin, Clopidogrel, Statins, Codeine, and Fluoropyrimidines by CYP2C9, CYP2C19, CYP2D6 genotype.",
    keywords: ["Aurevia pharmacogenomics", "CPIC guidelines tool", "CYP2C19 clopidogrel dosing", "CYP2C9 warfarin genotype", "adverse drug event prevention"],
    canonicalUrl: "https://aurevia-health-ai.vercel.app/intelligence",
    conditionName: "Pharmacogenetic Drug Response",
    snomedCode: "410534003"
  },
  omopLakehouse: {
    title: "Aurevia Health AI — OHDSI OMOP CDM v5.4 Lakehouse Converter",
    description: "Aurevia Health AI — convert raw clinical telemetry and EHR tables into OHDSI OMOP CDM v5.4 Delta Lake tables with PySpark SDP quality gates.",
    keywords: ["Aurevia OMOP", "OMOP CDM v5.4 converter", "OHDSI lakehouse", "FHIR to OMOP ETL", "Delta Lake healthcare", "PySpark clinical data engineering"],
    canonicalUrl: "https://aurevia-health-ai.vercel.app/data-engineering",
    conditionName: "Clinical Data Harmonization",
    snomedCode: "386053000"
  }
};
