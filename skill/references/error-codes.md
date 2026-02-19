# Stata Error Codes Reference

## Table of Contents
1. [Syntax Errors (100-199)](#syntax-errors-100-199)
2. [Data and Variable Errors (100-199 continued)](#data-and-variable-errors)
3. [File and System Errors (600+)](#file-and-system-errors)
4. [Estimation and Convergence Errors](#estimation-and-convergence-errors)
5. [Memory and Resource Errors](#memory-and-resource-errors)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Common Errors](#common-errors-quick-reference)

---

## Syntax Errors (100-199)

### r(100) -- Syntax error
**Cause:** General syntax error in command.
```stata
* Common triggers:
regress y x1 x2,, robust          // double comma
regress y x1 x2 robust            // missing comma before options
gen x = 1 if y = 2                // = instead of ==

* Fix: check commas, parentheses, option placement
regress y x1 x2, robust
gen x = 1 if y == 2
```

### r(101) -- May not use weights
**Cause:** Command does not accept the weight type specified.
```stata
* Fix: check which weight types the command accepts
help command_name    // look at [weight] in syntax
```

### r(102) -- Too few variables specified
**Cause:** Command requires more variables than provided.
```stata
regress y               // needs at least one indepvar
* Fix:
regress y x1
```

### r(103) -- Too many variables specified
**Cause:** Command received more variables than it accepts.
```stata
summarize, detail       // correct for summary stats
```

### r(109) -- Type mismatch
**Cause:** Operation between incompatible types (string vs numeric).
```stata
gen total = str_var + num_var      // string + number
* Fix:
destring str_var, gen(str_num)
gen total = str_num + num_var
```

### r(110) -- Already defined
**Cause:** Attempting to `generate` a variable that already exists.
```stata
gen x = 1
gen x = 2                         // ERROR
* Fix:
replace x = 2                     // modify existing
* or
capture drop x                    // remove then recreate
gen x = 2
```

### r(111) -- Variable not found / not found
**Cause:** Referencing a variable or object that does not exist.
```stata
summarize nonexistent_var          // ERROR
* Fix: check spelling, run describe
describe
```

### r(119) -- by() may not be combined with by prefix
**Cause:** Using both `by:` prefix and `by()` option.
```stata
bysort id: tab x, by(id)          // ERROR
* Fix: use one or the other
bysort id: tab x
```

### r(130) -- Expression too long / invalid expression
**Cause:** Malformed expression or invalid function use.
```stata
gen x = substr(name 1 5)          // missing commas
* Fix:
gen x = substr(name, 1, 5)
```

### r(131) -- Not possible with test
**Cause:** Invalid test specification after estimation.
```stata
* Fix: verify the variables being tested were in the model
```

### r(132) -- Too few/many parentheses or brackets
```stata
gen x = (a + b * (c + d)          // missing closing paren
* Fix:
gen x = (a + b) * (c + d)
```

### r(198) -- Invalid syntax / option not allowed
**Cause:** Catch-all for syntax problems.
```stata
regress y x1, vce(clusters id)    // "clusters" should be "cluster"
* Fix:
regress y x1, vce(cluster id)
```

---

## Data and Variable Errors

### r(2000) -- No observations
**Cause:** All observations excluded by `if`/`in` condition or missing values.
```stata
regress y x1 if group == 99       // no obs with group==99
* Fix:
tab group                          // check what values exist
count if group == 99
```

### r(2001) -- Insufficient observations
**Cause:** Not enough observations for the analysis requested.
```stata
* Happens with too many variables relative to N
* Fix: reduce variables or increase sample
```

### r(459) -- Not sorted
**Cause:** Using `by` without prior `sort`.
```stata
by id: gen n = _n                  // not sorted
* Fix:
bysort id: gen n = _n
* or
sort id
by id: gen n = _n
```

### r(498) -- Various data issues
**Cause:** Multiple possible causes including panel data issues.
```stata
* After xtset: gaps in time variable, duplicates in panel
* Fix:
xtdescribe
duplicates report panelvar timevar
```

### r(451) -- Variable already exists as a different type
**Cause:** Conflicting variable definitions.
```stata
* Fix: drop the old variable first, or use a new name
```

### r(503) -- Matsize too small
**Cause:** Too many right-hand-side variables for current matsize setting.
```stata
* Fix:
set matsize 5000
* or for very large models, use reghdfe
```

---

## File and System Errors

### r(601) -- File not found
**Cause:** Specified file does not exist at the given path.
```stata
use "missing_file.dta", clear
* Fix:
* 1. Check the path
dir "*.dta"
* 2. Use full path
use "/full/path/to/file.dta", clear
* 3. Check working directory
pwd
cd "/correct/directory"
```

### r(602) -- File already exists
**Cause:** Trying to save without `replace`.
```stata
save "output.dta"                  // file exists
* Fix:
save "output.dta", replace
```

### r(603) -- File could not be opened
**Cause:** Permission denied or file locked by another program.
```stata
* Fix:
* 1. Close the file in Excel/other programs
* 2. Check file permissions
* 3. Save to a different location
```

### r(610) -- File not Stata format
**Cause:** Trying to `use` a non-.dta file.
```stata
use "data.csv", clear              // not a .dta file
* Fix:
import delimited "data.csv", clear
```

### r(680) -- Could not determine width
**Cause:** Problem reading fixed-width or Excel file.
```stata
* Fix: specify format explicitly
import excel "data.xlsx", firstrow clear
```

---

## Estimation and Convergence Errors

### r(430) -- Convergence not achieved
**Cause:** Iterative estimation failed to converge.
```stata
logit y x1 x2                     // does not converge
* Fix:
* 1. Increase iterations
logit y x1 x2, iterate(100)
* 2. Simplify the model (remove collinear vars)
* 3. Check for complete/quasi-complete separation
tab y x1
* 4. Try different starting values
logit y x1 x2, from(initial_values)
```

### r(1400) -- Matsize too small for estimation
```stata
* Fix:
set matsize 10000
* or use reghdfe for high-dimensional FE
```

### r(322) -- Singular matrix / Not positive definite
**Cause:** Perfect collinearity among regressors.
```stata
* Fix:
* 1. Check for collinearity
correlate x1 x2 x3
estat vif
* 2. Drop redundant variables
* 3. Check if a variable is constant
tabulate x1
```

### r(480) -- Initial values not feasible
**Cause:** ML estimation cannot evaluate log-likelihood at initial values.
```stata
* Fix: provide better starting values or simplify model
```

---

## Memory and Resource Errors

### r(901) -- Insufficient memory
```stata
* Fix:
set maxvar 10000
set max_memory 16g
clear all
* Or process data in chunks
```

### r(920) -- Variable limit exceeded
```stata
* Fix:
set maxvar 32767                   // Stata MP maximum
* Better: reduce variables, use reshape
```

---

## Error Handling Patterns

### capture + _rc
```stata
capture some_command
if _rc != 0 {
    display as error "Command failed with error code: " _rc
    * Take corrective action
}
```

### Confirm Before Acting
```stata
* Check if variable exists
capture confirm variable myvar
if _rc == 0 {
    summarize myvar
}
else {
    display "Variable myvar not found"
}

* Check if file exists
capture confirm file "data.dta"
if _rc == 0 {
    use "data.dta", clear
}
else {
    display "File not found"
}
```

### Robust Loop Pattern
```stata
foreach var of local varlist {
    capture {
        regress y `var', robust
        estimates store model_`var'
    }
    if _rc != 0 {
        display as text "Skipping `var': error code " _rc
        continue
    }
}
```

---

## Common Errors Quick Reference

| Code | Message | Likely Cause | Quick Fix |
|------|---------|-------------|-----------|
| r(100) | Syntax error | Bad syntax | Check commas, parens, spelling |
| r(109) | Type mismatch | String vs numeric | `destring` or `tostring` |
| r(110) | Already defined | `gen` on existing var | Use `replace` |
| r(111) | Not found | Var/file does not exist | `describe`, check path |
| r(198) | Invalid syntax | Wrong option name | `help command` |
| r(322) | Not positive definite | Perfect collinearity | Drop redundant vars |
| r(430) | No convergence | ML failed | More iterations, simpler model |
| r(459) | Not sorted | `by` without sort | Use `bysort` |
| r(503) | Matsize too small | Too many vars | `set matsize 5000` |
| r(601) | File not found | Wrong path | `pwd`, check path |
| r(602) | Already exists | No `replace` | Add `replace` option |
| r(901) | No memory | Insufficient RAM | `set max_memory`, reduce data |
| r(2000) | No observations | Empty result set | Check `if` conditions |
