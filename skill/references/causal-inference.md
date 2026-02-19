# Causal Inference in Stata

## Table of Contents
1. [Difference-in-Differences (DID)](#difference-in-differences-did)
2. [Event Study Designs](#event-study-designs)
3. [Regression Discontinuity Design (RDD)](#regression-discontinuity-design-rdd)
4. [Synthetic Control Method](#synthetic-control-method)
5. [Matching and Propensity Score Methods](#matching-and-propensity-score-methods)
6. [Inverse Probability of Treatment Weighting (IPTW)](#inverse-probability-of-treatment-weighting-iptw)
7. [teffects: Built-in Treatment Effects](#teffects-built-in-treatment-effects)
8. [Common Errors](#common-errors)

---

## Difference-in-Differences (DID)

### Classic 2x2 DID
```stata
* Setup: treated (0/1), post (0/1)
gen post = (year >= treatment_year)
gen treat_post = treated * post

* Basic DID regression
regress y treated post treat_post, vce(cluster state_id)

* Equivalent using factor notation
regress y i.treated##i.post, vce(cluster state_id)
* The coefficient on 1.treated#1.post is the DID estimate

* With controls
regress y i.treated##i.post x1 x2, vce(cluster state_id)
```

### Two-Way Fixed Effects (TWFE) DID
```stata
* With unit and time fixed effects
reghdfe y treat_post, absorb(unit_id year) vce(cluster unit_id)

* Equivalent with xtreg
xtset unit_id year
xtreg y treat_post i.year, fe vce(cluster unit_id)
```

### Parallel Trends Test
```stata
* Visual test: plot pre-treatment trends by group
preserve
collapse (mean) y, by(year treated)
twoway (connected y year if treated==0, msymbol(O) lcolor(navy)) ///
       (connected y year if treated==1, msymbol(T) lcolor(maroon)), ///
       xline(2010, lpattern(dash)) ///
       legend(label(1 "Control") label(2 "Treated")) ///
       title("Parallel Trends Check")
restore

* Statistical test: interact group with pre-treatment time
gen time_to_treat = year - treatment_year
forvalues t = -5/-2 {
    gen pre`=abs(`t')' = (time_to_treat == `t') * treated
}
reghdfe y pre*, absorb(unit_id year) vce(cluster unit_id)
testparm pre*
```

### Staggered DID: Modern Methods

**Problem:** Standard TWFE is biased with staggered treatment timing.

#### Callaway-Sant'Anna (csdid)
```stata
ssc install csdid
ssc install drdid

* gvar = first treatment period (0 or missing for never-treated)
csdid y x1 x2, ivar(id) time(year) gvar(first_treat) method(dripw)

* Aggregate to event-time
csdid y, ivar(id) time(year) gvar(first_treat) agg(event)
csdid_plot, title("Event Study (CS)")
csdid_plot, group(.)    // by cohort
```

#### de Chaisemartin-D'Haultfoeuille (did_multiplegt)
```stata
ssc install did_multiplegt

did_multiplegt y unit_id year treatment, ///
    robust_dynamic dynamic(5) placebo(5) ///
    breps(100) cluster(state_id)
```

#### Borusyak-Jaravel-Spiess (did_imputation)
```stata
ssc install did_imputation

did_imputation y unit_id year first_treat, ///
    horizons(0/5) pretrend(5) minn(0)
event_plot, default_look
```

#### Sun-Abraham (eventstudyinteract)
```stata
ssc install eventstudyinteract
ssc install avar

* Generate relative time indicators
forvalues t = -5/5 {
    gen rel_`=`t'+100' = (year - first_treat == `t')
}

eventstudyinteract y rel_95 rel_96 rel_97 rel_98 ///
    rel_100 rel_101 rel_102 rel_103 rel_104 rel_105, ///
    cohort(first_treat) control_cohort(never_treated) ///
    absorb(unit_id year) vce(cluster state_id)
```

### Bacon Decomposition
```stata
ssc install bacondecomp

bacondecomp y treatment, ddetail
* Shows which 2x2 DID comparisons compose the TWFE estimate
```

---

## Event Study Designs

### Manual Event Study
```stata
* Create relative-time indicators
gen rel_time = year - treatment_year

* Generate dummies (omit -1 as reference)
forvalues k = -5/-2 {
    gen D_pre`=abs(`k')' = (rel_time == `k')
}
forvalues k = 0/5 {
    gen D_post`k' = (rel_time == `k')
}
gen D_post5plus = (rel_time >= 5) & !missing(rel_time)

* Regression
reghdfe y D_pre* D_post*, absorb(unit_id year) vce(cluster unit_id)

* Plot
coefplot, keep(D_*) vertical ///
    yline(0, lcolor(gs10)) ///
    xline(4.5, lcolor(cranberry) lpattern(dash)) ///
    xtitle("Periods Relative to Treatment") ///
    ytitle("Effect Estimate") ///
    coeflabels(D_pre5 = "-5" D_pre4 = "-4" D_pre3 = "-3" ///
               D_pre2 = "-2" D_post0 = "0" D_post1 = "1" ///
               D_post2 = "2" D_post3 = "3" D_post4 = "4" ///
               D_post5plus = "5+") ///
    scheme(plotplain)
```

### eventdd Package
```stata
ssc install eventdd

eventdd y x1 x2, timevar(rel_time) ///
    method(hdfe, absorb(unit_id year)) ///
    cluster(unit_id) ///
    leads(5) lags(5) ///
    graph_op(ytitle("Effect") xtitle("Event Time"))
```

---

## Regression Discontinuity Design (RDD)

### Sharp RDD
```stata
ssc install rdrobust
ssc install rddensity

* Inspect: plot around cutoff
rdplot y running_var, c(0) p(4) ///
    graph_options(title("RD Plot") ///
    xtitle("Running Variable") ytitle("Outcome"))

* Main estimation (local polynomial)
rdrobust y running_var, c(0)

* With covariates
rdrobust y running_var, c(0) covs(x1 x2)

* Bandwidth selection
rdbwselect y running_var, c(0)
* Methods: mserd (default), msetwo, cerrd, certwo

* Manual with optimal bandwidth
rdrobust y running_var, c(0) h(5.2) b(8.1)

* Kernel choice
rdrobust y running_var, c(0) kernel(triangular)   // default
rdrobust y running_var, c(0) kernel(epanechnikov)
rdrobust y running_var, c(0) kernel(uniform)
```

### Fuzzy RDD
```stata
* Treatment is not deterministic at cutoff
rdrobust y running_var, c(0) fuzzy(treatment_var)
* This is essentially a local IV/Wald estimator
```

### Manipulation Test
```stata
* McCrary / Cattaneo-Jansson-Ma density test
rddensity running_var, c(0)
rddensity running_var, c(0) plot
* H0: density is continuous at cutoff
* Rejection suggests manipulation of running variable
```

### Covariate Balance at Cutoff
```stata
foreach var of varlist x1 x2 x3 {
    rdrobust `var' running_var, c(0)
}
* Significant effects suggest covariates jump at cutoff (problematic)
```

---

## Synthetic Control Method

### Basic Synthetic Control
```stata
ssc install synth

* Setup: panel data, one treated unit
tsset unit_id year

* Estimate
synth outcome predictor1 predictor2 ///
    predictor3 ///
    outcome(2000) outcome(2001) outcome(2002), ///
    trunit(1) trperiod(2003) ///
    figure ///
    resultsperiod(1995(1)2010)

* Alternative: specify predictor periods
synth outcome ///
    predictor1(1995(1)2002) ///
    predictor2(1995(1)2002) ///
    outcome(1998) outcome(2000) outcome(2002), ///
    trunit(1) trperiod(2003)
```

### synth_runner (Inference)
```stata
ssc install synth_runner

synth_runner outcome predictor1 predictor2, ///
    trunit(1) trperiod(2003) ///
    gen_vars ///
    mspeperiod(1995(1)2002)

* Permutation-based inference (placebo tests)
effect_graphs
pval_graphs
single_treatment_graphs
```

### Key Diagnostics
```stata
* Pre-treatment fit: RMSPE should be small
* Post/pre RMSPE ratio: large ratio means effect unlikely due to chance
* Placebo tests: run synth for each control unit
* Donor pool weights: check no single unit dominates
```

---

## Matching and Propensity Score Methods

### Propensity Score Estimation
```stata
* Estimate propensity score
logit treatment x1 x2 x3 x4
predict pscore, pr

* Check common support
twoway (kdensity pscore if treatment==1, lcolor(navy)) ///
       (kdensity pscore if treatment==0, lcolor(maroon)), ///
       legend(label(1 "Treated") label(2 "Control")) ///
       title("Propensity Score Distribution")
```

### psmatch2 (Nearest Neighbor Matching)
```stata
ssc install psmatch2

* 1:1 nearest neighbor with caliper
psmatch2 treatment x1 x2 x3, outcome(y) n(1) caliper(0.05) common

* Check balance
pstest x1 x2 x3, both

* ATT is stored in r(att)
display "ATT = " r(att)
display "SE  = " r(seatt)
```

### Kernel Matching
```stata
psmatch2 treatment x1 x2 x3, outcome(y) kernel kerneltype(epan) bwidth(0.05)
```

### Coarsened Exact Matching
```stata
ssc install cem
cem x1 (#5) x2 (#3) x3, treatment(treatment)
regress y treatment x1 x2 x3 [iweight=cem_weights]
```

### Mahalanobis Distance Matching
```stata
teffects nnmatch (y x1 x2 x3) (treatment), ///
    metric(mahalanobis) nneighbor(3)
```

---

## Inverse Probability of Treatment Weighting (IPTW)

### Manual IPTW
```stata
* Step 1: Estimate propensity score
logit treatment x1 x2 x3
predict pscore, pr

* Step 2: Calculate weights
gen ipw = treatment / pscore + (1 - treatment) / (1 - pscore)

* Step 3: Trimming extreme weights
summarize ipw, detail
replace ipw = . if ipw > 10    // trim extreme weights

* Step 4: Weighted regression
regress y treatment [pweight=ipw], vce(robust)
```

### Stabilized IPTW
```stata
* More stable weights
summarize treatment
local p_treat = r(mean)
gen sipw = treatment * `p_treat' / pscore + ///
           (1 - treatment) * (1 - `p_treat') / (1 - pscore)
regress y treatment [pweight=sipw], vce(robust)
```

### IPTW via teffects
```stata
* Automated (preferred)
teffects ipw (y) (treatment x1 x2 x3), ate
teffects ipw (y) (treatment x1 x2 x3), atet
teffects ipw (y) (treatment x1 x2 x3), pomeans

* Diagnostics
tebalance summarize
tebalance density x1              // check balance
tebalance overid                  // overidentification test
```

---

## teffects: Built-in Treatment Effects

Stata's built-in `teffects` provides a unified framework.

### Available Estimators
```stata
* Regression adjustment (RA)
teffects ra (y x1 x2) (treatment), ate

* Inverse probability weighting (IPW)
teffects ipw (y) (treatment x1 x2), ate

* IPW with regression adjustment (IPWRA) -- doubly robust
teffects ipwra (y x1 x2) (treatment x1 x2), ate

* Augmented IPW (AIPW) -- doubly robust
teffects aipw (y x1 x2) (treatment x1 x2), ate

* Nearest-neighbor matching
teffects nnmatch (y x1 x2) (treatment), nneighbor(3) metric(mahalanobis)

* Propensity-score matching
teffects psmatch (y) (treatment x1 x2), nneighbor(1)
```

### Treatment Effect Types
| Option | Meaning |
|--------|---------|
| `ate` | Average Treatment Effect (default) |
| `atet` | ATE on the Treated |
| `pomeans` | Potential Outcome Means |

### Post-Estimation
```stata
teffects ipwra (y x1 x2) (treatment x1 x2), ate

* Balance diagnostics
tebalance summarize
tebalance density x1
tebalance box x1

* Overlap assumption
teffects overlap
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| TWFE bias with staggered timing | Negative weights on some 2x2 comparisons | Use `csdid`, `did_multiplegt`, or `did_imputation` |
| Pre-trends fail | Treatment and control diverge pre-treatment | DID assumptions violated; consider alternative design |
| No common support | Propensity score distributions do not overlap | Trim sample, use `common` option, re-specify model |
| RD bandwidth too narrow | Too few observations around cutoff | Use `rdbwselect` for optimal bandwidth |
| Extreme IPW weights | Near-zero propensity scores | Trim weights, use stabilized weights, or AIPW |
| `synth` fails to converge | Donor pool too large or predictors poorly chosen | Reduce donors, simplify predictor set |
| `csdid` group variable wrong | Must be first treatment period (0 for never-treated) | Recode: `gen g = cond(ever_treated, first_treat_year, 0)` |
| `rdrobust` wrong cutoff | Default cutoff is 0 | Always specify `c(value)` explicitly |
| Matching without replacement | Biased if control pool is small | Use `with replacement` or increase caliper |
| DID with individual-level treatment | Unit of clustering mismatch | Cluster at treatment-assignment level |
