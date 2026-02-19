# reghdfe: High-Dimensional Fixed Effects Regression

## Installation
```stata
ssc install reghdfe
ssc install ftools

* Optional companions
ssc install ivreghdfe
ssc install ivreg2

* Verify
webuse nlswork, clear
reghdfe ln_wage tenure ttl_exp, absorb(idcode year)
```

## Basic Syntax
```stata
reghdfe depvar indepvars [if] [in] [weight], absorb(absvars) [options]
```

## Common Usage Patterns

### One-Way Fixed Effects
```stata
reghdfe ln_wage tenure ttl_exp, absorb(idcode) vce(cluster idcode)
```

### Two-Way Fixed Effects (Most Common)
```stata
reghdfe ln_wage tenure ttl_exp, absorb(idcode year) vce(cluster idcode)
```

### Three-Way Fixed Effects (AKM-Style)
```stata
reghdfe log_wage experience, absorb(worker_id firm_id year) vce(cluster firm_id)
```

### Interacted Fixed Effects
```stata
* Industry-by-year FE
reghdfe y x1, absorb(firm_id industry#year) vce(cluster firm_id)

* Unit-specific linear trends
reghdfe y x1, absorb(firm_id firm_id#c.year) vce(cluster firm_id)
```

## Standard Errors

### Multi-Way Clustering
```stata
reghdfe y x1 x2, absorb(firm_id year) vce(cluster firm_id)
reghdfe y x1 x2, absorb(firm_id year) vce(cluster firm_id year)
reghdfe y x1 x2, absorb(firm_id) vce(cluster firm_id year state)
```

### Other VCE Options
```stata
reghdfe y x1, absorb(firm_id) vce(robust)
reghdfe y x1, absorb(firm_id) vce(bootstrap, reps(1000))
```

## IV Estimation with ivreghdfe
```stata
ssc install ivreghdfe

ivreghdfe log_wage (education = distance_college) experience, ///
    absorb(state_id year) cluster(state_id)

* First stage diagnostics
ivreghdfe log_wage (education = distance_college) experience, ///
    absorb(state_id year) cluster(state_id) first savefirst
```

## Saving Fixed Effects
```stata
reghdfe y x1 x2, absorb(fe_firm=firm_id fe_year=year) vce(cluster firm_id)
summarize fe_firm fe_year
```

## Post-Estimation
```stata
* Predictions
predict resid, residuals
predict xb, xb
predict xbd, xbd                   // including FEs

* Tests
test x1 = x2
testparm x1 x2 x3

* Model comparison
reghdfe y x1, absorb(firm_id year) vce(cluster firm_id)
estimates store m1
reghdfe y x1 x2 x3, absorb(firm_id year) vce(cluster firm_id)
estimates store m2
estimates table m1 m2, star stats(N r2_within)
```

## Integration with esttab
```stata
eststo clear
eststo: reghdfe y x1, absorb(firm_id) cluster(firm_id)
eststo: reghdfe y x1 x2, absorb(firm_id year) cluster(firm_id)

esttab using "table.tex", replace ///
    se star(* 0.10 ** 0.05 *** 0.01) ///
    label booktabs ///
    stats(N r2_within, labels("N" "Within R-sq"))
```

## Common Pitfalls

1. **Time-invariant variables absorbed**: `reghdfe y female, absorb(worker_id)` -- `female` is collinear with worker FE.
2. **Singleton observations**: Automatically dropped. Check output for count.
3. **Reporting wrong R-squared**: Report `e(r2_within)`, not overall R-squared.
4. **Forgetting to cluster**: Always cluster at the level of treatment assignment.
5. **Too few clusters**: Use `boottest` for inference with < 30 clusters.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `variable absorbed` | Time-invariant var in unit FE | Interact with time-varying var |
| Singletons dropped | Obs uniquely identify an FE group | Expected behavior; report count |
| `ftools` not found | Missing dependency | `ssc install ftools` |
| Slow convergence | Many FE dimensions | Use `accel(cg)`, increase `tol()` |
