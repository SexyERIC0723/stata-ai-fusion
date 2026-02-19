# Survival Analysis in Stata

## Table of Contents
1. [Declaring Survival Data (stset)](#declaring-survival-data-stset)
2. [Descriptive Statistics (stdescribe, stsum)](#descriptive-statistics)
3. [Kaplan-Meier Estimator (sts graph)](#kaplan-meier-estimator)
4. [Log-Rank and Other Tests (sts test)](#log-rank-and-other-tests)
5. [Cox Proportional Hazards (stcox)](#cox-proportional-hazards-stcox)
6. [Testing the PH Assumption (estat phtest)](#testing-the-ph-assumption)
7. [Parametric Survival Models (streg)](#parametric-survival-models-streg)
8. [Competing Risks](#competing-risks)
9. [Time-Varying Covariates](#time-varying-covariates)
10. [Common Errors](#common-errors)

---

## Declaring Survival Data (stset)

All survival commands require `stset` first. Creates special variables: `_t0`, `_t`, `_d`, `_st`.

```stata
* Basic setup
stset time_var, failure(event_var)

* Specific failure value
stset time, failure(status == 1)

* Scale time units (days to years)
stset time_days, failure(event) scale(365.25)

* Multiple records per subject
stset time, failure(event) id(patient_id)

* Delayed entry (left truncation)
stset exit_time, failure(died) enter(entry_time) origin(time birth_date)

* Suppress stset banner
stset time, failure(died) noshow
```

### stset Options Quick Reference
| Option | Purpose |
|--------|---------|
| `failure(var)` | Failure indicator |
| `failure(var == k)` | Specific failure value |
| `id(var)` | Subject ID (multi-record data) |
| `enter(time t0)` | Delayed entry |
| `origin(time date)` | Origin of time scale |
| `scale(#)` | Scale time (e.g., 365.25) |
| `noshow` | Suppress banner |

---

## Descriptive Statistics

```stata
stset time, failure(event)

* Describe survival data structure
stdescribe

* Summary statistics (median survival, etc.)
stsum
stsum, by(treatment)

* Median survival with CI
stci
stci, by(treatment)
stci, p(25)                       // 25th percentile
stci, p(75)                       // 75th percentile
```

---

## Kaplan-Meier Estimator

### Survival Curves (sts graph)
```stata
* Basic survival curve
sts graph

* By group
sts graph, by(treatment)

* Customized with risk table
sts graph, by(treatment) ///
    title("Survival by Treatment Group") ///
    xtitle("Time (months)") ytitle("Survival Probability") ///
    legend(label(1 "Control") label(2 "Treatment")) ///
    risktable ///
    scheme(plotplain)

* Cumulative hazard
sts graph, cumhaz by(treatment)

* Smoothed hazard function
sts graph, hazard by(treatment) kernel(epan2)
```

### Survival Tables
```stata
sts list                                    // full table
sts list, at(0 100 200 300 400 500)        // at specific times
sts list, by(treatment) ci                  // by group with CI
sts list, failure                           // failure probability
```

---

## Log-Rank and Other Tests

Compare survival curves between groups. H0: survival functions are equal.

```stata
sts test treatment                           // log-rank (default)
sts test treatment, wilcoxon                 // Wilcoxon (early events)
sts test treatment, tware                    // Tarone-Ware
sts test treatment, peto                     // Peto-Peto
sts test treatment, fh(1 0)                 // Fleming-Harrington (early)
sts test treatment, fh(0 1)                 // Fleming-Harrington (late)
sts test treatment, strata(age_group)        // stratified log-rank
sts test dose, trend                         // trend for ordered groups
```

### Which Test to Use
| Test | Best When |
|------|-----------|
| Log-rank | Hazards are proportional |
| Wilcoxon | More sensitive to early differences |
| Fleming-Harrington | Custom weighting via `fh(p q)` |
| Stratified | Adjusting for a confounding variable |

---

## Cox Proportional Hazards (stcox)

Semi-parametric: h(t|X) = h0(t) * exp(b1*X1 + b2*X2 + ...)

```stata
* Basic model
stcox treatment age

* Factor notation
stcox i.treatment age i.stage

* Interactions
stcox i.treatment##c.age

* Standard errors
stcox treatment age, vce(robust)
stcox treatment age, vce(cluster hospital_id)

* Display options
stcox treatment age                         // hazard ratios (default)
stcox treatment age, nohr                   // raw coefficients
```

### Interpreting Hazard Ratios
| HR | Interpretation |
|----|---------------|
| 1.0 | No effect |
| 1.5 | 50% increase in hazard |
| 2.0 | Doubled hazard |
| 0.5 | 50% decrease in hazard |
| 0.25 | 75% decrease in hazard |

Formula: % change = (HR - 1) x 100

### Stratified Cox Model
When PH assumption is violated for a variable, stratify instead of adjusting:
```stata
stcox treatment age, strata(hospital)
```

### Predictions
```stata
stcox treatment age

* Predicted curves
stcurve, survival at1(treatment=0 age=50) at2(treatment=1 age=50)
stcurve, cumhaz at1(treatment=0) at2(treatment=1)

* Individual-level
predict xb, xb
predict hr, hr
predict basesurv, basesurv
```

---

## Testing the PH Assumption

### Schoenfeld Residuals Test
```stata
stcox treatment age
estat phtest                                 // global test
estat phtest, detail                         // per-variable

* p > 0.05 -> PH assumption reasonable
* p < 0.05 -> PH may be violated for that variable

* Plot residuals against time
estat phtest, plot(treatment)
```

### Graphical Assessment
```stata
* Log-log plots (should be parallel if PH holds)
stphplot, by(treatment)

* Observed KM vs Cox-predicted
stcox treatment age
stcurve, survival at1(treatment=0) at2(treatment=1)
```

### If PH Is Violated
```stata
* Option 1: Stratify
stcox age, strata(treatment)

* Option 2: Time-varying coefficient
stcox treatment age, tvc(treatment) texp(_t)

* Option 3: Use parametric model
streg treatment age, distribution(weibull)
```

---

## Parametric Survival Models (streg)

### Available Distributions
```stata
streg x1 x2, distribution(exponential)       // constant hazard
streg x1 x2, distribution(weibull)           // monotone hazard
streg x1 x2, distribution(gompertz)          // exponentially changing
streg x1 x2, distribution(lognormal)         // non-monotone (AFT only)
streg x1 x2, distribution(loglogistic)       // non-monotone (AFT only)
streg x1 x2, distribution(ggamma)            // generalized gamma
```

### PH vs AFT Metric
```stata
* Hazard ratios (PH metric)
streg treatment age, distribution(weibull)

* Time ratios (AFT metric)
streg treatment age, distribution(weibull) time

* Raw coefficients
streg treatment age, distribution(weibull) nohr
```

### Model Comparison
```stata
streg x1 x2, distribution(exponential)
estimates store m_exp
streg x1 x2, distribution(weibull)
estimates store m_weib
streg x1 x2, distribution(lognormal)
estimates store m_lnorm

* AIC/BIC comparison (lower = better)
estimates stats m_exp m_weib m_lnorm
```

### Frailty Models (Random Effects)
```stata
streg treatment age, distribution(weibull) frailty(gamma) shared(hospital_id)
```

---

## Competing Risks

When multiple event types can occur (e.g., death from cancer vs. other causes).

### Cumulative Incidence Function
```stata
* failure_type: 1=relapse, 2=death, 0=censored
stset time, failure(failure_type == 1)
stcompet CIF_relapse = ci, compet1(2)
```

### Fine-Gray Subdistribution Hazards
```stata
stset time, failure(failure_type == 1)
stcrreg i.treatment age, compete(failure_type == 2)
```

### CIF Predictions
```stata
stcrreg i.treatment age, compete(failure_type == 2)
stcurve, cif at1(treatment=0 age=50) at2(treatment=1 age=50)
```

---

## Time-Varying Covariates

### Using stsplit
```stata
stset time, failure(event) id(patient_id)

* Split at specific times
stsplit period, at(0 30 90 180 365)

* Create time-varying covariate
gen current_age = baseline_age + _t / 365.25
```

### Built-in tvc() Option
```stata
stcox treatment age, tvc(treatment) texp(_t)
* treatment: HR at time 0
* tvc coefficient: change in log-HR per unit time
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `data not st` | Forgot to run `stset` | Run `stset time, failure(event)` |
| `not sorted` | Multiple records not sorted | Include `id()` in `stset` |
| `negative time` | Time variable has negative values | Check and fix time variable |
| PH test rejects | PH assumption violated | Stratify, use tvc(), or parametric model |
| `no failures` | No events in subset | Check `failure()` coding, inspect `_d` |
| KM curve flat | Very few events | Increase sample or widen time window |
| `stcrreg` wrong setup | Competing event not properly specified | Double-check `compete()` values |
| `streg` no convergence | Complex model or bad data | Simplify model, check for collinearity |
