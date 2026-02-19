# Clinical Data Analysis in Stata

## Table of Contents
1. [MIMIC-IV Data Structure](#mimic-iv-data-structure)
2. [ICD-9/10 Coding](#icd-910-coding)
3. [Lab Values Processing](#lab-values-processing)
4. [Time Series Clinical Data](#time-series-clinical-data)
5. [Missing Value Imputation (mi)](#missing-value-imputation)
6. [Survival Time Calculation](#survival-time-calculation)
7. [Sepsis-3 Definition Implementation](#sepsis-3-definition-implementation)
8. [KDIGO Criteria Implementation](#kdigo-criteria-implementation)
9. [Common Clinical Data Patterns](#common-clinical-data-patterns)
10. [Common Errors](#common-errors)

---

## MIMIC-IV Data Structure

### Key Tables and Relationships
```
patients (subject_id) --> admissions (hadm_id) --> icustays (stay_id)
                                                --> diagnoses_icd (seq_num)
                                                --> labevents (labevent_id)
                                                --> chartevents (row_id)
                                                --> prescriptions
```

### Loading and Linking MIMIC Tables
```stata
* Load patients
import delimited "patients.csv", clear
save "patients.dta", replace

* Load admissions
import delimited "admissions.csv", clear
gen double admittime_dt = clock(admittime, "YMDhms")
gen double dischtime_dt = clock(dischtime, "YMDhms")
format admittime_dt dischtime_dt %tc
save "admissions.dta", replace

* Load ICU stays
import delimited "icustays.csv", clear
gen double intime_dt = clock(intime, "YMDhms")
gen double outtime_dt = clock(outtime, "YMDhms")
format intime_dt outtime_dt %tc
save "icustays.dta", replace

* Merge patient demographics with admissions
use "admissions.dta", clear
merge m:1 subject_id using "patients.dta", keep(match) nogenerate

* Add ICU stay info
merge 1:m hadm_id using "icustays.dta", keep(match master) nogenerate
```

### Calculating Age and LOS
```stata
* Age at admission (MIMIC-IV uses anchor_year system)
gen age = anchor_age + (year(dofc(admittime_dt)) - anchor_year)

* Hospital length of stay (hours)
gen los_hospital_hrs = hours(dischtime_dt - admittime_dt)
gen los_hospital_days = los_hospital_hrs / 24

* ICU length of stay
gen los_icu_hrs = hours(outtime_dt - intime_dt)
gen los_icu_days = los_icu_hrs / 24
```

### First ICU Stay Selection
```stata
* Keep only first ICU admission per patient
bysort subject_id (intime_dt): gen icu_order = _n
keep if icu_order == 1
```

---

## ICD-9/10 Coding

### Loading Diagnosis Codes
```stata
import delimited "diagnoses_icd.csv", clear

* Convert ICD version
gen icd_version = cond(icd_version == 9, 9, 10)
```

### Flagging Conditions by ICD Code
```stata
* Diabetes (ICD-9: 250.xx, ICD-10: E10-E14)
gen diabetes = 0
replace diabetes = 1 if icd_version == 9 & substr(icd_code, 1, 3) == "250"
replace diabetes = 1 if icd_version == 10 & inlist(substr(icd_code, 1, 3), ///
    "E10", "E11", "E12", "E13", "E14")

* Heart failure (ICD-9: 428.xx, ICD-10: I50.xx)
gen heart_failure = 0
replace heart_failure = 1 if icd_version == 9 & substr(icd_code, 1, 3) == "428"
replace heart_failure = 1 if icd_version == 10 & substr(icd_code, 1, 3) == "I50"

* CKD (ICD-9: 585.x, ICD-10: N18.x)
gen ckd = 0
replace ckd = 1 if icd_version == 9 & substr(icd_code, 1, 3) == "585"
replace ckd = 1 if icd_version == 10 & substr(icd_code, 1, 3) == "N18"

* Collapse to patient level
collapse (max) diabetes heart_failure ckd, by(hadm_id)
```

### Charlson Comorbidity Index
```stata
* Create comorbidity flags from ICD codes
* Method: flag each Charlson condition, then sum weighted scores

gen charlson_mi = (substr(icd_code, 1, 3) == "I21" | ///
                   substr(icd_code, 1, 3) == "I22") & icd_version == 10

* ... (repeat for each Charlson condition)

* Weight and sum
collapse (max) charlson_*, by(hadm_id)
gen charlson_score = charlson_mi + charlson_chf + charlson_pvd + ///
    charlson_cevd + charlson_dementia + charlson_cpd + ///
    charlson_rheumd + charlson_pud + charlson_mld + ///
    2 * charlson_dm_chronic + 2 * charlson_hp + ///
    2 * charlson_rend + 2 * charlson_cancer + ///
    3 * charlson_msld + 6 * charlson_met_cancer + 6 * charlson_aids
```

---

## Lab Values Processing

### Loading and Processing Lab Events
```stata
import delimited "labevents.csv", clear

* Parse datetime
gen double charttime_dt = clock(charttime, "YMDhms")
format charttime_dt %tc

* Key lab itemids (MIMIC-IV)
* Creatinine: 50912
* BUN: 51006
* Hemoglobin: 51222
* WBC: 51301
* Platelets: 51265
* Lactate: 50813
* Bilirubin total: 50885
* Sodium: 50983
* Potassium: 50971
* Glucose: 50931

* Filter and pivot
keep if inlist(itemid, 50912, 51006, 51222, 51301, 51265, 50813)
```

### Getting First/Last/Min/Max Lab Values
```stata
* First lab value within 24h of ICU admission
merge m:1 stay_id using "icustays.dta", keepusing(intime_dt) keep(match)

gen hours_from_admit = hours(charttime_dt - intime_dt)
keep if hours_from_admit >= 0 & hours_from_admit <= 24

* First value
bysort stay_id itemid (charttime_dt): gen lab_order = _n
keep if lab_order == 1

* Reshape to wide
keep stay_id itemid valuenum
reshape wide valuenum, i(stay_id) j(itemid)
rename valuenum50912 creatinine_first
rename valuenum51006 bun_first
rename valuenum51222 hemoglobin_first
rename valuenum51301 wbc_first
rename valuenum51265 platelets_first
rename valuenum50813 lactate_first
```

### Handling Abnormal Lab Values
```stata
* Remove physiologically implausible values
replace creatinine = . if creatinine < 0 | creatinine > 40
replace hemoglobin = . if hemoglobin < 1 | hemoglobin > 25
replace wbc = . if wbc < 0 | wbc > 500
replace platelets = . if platelets < 0 | platelets > 2000
replace lactate = . if lactate < 0 | lactate > 50
replace sodium = . if sodium < 100 | sodium > 200
replace potassium = . if potassium < 1 | potassium > 12
```

---

## Time Series Clinical Data

### Vital Signs Processing
```stata
* Load chartevents for vitals
import delimited "chartevents.csv", clear

* Key vital sign itemids (MIMIC-IV)
* Heart rate: 220045
* SBP: 220179 (non-invasive), 220050 (arterial)
* DBP: 220180 (non-invasive), 220051 (arterial)
* SpO2: 220277
* Temperature: 223761 (F), 223762 (C)
* RR: 220210

* Parse time
gen double charttime_dt = clock(charttime, "YMDhms")
format charttime_dt %tc

* Calculate time relative to ICU admission
merge m:1 stay_id using "icustays.dta", keepusing(intime_dt) keep(match) nogenerate
gen hours_from_icu = hours(charttime_dt - intime_dt)
```

### Creating Hourly Summaries
```stata
* Bin into hourly intervals
gen hour_bin = floor(hours_from_icu)
keep if hour_bin >= 0 & hour_bin <= 72    // first 72 hours

* Aggregate to hourly
collapse (mean) mean_val=valuenum ///
         (min) min_val=valuenum ///
         (max) max_val=valuenum ///
         (count) n_vals=valuenum, ///
    by(stay_id itemid hour_bin)
```

### Panel Structure for Vital Signs
```stata
xtset stay_id hour_bin

* Forward fill missing hourly values (LOCF)
bysort stay_id (hour_bin): replace mean_val = mean_val[_n-1] ///
    if missing(mean_val)

* Rolling averages
bysort stay_id (hour_bin): gen ma6h = ///
    (mean_val + L.mean_val + L2.mean_val + ///
     L3.mean_val + L4.mean_val + L5.mean_val) / 6
```

---

## Missing Value Imputation

### Multiple Imputation (mi)
```stata
* Step 1: Set imputation format
mi set mlong

* Step 2: Register variables
mi register imputed creatinine hemoglobin albumin
mi register regular age gender treatment

* Step 3: Impute
mi impute chained ///
    (regress) creatinine hemoglobin ///
    (pmm, knn(5)) albumin ///
    = age i.gender i.treatment, ///
    add(20) rseed(12345) dots

* Step 4: Check diagnostics
mi describe
midiagplots creatinine, m(1/5) combine

* Step 5: Analyze with MI-aware commands
mi estimate: regress outcome creatinine hemoglobin albumin ///
    age i.gender i.treatment
mi estimate: stcox creatinine hemoglobin albumin age i.gender
mi estimate: logit mortality creatinine hemoglobin albumin age i.gender

* Step 6: Pool results
mi estimate, post
```

### Simple Imputation Methods
```stata
* Median imputation (use only when MI is not feasible)
foreach var of varlist creatinine hemoglobin albumin {
    quietly summarize `var', detail
    replace `var' = r(p50) if missing(`var')
}

* Group-specific mean imputation
bysort icu_type: egen mean_cr = mean(creatinine)
replace creatinine = mean_cr if missing(creatinine)
drop mean_cr

* LOCF (Last Observation Carried Forward)
bysort patient_id (time): replace value = value[_n-1] if missing(value)
```

### Missing Indicator Method
```stata
gen creatinine_miss = missing(creatinine)
replace creatinine = 0 if missing(creatinine)
* Include both in model
regress outcome creatinine creatinine_miss age
```

---

## Survival Time Calculation

### Hospital Mortality Survival Time
```stata
* Time: hours from admission to death or discharge
gen surv_time_hrs = hours(dischtime_dt - admittime_dt)
gen died_hospital = (hospital_expire_flag == 1)

stset surv_time_hrs, failure(died_hospital)
```

### 28-Day and 90-Day Mortality
```stata
* dod = date of death
gen double dod_dt = clock(dod, "YMDhms") if !missing(dod)
format dod_dt %tc

* Days from discharge to death
gen days_to_death = (dod_dt - dischtime_dt) / (1000 * 60 * 60 * 24)

* 28-day mortality
gen mort_28d = (days_to_death <= 28) if !missing(days_to_death)
replace mort_28d = 0 if missing(mort_28d)

* Survival time for 28-day analysis (censored at 28 days)
gen surv_28d = min(days_to_death, 28) if !missing(days_to_death)
replace surv_28d = 28 if missing(days_to_death)
gen event_28d = (days_to_death <= 28) if !missing(days_to_death)
replace event_28d = 0 if missing(event_28d)

stset surv_28d, failure(event_28d)
```

---

## Sepsis-3 Definition Implementation

### SOFA Score Calculation
```stata
* Respiration: PaO2/FiO2 ratio
gen sofa_resp = 0
replace sofa_resp = 1 if pf_ratio < 400
replace sofa_resp = 2 if pf_ratio < 300
replace sofa_resp = 3 if pf_ratio < 200
replace sofa_resp = 4 if pf_ratio < 100

* Coagulation: Platelets (x10^3/uL)
gen sofa_coag = 0
replace sofa_coag = 1 if platelets < 150
replace sofa_coag = 2 if platelets < 100
replace sofa_coag = 3 if platelets < 50
replace sofa_coag = 4 if platelets < 20

* Liver: Bilirubin (mg/dL)
gen sofa_liver = 0
replace sofa_liver = 1 if bilirubin >= 1.2 & bilirubin < 2.0
replace sofa_liver = 2 if bilirubin >= 2.0 & bilirubin < 6.0
replace sofa_liver = 3 if bilirubin >= 6.0 & bilirubin < 12.0
replace sofa_liver = 4 if bilirubin >= 12.0 & !missing(bilirubin)

* Cardiovascular: MAP and vasopressors
gen sofa_cv = 0
replace sofa_cv = 1 if map < 70
replace sofa_cv = 2 if dopamine_dose <= 5 | dobutamine_any == 1
replace sofa_cv = 3 if dopamine_dose > 5 | epinephrine_dose <= 0.1 | ///
    norepinephrine_dose <= 0.1
replace sofa_cv = 4 if dopamine_dose > 15 | epinephrine_dose > 0.1 | ///
    norepinephrine_dose > 0.1

* CNS: Glasgow Coma Scale
gen sofa_cns = 0
replace sofa_cns = 1 if gcs >= 13 & gcs <= 14
replace sofa_cns = 2 if gcs >= 10 & gcs <= 12
replace sofa_cns = 3 if gcs >= 6 & gcs <= 9
replace sofa_cns = 4 if gcs < 6

* Renal: Creatinine (mg/dL) or urine output
gen sofa_renal = 0
replace sofa_renal = 1 if creatinine >= 1.2 & creatinine < 2.0
replace sofa_renal = 2 if creatinine >= 2.0 & creatinine < 3.5
replace sofa_renal = 3 if creatinine >= 3.5 & creatinine < 5.0
replace sofa_renal = 4 if creatinine >= 5.0 & !missing(creatinine)

* Total SOFA
gen sofa_total = sofa_resp + sofa_coag + sofa_liver + ///
    sofa_cv + sofa_cns + sofa_renal
```

### Sepsis-3 Identification
```stata
* Sepsis-3 = suspected infection + SOFA >= 2 (acute change)
gen sepsis3 = (suspected_infection == 1 & sofa_total >= 2)

* Septic shock: sepsis + vasopressors + lactate > 2
gen septic_shock = (sepsis3 == 1 & vasopressor_any == 1 & lactate > 2)
```

---

## KDIGO Criteria Implementation

### Acute Kidney Injury Staging
```stata
* Baseline creatinine: minimum in first 48h or pre-admission
bysort stay_id: egen baseline_cr = min(creatinine) ///
    if hours_from_admit >= -168 & hours_from_admit <= 0

* KDIGO Stage 1: 1.5-1.9x baseline OR >= 0.3 mg/dL increase in 48h
gen aki_stage = 0
replace aki_stage = 1 if (creatinine / baseline_cr >= 1.5 & ///
    creatinine / baseline_cr < 2.0) | ///
    (creatinine - baseline_cr >= 0.3)

* KDIGO Stage 2: 2.0-2.9x baseline
replace aki_stage = 2 if creatinine / baseline_cr >= 2.0 & ///
    creatinine / baseline_cr < 3.0

* KDIGO Stage 3: >= 3.0x baseline OR creatinine >= 4.0 OR RRT
replace aki_stage = 3 if creatinine / baseline_cr >= 3.0 | ///
    creatinine >= 4.0 | rrt == 1

* Any AKI
gen aki_any = (aki_stage >= 1) if !missing(aki_stage)
```

---

## Common Clinical Data Patterns

### Cohort Selection Template
```stata
* Start with all ICU stays
use "icustays.dta", clear

* Apply exclusion criteria
count
local n_total = r(N)

* First ICU stay only
bysort subject_id (intime_dt): keep if _n == 1
count
local n_first = r(N)

* Age >= 18
keep if age >= 18
count
local n_adult = r(N)

* LOS >= 24 hours
keep if los_icu_hrs >= 24
count
local n_los = r(N)

* Report flowchart
display "Total ICU stays: `n_total'"
display "First ICU stay only: `n_first'"
display "Adults (>=18): `n_adult'"
display "LOS >= 24h: `n_los'"
```

### Table 1: Baseline Characteristics
```stata
* Continuous variables: median (IQR) or mean (SD) by group
bysort treatment: summarize age, detail
bysort treatment: summarize sofa_total, detail

* Categorical variables: n (%)
tab gender treatment, chi2 col
tab diabetes treatment, chi2 col

* Standardized mean difference
gen age_smd = (mean_treated - mean_control) / ///
    sqrt((sd_treated^2 + sd_control^2) / 2)
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Clock parsing fails | Datetime format mismatch | Try `"YMDhms"`, `"DMYhms"`, `"MDYhms"` |
| Negative LOS | Discharge before admission in data | Filter `los > 0`, check data quality |
| Missing lab values dominate | Not all patients have all labs | Use MI or restrict to patients with available data |
| ICD code mismatch | Mixed ICD-9 and ICD-10 | Always filter by `icd_version` |
| SOFA score too high | Outlier lab values not cleaned | Apply physiological plausibility filters |
| `mi estimate` fails | Imputation model too complex | Simplify imputation model, check convergence |
| Datetime precision loss | Using `float` instead of `double` | Always `gen double` for datetime variables |
| Merge fails | `subject_id` vs `hadm_id` vs `stay_id` | Choose correct merge key for each table pair |
