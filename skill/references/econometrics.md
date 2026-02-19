# Econometrics in Stata

## Table of Contents
1. [OLS Regression](#ols-regression)
2. [Robust and Clustered Standard Errors](#robust-and-clustered-standard-errors)
3. [Instrumental Variables / 2SLS](#instrumental-variables--2sls)
4. [GMM Estimation](#gmm-estimation)
5. [Panel Data: Fixed and Random Effects](#panel-data-fixed-and-random-effects)
6. [Hausman Test](#hausman-test)
7. [reghdfe: High-Dimensional Fixed Effects](#reghdfe-high-dimensional-fixed-effects)
8. [Wild Bootstrap](#wild-bootstrap)
9. [Post-Estimation Diagnostics](#post-estimation-diagnostics)
10. [Common Errors](#common-errors)

---

## OLS Regression

### Basic Syntax
```stata
regress depvar indepvar1 indepvar2 [if] [in] [weight], [options]
```

### Examples
```stata
sysuse auto, clear

* Simple OLS
regress price mpg weight

* With factor variables
regress price mpg weight i.foreign

* Interactions
regress price c.mpg##i.foreign weight

* Suppress constant
regress price mpg weight, noconstant

* Store and compare models
eststo clear
eststo m1: regress price mpg
eststo m2: regress price mpg weight
eststo m3: regress price mpg weight i.foreign
esttab m1 m2 m3, se r2 star(* 0.10 ** 0.05 *** 0.01)
```

### Post-Estimation
```stata
regress price mpg weight foreign

* Predicted values and residuals
predict yhat, xb
predict resid, residuals

* Hypothesis testing
test mpg = weight               // test equality of coefficients
test mpg weight                  // joint significance
testparm i.foreign              // test all levels of a factor

* Linear combinations
lincom mpg + weight
lincom mpg - weight

* Marginal effects
margins, dydx(*)
margins foreign, at(mpg=(15 20 25 30))
marginsplot
```

---

## Robust and Clustered Standard Errors

### Heteroskedasticity-Robust SE (HC1)
```stata
regress y x1 x2, vce(robust)
* Equivalent shorthand
regress y x1 x2, robust
```

### Clustered SE
```stata
* Cluster at one level
regress y x1 x2, vce(cluster firm_id)

* Two-way clustering (requires reghdfe or ivreg2)
reghdfe y x1 x2, absorb(firm_id year) vce(cluster firm_id year)
```

### HC2/HC3 Standard Errors
```stata
* For small samples, HC2 or HC3 may be preferred
regress y x1 x2, vce(hc2)
regress y x1 x2, vce(hc3)
```

### When to Use What
| Situation | SE Type |
|-----------|---------|
| Heteroskedasticity suspected | `vce(robust)` |
| Panel/grouped data | `vce(cluster group_id)` |
| Few clusters (<30) | Wild bootstrap (`boottest`) |
| Survey data | `pweight` + `vce(robust)` |
| Multi-way dependence | `vce(cluster dim1 dim2)` via `reghdfe` |

---

## Instrumental Variables / 2SLS

### ivregress (Built-in)
```stata
* Syntax: ivregress 2sls depvar exog_vars (endog_var = instruments) [, options]

* Basic 2SLS
ivregress 2sls wage exper (educ = fatheduc motheduc)

* With robust SE
ivregress 2sls wage exper (educ = fatheduc motheduc), vce(robust)

* GMM estimator (efficient with heteroskedasticity)
ivregress gmm wage exper (educ = fatheduc motheduc)

* LIML estimator (less biased with weak instruments)
ivregress liml wage exper (educ = fatheduc motheduc)
```

### First-Stage Diagnostics
```stata
ivregress 2sls wage exper (educ = fatheduc motheduc), first

* After estimation
estat firststage           // F-statistic on excluded instruments
* Rule of thumb: F > 10 for strong instruments (Stock-Yogo)

estat endogenous           // Durbin-Wu-Hausman endogeneity test
* H0: variable is exogenous; reject -> IV is needed

estat overid               // Sargan/Hansen J-test (overidentification)
* H0: instruments are valid; want p > 0.05
```

### ivreg2 (Community Package, More Diagnostics)
```stata
ssc install ivreg2
ssc install ranktest

ivreg2 wage exper (educ = fatheduc motheduc), robust first
* Reports: Kleibergen-Paap rk Wald F, Anderson-Rubin test,
* Stock-Wright S statistic, Hansen J

* With clustering
ivreg2 wage exper (educ = fatheduc motheduc), cluster(state)
```

### IV with High-Dimensional FE
```stata
ssc install ivreghdfe
ivreghdfe wage (educ = fatheduc motheduc) exper, ///
    absorb(state_id year) cluster(state_id)
```

---

## GMM Estimation

### General GMM
```stata
* Syntax: gmm (moment_condition), instruments(varlist) [options]

* Example: method of moments for mean and variance
gmm ((y - {mu}) * (y - {mu}) - {sig2}), ///
    instruments(x1 x2) ///
    winitial(identity) ///
    onestep

* Two-step efficient GMM
gmm ((y - {b1}*x1 - {b2}*x2)), ///
    instruments(z1 z2 z3) ///
    twostep ///
    wmatrix(robust)
```

### Post-Estimation
```stata
estat overid                   // J-test for overidentification
```

### Dynamic Panel GMM (Arellano-Bond / Blundell-Bond)
```stata
* Arellano-Bond (Difference GMM)
xtabond y L(0/1).(x1 x2), vce(robust)

* Blundell-Bond (System GMM)
xtdpdsys y L(0/1).(x1 x2), vce(robust)

* xtabond2 (more flexible, user-written)
ssc install xtabond2
xtabond2 y L.y x1 x2, gmm(L.y, lag(2 4)) iv(x1 x2) robust

* Diagnostics after dynamic panel GMM
estat abond                // AR(1) should be significant, AR(2) not
estat sargan               // Overidentification test (want p > 0.05)
```

---

## Panel Data: Fixed and Random Effects

### Setup
```stata
xtset panelvar timevar
xtdescribe                     // check balance
xtsum y x1 x2                 // between/within decomposition
```

### Fixed Effects (FE)
```stata
xtreg y x1 x2, fe
xtreg y x1 x2, fe vce(robust)
xtreg y x1 x2, fe vce(cluster panelvar)

* With time FE
xtreg y x1 x2 i.year, fe vce(cluster panelvar)
testparm i.year                // joint test of time FE
```

### Random Effects (RE)
```stata
xtreg y x1 x2, re
xtreg y x1 x2, re vce(robust)
xtreg y x1 x2 female, re      // can include time-invariant vars
```

### First Differences
```stata
xtreg y x1 x2, fd vce(robust)
```

### Between Effects
```stata
xtreg y x1 x2, be
```

---

## Hausman Test

### Standard Hausman Test
```stata
quietly xtreg y x1 x2, fe
estimates store fe_model

quietly xtreg y x1 x2, re
estimates store re_model

hausman fe_model re_model
* p < 0.05: reject H0 (RE consistent) -> use FE
* p >= 0.05: fail to reject -> RE is acceptable
```

### Robust Hausman Test (Mundlak Approach)
The standard Hausman test does not work with clustered SE. Use Mundlak:
```stata
* Generate group means of time-varying regressors
bysort id: egen x1_mean = mean(x1)
bysort id: egen x2_mean = mean(x2)

* Include means in RE model
xtreg y x1 x2 x1_mean x2_mean, re vce(cluster id)
test x1_mean x2_mean
* p < 0.05: reject RE -> use FE
```

### Breusch-Pagan LM Test
```stata
xtreg y x1 x2, re
xttest0
* H0: sigma_u^2 = 0 (pooled OLS is fine)
* p < 0.05: panel effects exist -> use panel methods
```

---

## reghdfe: High-Dimensional Fixed Effects

### Installation and Basic Usage
```stata
ssc install reghdfe
ssc install ftools

* One-way FE
reghdfe y x1 x2, absorb(firm_id) vce(cluster firm_id)

* Two-way FE (firm + year)
reghdfe y x1 x2, absorb(firm_id year) vce(cluster firm_id)

* Three-way FE
reghdfe y x1 x2, absorb(worker_id firm_id year) vce(cluster firm_id)
```

### Interacted Fixed Effects
```stata
* Industry-by-year FE
reghdfe y x1, absorb(firm_id industry#year) vce(cluster firm_id)

* Unit-specific linear trends
reghdfe y x1, absorb(firm_id firm_id#c.year) vce(cluster firm_id)
```

### Multi-Way Clustering
```stata
reghdfe y x1 x2, absorb(firm_id year) vce(cluster firm_id year)
```

### Saving Fixed Effects
```stata
reghdfe y x1 x2, absorb(fe_firm=firm_id fe_year=year) vce(cluster firm_id)
summarize fe_firm fe_year
```

### Key Differences from xtreg
| Feature | xtreg, fe | reghdfe |
|---------|-----------|---------|
| Multiple high-dim FE | No | Yes |
| Multi-way clustering | No | Yes |
| Speed (large N) | Slow | Fast |
| Save FE estimates | No | Yes |
| Singleton detection | No | Yes (auto-drops) |

---

## Wild Bootstrap

For inference with few clusters (< 30):
```stata
ssc install boottest

* After any regression
reghdfe y treatment x1 x2, absorb(state year) vce(cluster state)
boottest treatment, cluster(state) boottype(wild) reps(9999) seed(42)

* Webb 6-point distribution (recommended for < 12 clusters)
boottest treatment, cluster(state) boottype(webb) reps(9999)
```

---

## Post-Estimation Diagnostics

### Heteroskedasticity Tests
```stata
regress y x1 x2
estat hettest                  // Breusch-Pagan / Cook-Weisberg
estat imtest                   // White's test (general)
```

### Multicollinearity
```stata
regress y x1 x2 x3
estat vif
* VIF > 10: concern; VIF > 30: serious
```

### Specification Tests
```stata
regress y x1 x2
estat ovtest                   // Ramsey RESET (omitted variables)
linktest                       // specification link test
```

### Residual Diagnostics
```stata
regress y x1 x2
predict resid, residuals
predict yhat, xb

* Normality of residuals
histogram resid, normal
qnorm resid
swilk resid

* Residual plots
rvfplot                        // residuals vs fitted
avplot x1                      // added-variable plot
lvr2plot                       // leverage vs residual-squared
```

### Serial Correlation in Panel Data
```stata
xtset id year
xtreg y x1 x2, fe
xtserial y x1 x2              // Wooldridge test for serial correlation
* H0: no first-order autocorrelation
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `r(111)` | Variable not found | Check spelling, run `describe` |
| `r(198)` | Invalid syntax | Check commas, parentheses, options |
| `r(2000)` | No observations | Check `if` conditions, missing values |
| `r(459)` | Not sorted for merge | Run `sort` or use `bysort` |
| `e(r2)` missing after `xtreg` | Need `e(r2_w)` for within R-sq | Use `e(r2_w)`, `e(r2_b)`, `e(r2_o)` |
| Hausman `chi2<0` | Difference not positive definite | Use `hausman, sigmamore` or Mundlak approach |
| `_merge` mismatch | Unexpected merge results | Always `tab _merge` before dropping |
| FE absorbs variable | Time-invariant var in FE model | Interact with time-varying var or use RE |
| Weak instruments | F-stat < 10 | Find better instruments, use LIML, or Anderson-Rubin CI |
| Too many instruments | Sargan test has no power | Collapse instruments in `xtabond2`, limit lag depth |
