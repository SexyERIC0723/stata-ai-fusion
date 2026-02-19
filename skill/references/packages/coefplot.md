# coefplot: Coefficient Visualization

## Installation
```stata
ssc install coefplot, replace

* Recommended companions
ssc install estout
ssc install grstyle
ssc install palettes
ssc install colrspace
```

## Basic Usage

### Single Model
```stata
regress price mpg weight foreign, robust
coefplot, drop(_cons) xline(0, lcolor(red) lpattern(dash))
```

### Multiple Models
```stata
eststo clear
eststo m1: quietly regress price mpg, robust
eststo m2: quietly regress price mpg weight, robust
eststo m3: quietly regress price mpg weight foreign, robust

coefplot m1 m2 m3, drop(_cons) ///
    xline(0, lcolor(black) lpattern(dash)) ///
    legend(order(1 "Model 1" 2 "Model 2" 3 "Model 3"))
```

## Customization

### Markers and CI
```stata
coefplot, drop(_cons) ///
    msymbol(D) msize(medium) mcolor(navy) ///
    ciopts(lwidth(medthick) lcolor(navy)) ///
    levels(95) ///
    xline(0, lcolor(black) lpattern(dash))
```

### Custom Labels
```stata
coefplot, drop(_cons) ///
    coeflabels(mpg = "Fuel Efficiency" ///
               weight = "Vehicle Weight" ///
               foreign = "Foreign Made") ///
    title("Coefficient Estimates")
```

### Vertical Orientation
```stata
coefplot, drop(_cons) vertical yline(0, lpattern(dash))
```

### Multiple CI Levels
```stata
coefplot, drop(_cons) levels(90 95 99) ///
    ciopts1(lwidth(thin) lcolor(gs12)) ///
    ciopts2(lwidth(medium) lcolor(gs6)) ///
    ciopts3(lwidth(thick) lcolor(black))
```

## Event Study Plots
```stata
* After event study regression
reghdfe y D_pre5 D_pre4 D_pre3 D_pre2 D_post0 D_post1 D_post2 D_post3 D_post4 D_post5, ///
    absorb(id year) vce(cluster id)

coefplot, keep(D_*) vertical ///
    yline(0, lcolor(gs10)) ///
    xline(4.5, lcolor(cranberry) lpattern(dash)) ///
    msymbol(D) msize(small) mcolor(navy) ///
    ciopts(lcolor(navy)) ///
    xtitle("Periods Relative to Treatment") ///
    ytitle("Effect") ///
    scheme(plotplain)
```

## Publication-Quality Example
```stata
set scheme plotplain

regress price mpg weight foreign length, robust

coefplot, drop(_cons) ///
    xline(0, lcolor(black) lpattern(dash)) ///
    msymbol(D) msize(medium) mcolor(black) ///
    ciopts(lwidth(medthick) lcolor(black)) ///
    title("Figure 1. Price Determinants", ///
          size(medium) position(11)) ///
    xtitle("Coefficient (USD)", size(small)) ///
    graphregion(color(white)) ///
    note("95% CI shown. Robust SE.", size(vsmall))

graph export "coefplot.pdf", replace
```

## Key Options Quick Reference
| Option | Description |
|--------|-------------|
| `drop(varlist)` | Omit variables |
| `keep(varlist)` | Keep only these variables |
| `xline(#)` | Vertical reference line |
| `vertical` | Vertical orientation |
| `levels(#)` | Confidence level (default 95) |
| `msymbol()` | Marker symbol (O, D, T, S) |
| `mcolor()` | Marker color |
| `ciopts()` | CI styling |
| `coeflabels()` | Custom labels |
| `order()` | Variable order |
| `headings()` | Group headings |
| `nodraw` | Suppress display (for combine) |

## Common Pitfalls

1. **Always `drop(_cons)`** -- the constant clutters the plot and has a different scale.
2. **Always add `xline(0)`** (or `yline(0)` for vertical) for interpretability.
3. **Use `label` or `coeflabels()`** -- raw variable names are not publication-ready.
4. **Use `keep()` with many variables** -- focus on key coefficients.
5. **Wildcard `*.var` drops all factor levels**; `*#*` drops all interactions.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| No estimates found | Did not store estimates | Run `estimates store` first |
| Constant dominates scale | Forgot to drop constant | Add `drop(_cons)` |
| Labels too long | Variable labels overflow | Use shorter `coeflabels()` |
| Graph too crowded | Too many coefficients | Use `keep()` to select key vars |
