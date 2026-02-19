# Defensive Coding in Stata

## Table of Contents
1. [assert](#assert)
2. [confirm](#confirm)
3. [capture and Error Handling](#capture-and-error-handling)
4. [isid: Uniqueness Checks](#isid-uniqueness-checks)
5. [Tempfile, Tempvar, Tempname](#tempfile-tempvar-tempname)
6. [Version Declaration](#version-declaration)
7. [Log Management](#log-management)
8. [Data Validation Patterns](#data-validation-patterns)
9. [Common Errors](#common-errors)

---

## assert

Halts execution if condition is false. Use to verify data assumptions.

```stata
* Verify no missing values
assert !missing(id)
assert !missing(outcome)

* Verify value ranges
assert age >= 0 & age <= 120 if !missing(age)
assert income >= 0 if !missing(income)

* Verify uniqueness
isid patient_id

* Verify merge results
merge 1:1 id using "other.dta"
assert _merge == 3
drop _merge

* Verify observation count
count
assert r(N) > 0
assert r(N) == 10000

* Verify no duplicates
duplicates report id year
assert r(unique_value) == r(N)
```

---

## confirm

Checks existence of variables, files, or types without modifying anything.

```stata
* Check variable exists
confirm variable income
confirm numeric variable age
confirm string variable name

* Check file exists
confirm file "data.dta"
confirm file "$datadir/raw_data.csv"

* Check number
confirm number 42
confirm integer number 42

* Use with capture for conditional logic
capture confirm variable treatment
if _rc == 0 {
    display "Variable 'treatment' found"
}
else {
    display "Variable 'treatment' not found -- creating it"
    gen treatment = 0
}

* Check new variable name is available
capture confirm new variable result
if _rc == 0 {
    gen result = .
}
else {
    display "Variable 'result' already exists"
}
```

---

## capture and Error Handling

### Basic capture
```stata
* Suppress error and check return code
capture drop temp_var           // no error if temp_var doesn't exist

* Check _rc (return code): 0 = success, nonzero = error
capture some_command
if _rc != 0 {
    display as error "Command failed with code: " _rc
    exit _rc                    // re-raise the error
}
```

### capture with Blocks
```stata
capture {
    use "file1.dta", clear
    merge 1:1 id using "file2.dta"
    assert _merge == 3
}
if _rc != 0 {
    display as error "Data preparation failed"
    exit _rc
}
```

### Robust Loop Pattern
```stata
local failures = 0
foreach var of varlist x1 x2 x3 x4 x5 {
    capture {
        regress y `var', robust
        estimates store model_`var'
    }
    if _rc != 0 {
        display as text "WARNING: Model for `var' failed (rc=" _rc ")"
        local ++failures
        continue
    }
}
display "`failures' model(s) failed out of 5"
```

### noisily Inside capture
```stata
capture noisily {
    * Show output but still capture errors
    regress y x1 x2 x3
}
if _rc != 0 {
    display as error "Regression failed"
}
```

---

## isid: Uniqueness Checks

Verifies that variables uniquely identify observations.

```stata
* Basic uniqueness check (errors if not unique)
isid patient_id
isid firm_id year

* Allow missing values
isid patient_id, missok

* Sort and check (isid does not sort)
isid id, sort

* Before merge: verify keys
isid id                              // master dataset
use "using_data.dta", clear
isid id                              // using dataset

* Programmatic check
capture isid id year
if _rc != 0 {
    display as error "Duplicate id-year combinations found"
    duplicates list id year
    exit 459
}
```

---

## Tempfile, Tempvar, Tempname

### tempfile: Temporary Datasets
```stata
* Save current data temporarily
tempfile current_data
save `current_data'

* Process another dataset
use "other.dta", clear
* ... work ...

* Merge back
merge 1:1 id using `current_data'
* tempfile is automatically deleted when do-file ends
```

### tempvar: Temporary Variables
```stata
* Preserve original sort order
tempvar orig_order
gen `orig_order' = _n
sort group_var
* ... operations that require sorting ...
sort `orig_order'

* Intermediate calculations
tempvar mean_income
egen `mean_income' = mean(income), by(group)
gen income_demeaned = income - `mean_income'
* `mean_income' is automatically dropped
```

### tempname: Temporary Scalars and Matrices
```stata
tempname my_mean my_matrix
scalar `my_mean' = 42.5
matrix `my_matrix' = (1, 2 \ 3, 4)
display `my_mean'
matrix list `my_matrix'
```

### Multi-File Workflow
```stata
* Combine many files using tempfiles
tempfile combined
clear
save `combined', emptyok

local files : dir "raw/" files "*.csv"
foreach f of local files {
    import delimited "raw/`f'", clear
    append using `combined'
    save `combined', replace
}
use `combined', clear
```

---

## Version Declaration

Always declare the Stata version at the top of every do-file.

```stata
version 17                        // or version 16, version 15, etc.
```

**Why:**
- Ensures code runs identically across Stata updates
- Prevents breaking changes from affecting your results
- Required for reproducibility

### Do-File Preamble Template
```stata
version 17
clear all
set more off
set maxvar 10000

* Set seed for reproducibility
set seed 12345
```

---

## Log Management

### Basic Log Usage
```stata
log using "output/analysis_log.txt", replace text
* ... all output is captured ...
log close

* Stata Markup and Control Language format
log using "output/analysis_log.smcl", replace
```

### Named Logs
```stata
log using "log1.txt", replace text name(main_log)
log using "log2.txt", replace text name(detail_log)

* Temporarily suspend
log off main_log
* ... commands not logged ...
log on main_log

log close main_log
log close detail_log
```

### Timestamped Logs
```stata
local today = string(date(c(current_date), "DMY"), "%tdCCYY-NN-DD")
local now = subinstr(c(current_time), ":", "", .)
log using "output/logs/analysis_`today'_`now'.txt", replace text
```

### Conditional Logging
```stata
capture log close _all              // close any open logs
log using "analysis.txt", replace text

* ... analysis ...

log close
```

---

## Data Validation Patterns

### Pre-Analysis Checklist
```stata
program define validate_dataset
    syntax , Required(varlist) [Positive(varlist) Unique(varlist)]

    local errors = 0

    * Check required variables exist
    foreach var of local required {
        capture confirm variable `var'
        if _rc {
            display as error "MISSING: Required variable `var' not found"
            local ++errors
        }
    }

    * Check positive values
    if "`positive'" != "" {
        foreach var of local positive {
            count if `var' < 0 & !missing(`var')
            if r(N) > 0 {
                display as error "INVALID: `var' has " r(N) " negative values"
                local ++errors
            }
        }
    }

    * Check uniqueness
    if "`unique'" != "" {
        capture isid `unique'
        if _rc {
            display as error "NOT UNIQUE: `unique'"
            local ++errors
        }
    }

    if `errors' > 0 {
        display as error "`errors' validation error(s) found"
        exit 9
    }
    else {
        display as result "All validation checks passed"
    }
end

* Usage
validate_dataset, required(id year outcome) positive(age income) unique(id year)
```

### Post-Merge Validation
```stata
merge 1:1 id using "other.dta"
tab _merge

* Strict: all must match
assert _merge == 3

* Permissive: log mismatches
count if _merge == 1
local master_only = r(N)
count if _merge == 2
local using_only = r(N)
display "Master only: `master_only' | Using only: `using_only'"
keep if _merge == 3
drop _merge
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `assert` fails silently | Condition is trivially true on empty data | Check `_N > 0` first |
| `isid` on unsorted data | `isid` does not require sorting but errors on duplicates | Fix duplicates first |
| `capture` hides real bugs | Over-using capture suppresses meaningful errors | Only capture expected failures |
| Log file locked | Previous log not closed | Run `capture log close _all` |
| Tempfile lost | Used outside the creating do-file | Tempfiles are scoped; pass data via `save`/`use` |
| Version mismatch | Code uses features from newer Stata | Declare `version` matching oldest target |
