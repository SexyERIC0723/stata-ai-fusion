# Data Management in Stata

## Table of Contents
1. [Import and Export](#import-and-export)
2. [Merge](#merge)
3. [Reshape (Wide/Long)](#reshape-widelong)
4. [Collapse](#collapse)
5. [egen: Extended Generate](#egen-extended-generate)
6. [Encode and Decode](#encode-and-decode)
7. [Append](#append)
8. [Preserve and Restore](#preserve-and-restore)
9. [Tempfile and Tempvar](#tempfile-and-tempvar)
10. [Sort, By, and Bysort](#sort-by-and-bysort)
11. [Rename and Label](#rename-and-label)
12. [Drop, Keep, and Duplicates](#drop-keep-and-duplicates)
13. [Destring and Tostring](#destring-and-tostring)
14. [Common Errors](#common-errors)

---

## Import and Export

### CSV / Delimited Files
```stata
* Import
import delimited "data.csv", clear
import delimited "data.csv", clear varnames(1) encoding("utf-8")
import delimited "data.tsv", clear delimiter(tab)
import delimited "data.csv", clear stringcols(3 5)   // force cols as string

* Export
export delimited using "output.csv", replace
export delimited using "output.csv", replace delimiter(",") quote
```

### Excel Files
```stata
* Import
import excel "data.xlsx", clear firstrow
import excel "data.xlsx", clear sheet("Sheet2") cellrange(A1:F100)
import excel "data.xlsx", clear firstrow case(lower)

* Export
export excel using "output.xlsx", replace firstrow(variables)
export excel using "output.xlsx", replace sheet("Results") firstrow(varlabels)
```

### Stata .dta Files
```stata
use "data.dta", clear
use id year income using "data.dta", clear        // load specific vars
use "data.dta" if year >= 2010, clear              // load with condition

save "output.dta", replace
saveold "output_v13.dta", replace version(13)      // backward compatible
```

### Fixed-Width Files
```stata
infix str name 1-20 age 21-23 income 24-30 using "data.txt", clear
```

### SAS/SPSS
```stata
import sas using "data.sas7bdat", clear
import spss using "data.sav", clear
```

---

## Merge

### Merge Types
- `1:1` -- identifier unique in both datasets
- `m:1` -- identifier unique in using dataset only (many master rows match one using row)
- `1:m` -- identifier unique in master dataset only
- `m:m` -- NOT recommended (almost always wrong)

### Basic Merge
```stata
* One-to-one merge
merge 1:1 person_id using "demographics.dta"
tab _merge

* Many-to-one (add group characteristics to individual data)
merge m:1 state_id using "state_data.dta"
tab _merge

* Keep only matched observations
merge 1:1 id using "other.dta", keep(3) nogenerate

* Assert expected results
merge 1:1 id using "other.dta", assert(match) nogenerate

* Keep specific variables from using
merge 1:1 id using "other.dta", keepusing(income age)
```

### Always Verify Before Merging
```stata
* Check uniqueness of merge key
isid id                          // errors if not unique
duplicates report id
duplicates list id if dup > 0

* After merge: always inspect
tab _merge
list if _merge == 1 in 1/10      // master only
list if _merge == 2 in 1/10      // using only
```

### The `_merge` Variable
| Value | Meaning |
|-------|---------|
| 1 | In master only |
| 2 | In using only |
| 3 | Matched (in both) |

### Sequential Merges
```stata
use "master.dta", clear
merge 1:1 id using "file1.dta", nogenerate keep(match master)
merge m:1 state using "file2.dta", nogenerate keep(match master)
merge 1:1 id using "file3.dta", nogenerate keep(match master)
```

---

## Reshape (Wide/Long)

### Wide to Long
```stata
* Data looks like: id income2018 income2019 income2020
reshape long income, i(id) j(year)
* Result: id year income

* Multiple stub variables
* Data: id score_math score_reading score_science
reshape long score_, i(id) j(subject) string

* Multiple variable groups
* Data: id ht1 ht2 ht3 wt1 wt2 wt3
reshape long ht wt, i(id) j(wave)
```

### Long to Wide
```stata
* Data: id year income
reshape wide income, i(id) j(year)
* Result: id income2018 income2019 income2020
```

### Troubleshooting Reshape
```stata
* Check for duplicates before reshaping
duplicates report id year

* Inspect current reshape configuration
reshape error

* Fill in missing combinations (creates balanced panel)
fillin id year
drop _fillin

* Reset reshape memory
reshape clear
```

---

## Collapse

Collapses dataset to group-level statistics. **Destroys original data -- use `preserve` first.**

### Available Statistics
`mean` (default), `sum`, `count`, `median`, `min`, `max`, `sd`, `p1`-`p99`, `firstnm`, `lastnm`, `iqr`

### Examples
```stata
* Simple mean by group
preserve
collapse (mean) avg_income=income, by(state)
list
restore

* Multiple statistics
collapse (mean) avg_wage=wage ///
         (median) med_wage=wage ///
         (sd) sd_wage=wage ///
         (count) n=wage, by(industry)

* Different stats for different variables
collapse (sum) total_pop=population ///
         (mean) avg_income=income ///
         (median) med_age=age, by(county year)

* Weighted collapse
collapse (mean) avg_score=test_score [aweight=enrollment], by(district)

* Aggregate time series
gen month = mofd(date)
format month %tm
collapse (mean) avg_price=price ///
         (firstnm) open=price ///
         (lastnm) close=price, by(stock_id month)
```

### Preserving Labels After Collapse
```stata
local lbl : variable label income
collapse (mean) income, by(region)
label variable income "`lbl'"
```

---

## egen: Extended Generate

### Row-wise Operations
```stata
egen avg_score = rowmean(test1 test2 test3)
egen total_score = rowtotal(test1 test2 test3)
egen total_score_m = rowtotal(test1 test2 test3), missing  // propagate missing
egen max_score = rowmax(test1 test2 test3)
egen min_score = rowmin(test1 test2 test3)
egen num_missing = rowmiss(test1 test2 test3)
egen num_nonmiss = rownonmiss(test1 test2 test3)
```

### Group-wise Operations
```stata
bysort country: egen avg_income = mean(income)
bysort region: egen total_sales = total(sales)
bysort firm: egen n_employees = count(employee_id)
bysort category: egen min_price = min(price)
bysort industry: egen sd_wage = sd(wage)
bysort id (year): egen first_wage = first(wage)
bysort id (year): egen last_wage = last(wage)
```

### Creating Group IDs and Tags
```stata
egen region_id = group(region)
egen state_year_id = group(state year)
egen tag = tag(country)                // tag first obs in each group
```

### Ranking and Percentiles
```stata
egen income_rank = rank(income)
egen p25 = pctile(income), p(25)
egen income_std = std(income)          // z-score
```

---

## Encode and Decode

### encode: String to Labeled Numeric
```stata
encode gender_str, gen(gender)              // alphabetical codes
tab gender, nolabel                          // show numeric codes

* Custom coding order
label define race_lbl 1 "White" 2 "Black" 3 "Asian" 4 "Other"
encode race_str, gen(race) label(race_lbl)
```

### decode: Labeled Numeric to String
```stata
decode gender, gen(gender_str)
```

### Clean Before Encoding
```stata
replace country = strtrim(country)
replace country = proper(country)
replace country = "USA" if inlist(country, "United States", "U.S.A.", "US")
encode country, gen(country_code)
```

---

## Append

Adds observations (rows) from another dataset.

```stata
use "survey_2020.dta", clear
append using "survey_2021.dta" "survey_2022.dta"

* Track source dataset
use "dataset1.dta", clear
gen source = 1
append using "dataset2.dta"
replace source = 2 if missing(source)

* Force when variable types differ
append using "dataset2.dta", force

* Append many files in a loop
clear
tempfile combined
save `combined', emptyok
local files : dir "data/" files "*.dta"
foreach f of local files {
    use "data/`f'", clear
    append using `combined'
    save `combined', replace
}
use `combined', clear
```

---

## Preserve and Restore

Temporarily saves and restores the dataset in memory.

```stata
preserve
collapse (mean) income, by(state)
export delimited using "state_means.csv", replace
restore
* Original data is back

* In loops
foreach year of numlist 2018/2022 {
    preserve
    keep if year == `year'
    summarize income
    restore
}

* Nested preserve/restore
preserve
    drop if missing(outcome)
    preserve
        collapse (mean) outcome, by(group)
        list
    restore
    * Back to non-missing data
restore
* Back to full data
```

---

## Tempfile and Tempvar

### Temporary Files
```stata
tempfile master_data
save `master_data'

use "other_data.dta", clear
* ... process ...
merge 1:1 id using `master_data'
```

### Temporary Variables
```stata
tempvar orig_order
gen `orig_order' = _n
sort age income
* ... operations ...
sort `orig_order'
* Temp variable is automatically cleaned up
```

### Temporary Names (Scalars/Matrices)
```stata
tempname my_mean my_sd
scalar `my_mean' = 42
scalar `my_sd' = 7.5
```

---

## Sort, By, and Bysort

```stata
sort price                           // ascending
gsort -price                         // descending
gsort country -year                  // mixed

* bysort = sort + by
bysort country: summarize gdp
bysort id (year): gen obs_num = _n
bysort id (year): gen first = (_n == 1)
bysort id (year): gen last = (_n == _N)
bysort id (year): gen growth = revenue - revenue[_n-1]
bysort id: gen group_size = _N

* Forward fill missing values
bysort id (date): replace value = value[_n-1] if missing(value)
```

### Special Variables in by-groups
- `_n` -- current observation number within group
- `_N` -- total observations within group

---

## Rename and Label

### Rename
```stata
rename rep78 repair_record
rename (v1 v2 v3) (score1 score2 score3)
rename *, lower                        // all to lowercase
rename * old_*                         // add prefix
rename (*_final) (*_revised)           // pattern replace
```

### Variable Labels
```stata
label variable income "Annual household income (USD)"
```

### Value Labels
```stata
label define yesno 0 "No" 1 "Yes"
label values married yesno
label define gender 3 "Non-binary", modify
label list
label save using "labels.do"
```

---

## Drop, Keep, and Duplicates

```stata
* Drop/keep variables
drop temp_var test*
keep id name age income*

* Drop/keep observations
drop if age < 18
drop if missing(income)
keep if inrange(age, 18, 65)

* Duplicates
duplicates report id year
duplicates tag id year, gen(dup_tag)
duplicates drop id year, force
bysort id year (revenue): keep if _n == _N   // keep highest revenue
```

---

## Destring and Tostring

```stata
* String to numeric
destring income, replace
destring income, replace force         // non-numeric become missing
destring income, gen(income_num)

* Numeric to string
tostring zipcode, replace
tostring zipcode, replace format(%05.0f)   // preserve leading zeros
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `r(111)` in merge | Variable not found in using dataset | Check variable names in both datasets |
| `r(459)` | Variable not sorted | Use `bysort` instead of `by` |
| `type mismatch` in merge | Key is string in one, numeric in other | `tostring` or `destring` one of them |
| `variable already defined` | Using `gen` on existing var | Use `replace` or `drop` first |
| `no observations` after merge | All `_merge != 3` | Check merge keys, inspect `_merge` |
| `reshape` fails | Duplicate i-j combinations | Run `duplicates report i j` first |
| `collapse` destroys data | Forgot to `preserve` | Always `preserve` before `collapse` |
| `egen` wrong result | Missing `bysort` prefix | Use `bysort group: egen ...` |
| `encode` wrong codes | Alphabetical ordering | Pre-define `label define` before `encode` |
| `append` type mismatch | Same var is string in one file, numeric in other | Use `force` option or fix source files |
