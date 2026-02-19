# Graphics in Stata

## Table of Contents
1. [Twoway Graphs](#twoway-graphs)
2. [Bar, Box, Dot, and Pie Charts](#bar-box-dot-and-pie-charts)
3. [Histograms and Density Plots](#histograms-and-density-plots)
4. [Graph Options (Titles, Axes, Legend)](#graph-options)
5. [Schemes and Styles](#schemes-and-styles)
6. [Graph Combine](#graph-combine)
7. [Coefficient Plots (coefplot)](#coefficient-plots-coefplot)
8. [Binscatter](#binscatter)
9. [Marginsplot](#marginsplot)
10. [Graph Export](#graph-export)
11. [Publication-Quality Examples](#publication-quality-examples)
12. [Color Reference](#color-reference)
13. [Common Errors](#common-errors)

---

## Twoway Graphs

### Scatter Plots
```stata
twoway scatter mpg weight

* Marker customization
twoway scatter mpg weight, ///
    msymbol(square) msize(medium) mcolor(navy%60)

* Marker labels
twoway scatter mpg weight, ///
    mlabel(make) mlabposition(3) mlabsize(vsmall)

* Jitter to reduce overplotting
twoway scatter mpg weight, jitter(5)
```

### Line and Connected Plots
```stata
twoway line gdp year, sort
twoway connected gdp year, sort msymbol(circle) msize(small)
```

### Overlaying Multiple Plot Types
```stata
* Scatter with linear fit and CI
twoway (scatter mpg weight) ///
       (lfitci mpg weight, fcolor(navy%10))

* Groups with different markers
twoway (scatter mpg weight if foreign==0, msymbol(O) mcolor(navy)) ///
       (scatter mpg weight if foreign==1, msymbol(T) mcolor(maroon)), ///
       legend(label(1 "Domestic") label(2 "Foreign"))

* Scatter + linear + quadratic fit
twoway (scatter mpg weight, mcolor(gs10)) ///
       (lfit mpg weight, lcolor(navy)) ///
       (qfit mpg weight, lcolor(cranberry) lpattern(dash))
```

### Area and Range Plots
```stata
* Shaded confidence interval
twoway (rarea upper lower x, fcolor(navy%15) lwidth(none)) ///
       (line yhat x, lcolor(navy) lwidth(medthick))

* Range plots
twoway rcap lower upper x                 // with caps
twoway rspike lower upper x               // spikes only
twoway rbar lower upper x                 // bars
```

### Function Plots
```stata
twoway function y = normalden(x), range(-4 4) lcolor(navy) lwidth(medthick)
twoway (function y = x^2, range(-5 5)) ///
       (function y = x^3, range(-5 5) lpattern(dash))
```

---

## Bar, Box, Dot, and Pie Charts

### graph bar
```stata
graph bar mpg, over(foreign)
graph hbar mpg, over(foreign)               // horizontal
graph bar (count), over(foreign)             // frequencies
graph bar, over(foreign) percent             // percentages

* Bar labels and multiple grouping
graph hbar mpg, over(foreign) over(rep78) ///
    blabel(bar, format(%4.1f))

* Sorted bars
graph hbar (mean) mpg, over(make, sort(1) descending label(labsize(tiny)))
```

### graph box
```stata
graph box mpg, over(foreign)
graph box mpg, over(foreign) noout           // remove outliers
graph box mpg, over(foreign) over(rep78)

* Custom colors
graph box mpg, over(foreign) ///
    box(1, fcolor(navy%50)) box(2, fcolor(maroon%50)) ///
    medtype(line) medline(lwidth(thick) lcolor(red))
```

### graph dot
```stata
graph dot mpg, over(foreign) over(rep78) ///
    marker(1, msymbol(D) mcolor(navy))
```

### graph pie
```stata
graph pie, over(foreign) plabel(_all percent, format(%4.1f))
graph pie mpg weight price, legend(label(1 "MPG") label(2 "Weight") label(3 "Price"))
```

---

## Histograms and Density Plots

```stata
histogram mpg                                // density (default)
histogram mpg, frequency                     // counts
histogram mpg, percent                       // percentages
histogram mpg, bin(15) start(10)             // custom bins

* With normal overlay
histogram mpg, frequency bin(15) normal ///
    fcolor(navy%60) lcolor(navy)

* Discrete variable
histogram rep78, discrete percent addlabel xlabel(1(1)5)

* By group
histogram mpg, by(foreign, cols(1)) frequency bin(10)
```

### Kernel Density
```stata
kdensity mpg
kdensity mpg, bwidth(2) kernel(epanechnikov)

* Overlay two groups
twoway (kdensity mpg if foreign==0, lcolor(navy)) ///
       (kdensity mpg if foreign==1, lcolor(maroon)), ///
       legend(label(1 "Domestic") label(2 "Foreign"))
```

---

## Graph Options

### Titles and Labels
```stata
twoway scatter mpg weight, ///
    title("Main Title", size(medium)) ///
    subtitle("Subtitle") ///
    note("Source: Auto dataset") ///
    xtitle("Weight (pounds)") ///
    ytitle("Mileage (mpg)")
```

### Axis Options
```stata
twoway scatter mpg weight, ///
    xscale(range(1500 5000)) yscale(range(10 40)) ///
    xlabel(2000(1000)5000, format(%9.0fc)) ///
    ylabel(10(5)40, angle(0))

* Log scale
twoway scatter mpg weight, xscale(log) xlabel(2000 3000 4000 5000)

* Multiple y-axes
twoway (scatter mpg weight, yaxis(1)) ///
       (scatter price weight, yaxis(2)), ///
       ytitle("MPG", axis(1)) ytitle("Price", axis(2))
```

### Legend Options
```stata
legend(position(6) rows(1))                  // bottom, one row
legend(ring(0) position(5))                  // inside plot, 5 o'clock
legend(label(1 "Domestic") label(2 "Foreign"))
legend(order(2 "Foreign" 1 "Domestic"))      // reorder
legend(off)                                   // remove
legend(title("Origin"))
```

### Graph Region
```stata
graphregion(color(white))                     // white background
plotregion(color(gs15) margin(medium))
aspectratio(1)                                // square plot
xsize(8) ysize(6)                             // size in inches

* Grid lines
ylabel(, grid gstyle(dot))
xlabel(, grid)
```

---

## Schemes and Styles

```stata
set scheme s2color                            // default color
set scheme s1mono                             // black and white
set scheme economist                          // Economist style
set scheme sj                                 // Stata Journal

* Community schemes (install once)
ssc install blindschemes                      // plotplain, plottig
ssc install schemepack                        // white_tableau, etc.
set scheme plotplain                          // clean, minimal

* Per-graph override
twoway scatter mpg weight, scheme(plotplain)
```

### grstyle for Quick Customization
```stata
ssc install grstyle
ssc install palettes
ssc install colrspace

grstyle init
grstyle set plain
grstyle set color hue, n(5)
grstyle set legend 6, nobox                   // legend position 6, no box
grstyle clear                                 // reset
```

### Scheme Recommendations
| Purpose | Scheme |
|---------|--------|
| B&W journals | `s1mono` or `plotplain` |
| Color online | `sj` or `plotplain` |
| Presentations | `economist` or `white_tableau` |
| Colorblind-safe | `white_cividis` |

---

## Graph Combine

```stata
* Create named graphs (nodraw to suppress display)
twoway scatter mpg weight, name(g1, replace) nodraw
twoway scatter mpg length, name(g2, replace) nodraw
histogram mpg, name(g3, replace) nodraw
graph box mpg, over(foreign) name(g4, replace) nodraw

* Combine 2x2
graph combine g1 g2 g3 g4, rows(2) cols(2) ///
    ycommon xcommon ///
    iscale(0.8) ///
    imargin(small) ///
    title("Combined Figure") ///
    graphregion(color(white))

* Side by side
graph combine g1 g2, rows(1) ycommon

* From saved files
graph save g1 "g1.gph", replace
graph combine "g1.gph" "g2.gph"
```

---

## Coefficient Plots (coefplot)

```stata
ssc install coefplot

* Basic coefficient plot
regress price mpg weight foreign, robust
coefplot, drop(_cons) xline(0, lcolor(red) lpattern(dash))

* Multi-model comparison
eststo clear
eststo m1: quietly regress price mpg, robust
eststo m2: quietly regress price mpg weight, robust
eststo m3: quietly regress price mpg weight foreign, robust

coefplot m1 m2 m3, drop(_cons) ///
    xline(0, lcolor(black) lpattern(dash)) ///
    legend(order(1 "Model 1" 2 "Model 2" 3 "Model 3"))

* Custom labels and styling
coefplot, drop(_cons) ///
    coeflabels(mpg = "Fuel Efficiency" ///
               weight = "Vehicle Weight" ///
               foreign = "Foreign Made") ///
    msymbol(D) msize(medium) mcolor(navy) ///
    ciopts(lwidth(medthick) lcolor(navy)) ///
    xline(0) scheme(plotplain)

* Vertical orientation (good for event studies)
coefplot, drop(_cons) vertical yline(0, lpattern(dash))
```

---

## Binscatter

```stata
ssc install binscatter

* Basic binscatter
binscatter y x

* With controls (residualized)
binscatter y x, controls(z1 z2) absorb(state_id)

* Customization
binscatter y x, nquantiles(20) ///
    linetype(qfit) ///
    xtitle("X Variable") ytitle("Y Variable") ///
    title("Binned Scatter Plot")

* By group
binscatter y x, by(group) ///
    legend(label(1 "Group A") label(2 "Group B"))

* binsreg (newer, with CI)
ssc install binsreg
binsreg y x, dots(0,0) line(3,3) ci(3,3)
```

---

## Marginsplot

```stata
* After a regression with factor variables
regress price c.mpg##i.foreign weight
margins foreign, at(mpg=(15(5)40))
marginsplot, xdimension(mpg) ///
    recast(line) recastci(rarea) ///
    ci1opts(fcolor(navy%15) lwidth(none)) ///
    ci2opts(fcolor(maroon%15) lwidth(none)) ///
    plot1opts(lcolor(navy)) ///
    plot2opts(lcolor(maroon))

* Marginal effects
margins, dydx(mpg) at(mpg=(15(5)40))
marginsplot, yline(0, lpattern(dash))
```

---

## Graph Export

```stata
* Vector formats (best for publications)
graph export "figure1.pdf", replace
graph export "figure1.eps", replace
graph export "figure1.svg", replace

* Raster formats
graph export "figure1.png", width(3000) replace     // high-res
graph export "figure1.png", width(800) replace       // web

* Save Stata format for later editing
graph save "figure1.gph", replace
```

### Export Recommendations
| Use Case | Format | Options |
|----------|--------|---------|
| LaTeX | `.pdf` or `.eps` | -- |
| Word/PPT | `.png` | `width(1920)` |
| Journal submission | `.tif` or `.eps` | `width(3000)` |
| Web | `.png` or `.svg` | `width(800)` |

### Batch Export
```stata
foreach g in g1 g2 g3 g4 {
    graph export "`g'.pdf", name(`g') replace
    graph export "`g'.png", name(`g') width(2400) replace
}
```

---

## Publication-Quality Examples

### Scatter with Fit Line
```stata
set scheme plotplain

twoway (scatter y x, mcolor(navy%40) msize(small)) ///
       (lfit y x, lcolor(cranberry) lwidth(medthick)), ///
    title("Figure 1. Relationship Between X and Y", ///
          size(medium) position(11) justification(left)) ///
    xtitle("X Variable") ytitle("Y Variable") ///
    legend(off) ///
    graphregion(color(white)) ///
    note("N = `=_N'. OLS fit line shown.", size(vsmall) span)
graph export "figure1.pdf", replace
```

### Multi-Panel Event Study
```stata
set scheme plotplain
coefplot, keep(D*) vertical ///
    yline(0, lcolor(gs10) lpattern(solid)) ///
    xline(5.5, lcolor(cranberry) lpattern(dash)) ///
    msymbol(D) msize(small) mcolor(navy) ///
    ciopts(lcolor(navy) lwidth(medium)) ///
    xtitle("Periods Relative to Treatment") ///
    ytitle("Coefficient Estimate") ///
    graphregion(color(white))
graph export "event_study.pdf", replace
```

### Side-by-Side Comparison
```stata
twoway scatter y x if group==1, name(p1, replace) nodraw ///
    title("Group A") mcolor(navy%50)
twoway scatter y x if group==2, name(p2, replace) nodraw ///
    title("Group B") mcolor(maroon%50)
graph combine p1 p2, rows(1) ycommon xcommon ///
    graphregion(color(white))
graph export "comparison.pdf", replace
```

---

## Color Reference

### Named Colors
`navy`, `maroon`, `forest_green`, `dkorange`, `teal`, `cranberry`, `lavender`, `khaki`, `sienna`, `emidblue`, `edkblue`, `eltblue`, `stone`, `sand`

### Grayscale
`gs0` (black) through `gs16` (white). Use `gs4`, `gs8`, `gs12` for three-shade plots.

### Transparency
Add `%` suffix: `navy%50` is 50% transparent navy.

### RGB
`"35 87 137"` -- specify as quoted RGB string.

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Graph is too small | Default size insufficient | Add `xsize(8) ysize(6)` |
| Labels overlap | Too many categories or long labels | Rotate with `angle(45)`, shrink with `labsize(vsmall)` |
| `graph combine` misaligned | Different axis ranges | Add `ycommon xcommon` |
| Legend clutters plot | Too many items | Use `legend(off)`, direct labels, or `rows(1)` |
| PNG is blurry | Low resolution | Use `width(2400)` or higher |
| Colors indistinguishable | Similar hues | Use `plotplain` scheme, add pattern/symbol differences |
| `graph export` fails | Invalid path or format | Check directory exists; use `replace` |
| Scheme not found | Not installed | `ssc install blindschemes` or `ssc install schemepack` |
