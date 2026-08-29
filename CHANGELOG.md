# Changelog

All notable changes to **Aurevia Health AI** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Aurevia Health AI Rebrand** — Complete rebrand from AI Healthcare System to **Aurevia Health AI**
- **MIT License** — Changed from AGPL-3.0 to MIT License (Copyright 2026 Varun B P)
- **Stitch Nexus Design System** — Implemented across all UI components
- **Documentation Hub** — New `/documentation` and `/developers` routes with comprehensive API reference
- **Feature Highlights** — 9 feature cards on Federated Learning page (TabICLv2, Databricks Lakehouse, Digital Twin, CPIC, OMOP/FHIR, Conformal Sets, Cloudflare Edge AI, 3D DICOM, Bayesian Consensus)
- **Trust & Credibility** — Compliance badges (HIPAA, FHIR R4, OMOP 5.4, DICOMweb), research citations, security transparency page
- **FAQ Section** — Expandable FAQ section on Federated Learning page
- **Trust & Credibility Section** — Compliance badges, research citations, security transparency

### Changed
- **License** — Changed from AGPL-3.0 to MIT License (Copyright 2026 Varun B P)
- **Branding** — Complete rebrand from "AI Healthcare System" to "Aurevia Health AI"
- **Documentation Routes** — Added `/documentation`, `/developers`, `/documentation` routes (legacy `/docs` now points to Swagger UI)
- **Navigation** — Added "Developers" tab group (📚) with Documentation and Developers quickstart
- **Federated Learning Page** — Complete redesign with hero section, value prop, 9 feature highlights, trust section, FAQ, SEO schemas
- **Documentation Page** — New comprehensive documentation hub with 6 sections (API Reference, EHR Integration, Deployment, SDK & Samples, Clinical Models, Compliance)
- **License** — Changed from AGPL-3.0 to MIT License (Copyright 2026 Varun B P)

### Fixed
- License endpoint double `/v1` prefix bug (was `/v1/v1/licensing/status`)
- PII in query strings moved to JSON bodies for all admin agent triggers
- API path double-prefix bug in `apiLakehouse.ts` (`/api/v1/data-platform` → `/data-platform`)
- Service Worker null deref bug (`sw.js:41` header guard)

## [2.6.0] - 2026-08-29

### Added
- **Aurevia Health AI Rebrand** — Complete rebrand from AI Healthcare System to **Aurevia Health AI**
- **MIT License** — Changed from AGPL-3.0 to MIT License (Copyright 2026 Varun B P)
- **Stitch Nexus Design System** — Implemented across all UI components
- **Documentation Hub** — New `/documentation` and `/developers` routes with comprehensive API reference
- **Feature Highlights** — 9 feature cards on Federated Learning page (TabICLv2, Databricks Lakehouse, Digital Twin, CPIC, OMOP/FHIR, Conformal Sets, Cloudflare Edge AI, 3D DICOM, Bayesian Consensus)
- **Trust & Credibility** — Compliance badges (HIPAA, FHIR R4, OMOP 5.4, DICOMweb), research citations, security transparency
- **FAQ Section** — Expandable FAQ section on Federated Learning page
- **Trust & Credibility Section** — Compliance badges, research citations, security transparency

### Changed
- **License** — Changed from AGPL-3.0 to MIT License (Copyright 2026 Varun B P)
- **Branding** — Complete rebrand from "AI Healthcare System" to "Aurevia Health AI"
- **Documentation Routes** — Added `/documentation`, `/developers`, `/documentation` routes (legacy `/docs` now points to Swagger UI)
- **Navigation** — Added "Developers" tab group (📚) with Documentation and Developers quickstart
- **Federated Learning Page** — Complete redesign with hero section, value prop, 9 feature highlights, trust section, FAQ, SEO schemas
- **Documentation Page** — New comprehensive documentation hub with 6 sections (API Reference, EHR Integration, Deployment, SDK & Samples, Clinical Models, Compliance)
- **License** — Changed from AGPL-3.0 to MIT License (Copyright 2026 Varun B P)

### Fixed
- License endpoint double `/v1` prefix bug (was `/v1/v1/licensing/status`)
- PII in query strings moved to JSON bodies for all admin agent triggers
- API path double-prefix bug in `apiLakehouse.ts` (`/api/v1/data-platform` → `/data-platform`)
- Service Worker null deref bug (`sw.js:41` header guard)

## [2.5.0] - 2025-12-01

### Added
- Full-stack AI Healthcare System with FastAPI backend and React 19 frontend
- 5 ML clinical prediction models (Diabetes, Heart, Liver, Kidney, Lung Cancer)
- LangGraph-powered AI medical assistant with multi-turn conversation
- SHAP-based explainability for all predictions
- Conformal prediction for uncertainty quantification
- Clinical indices (eGFR CKD-EPI, FIB-4, Framingham Risk Score)
- FHIR R4 interoperability endpoints
- Hospital operations modules (Pharmacy, Billing, Discharge, Nursing, Diagnostics)
- Real-time monitoring and telemetry
- JWT authentication with role-based access control
- Docker + Kubernetes deployment configurations
- Comprehensive test suite (pytest + Vitest + Playwright)
- CI/CD with GitHub Actions (CodeQL, Dependabot, Release Drafter)
- 34-document technical documentation library

### Changed
- Upgraded training pipelines (`train_diabetes.py`, `train_heart.py`, `train_liver.py`) to 6-model calibrated soft-voting ensemble
- All prediction endpoints now use class-conditional conformal prediction thresholds

## [1.0.0] - 2024-12-01

### Added
- Full-stack AI Healthcare System with FastAPI backend and React 19 frontend
- 5 ML clinical prediction models (Diabetes, Heart, Liver, Kidney, Lung Cancer)
- LangGraph-powered AI medical assistant with multi-turn conversation
- SHAP-based explainability for all predictions
- Conformal prediction for uncertainty quantification
- Clinical indices (eGFR CKD-EPI, FIB-4, Framingham Risk Score)
- FHIR R4 interoperability endpoints
- Hospital operations modules (Pharmacy, Billing, Discharge, Nursing, Diagnostics)
- Real-time monitoring and telemetry
- JWT authentication with role-based access control
- Docker + Kubernetes deployment configurations
- Comprehensive test suite (pytest + Vitest + Playwright)
- CI/CD with GitHub Actions (CodeQL, Dependabot, Release Drafter)
- 34-document technical documentation library