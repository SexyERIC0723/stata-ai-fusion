# Tables and Export in Stata

## Table of Contents
1. [esttab / estout](#esttab--estout)
2. [outreg2](#outreg2)
3. [putexcel](#putexcel)
4. [table and collect Framework (Stata 17+)](#table-and-collect-framework)
5. [putdocx and putpdf](#putdocx-and-putpdf)
6. [Output Formats: LaTeX, Word, CSV](#output-formats)
7. [Common Errors](#common-errors)

---

## esttab / estout

The most widely used package for regression tables.

### Installation
```stata
ssc install estout
```

### Basic Workflow
```stata
* Run and store models
eststo clear
eststo m1: regress price mpg, robust
eststo m2: regress price mpg weight, robust
eststo m3: regress price mpg weight foreign, robust

* Quick screen display
esttab m1 m2 m3

* Export to LaTeX
esttab m1 m2 m3 using "table1.tex", replace ///
    se star(* 0.10 ** 0.05 *** 0.01) ///
    label booktabs ///
    title("Table 1: Determinants of Price") ///
    mtitles("(1)" "(2)" "(3)")
```

### Common Options
```stata
esttab m1 m2 m3 using "table1.tex", replace ///
    b(3)                            /// decimal places for coefficients
    se(3)                           /// decimal places for SE
    star(* 0.10 ** 0.05 *** 0.01)  /// significance stars
    label                           /// use variable labels
    booktabs                        /// LaTeX booktabs format
    nomtitles                       /// suppress model titles
    nonotes                         /// suppress default notes
    addnotes("Note: Robust SE in parentheses.") ///
    keep(mpg weight foreign)        /// select variables to show
    drop(_cons)                     /// drop specific variables
    order(foreign mpg weight)       /// reorder variables
    stats(N r2 r2_a, ///
        labels("Observations" "R-squared" "Adj. R-squared") ///
        fmt(%9.0fc %9.3f %9.3f))   /// summary statistics
    indicate("Year FE = *.year" "State FE = *.state") /// FE indicators
    scalars("F F-statistic")        /// additional scalars
    compress                        /// tighter column spacing
    fragment                        /// no table environment (for include)
```

### Show t-statistics Instead of SE
```stata
esttab m1 m2 m3, t star(* 0.10 ** 0.05 *** 0.01)
```

### Show Confidence Intervals
```stata
esttab m1 m2 m3, ci(95) nostar
```

### Side-by-Side Panels
```stata
* Panel A: OLS
eststo clear
eststo ols1: regress y x1 x2
eststo ols2: regress y x1 x2 x3

* Panel B: IV
eststo iv1: ivregress 2sls y (x1 = z1 z2), robust
eststo iv2: ivregress 2sls y x2 (x1 = z1 z2), robust

esttab ols1 ols2 using "table.tex", replace ///
    title("Panel A: OLS") label booktabs se star(* .1 ** .05 *** .01)
esttab iv1 iv2 using "table.tex", append ///
    title("Panel B: IV") label booktabs se star(* .1 ** .05 *** .01)
```

### Export to Word (.rtf)
```stata
esttab m1 m2 m3 using "table1.rtf", replace ///
    se star(* 0.10 ** 0.05 *** 0.01) ///
    label title("Table 1: Main Results")
```

### Export to CSV
```stata
esttab m1 m2 m3 using "table1.csv", replace ///
    se star(* 0.10 ** 0.05 *** 0.01) ///
    label csv
```

---

## outreg2

Alternative to esttab. Popular for Word/Excel output.

### Installation
```stata
ssc install outreg2
```

### Basic Usage
```stata
regress price mpg, robust
outreg2 using "results.doc", replace ctitle("Model 1")

regress price mpg weight, robust
outreg2 using "results.doc", append ctitle("Model 2")

regress price mpg weight foreign, robust
outreg2 using "results.doc", append ctitle("Model 3")
```

### Common Options
```stata
outreg2 using "results.doc", replace ///
    ctitle("Full Model") ///
    keep(mpg weight foreign) ///
    addtext(Year FE, YES, State FE, YES) ///
    addstat(F-test, e(F), Adj R-sq, e(r2_a)) ///
    label ///
    dec(3) ///
    tdec(2) ///
    alpha(0.01, 0.05, 0.10) ///
    symbol(***, **, *) ///
    title("Table 1: OLS Results") ///
    nocons
```

### Export to Excel
```stata
outreg2 using "results.xls", replace excel dec(3) label
```

### Export to LaTeX
```stata
outreg2 using "results.tex", replace tex(frag) ///
    label dec(3) nocons
```

---

## putexcel

Write individual cells to Excel. Best for custom-formatted tables.

### Basic Workflow
```stata
putexcel set "summary.xlsx", replace sheet("Summary")

* Headers
putexcel A1 = "Variable" B1 = "N" C1 = "Mean" D1 = "SD" E1 = "Min" F1 = "Max"

* Fill with loop
local row = 2
foreach var of varlist income age education {
    quietly summarize `var'
    putexcel A`row' = "`var'"
    putexcel B`row' = r(N)
    putexcel C`row' = r(mean)
    putexcel D`row' = r(sd)
    putexcel E`row' = r(min)
    putexcel F`row' = r(max)
    local ++row
}
```

### Formatting
```stata
putexcel A1:F1, bold border(bottom)
putexcel C2:F100, nformat(#,##0.00)

* Write matrix
matrix results = r(table)
putexcel B2 = matrix(results), names
```

### Regression Results to Excel
```stata
putexcel set "regression.xlsx", replace

regress y x1 x2 x3

* Coefficient table
matrix coef = e(b)'
matrix se = vecdiag(cholesky(diag(vecdiag(e(V)))))'

putexcel A1 = "Variable" B1 = "Coef" C1 = "SE"
putexcel A2 = matrix(coef), rownames
putexcel C2 = matrix(se)
```

---

## table and collect Framework

Stata 17+ introduced a modern table system.

### table Command (Stata 17+)
```stata
* Summary statistics
table foreign, statistic(mean mpg price) ///
    statistic(sd mpg price) ///
    statistic(count mpg) ///
    nformat(%9.2f)

* Two-way table
table foreign rep78, statistic(mean price) ///
    statistic(count price)

* Export
table foreign, statistic(mean mpg price) ///
    statistic(sd mpg price)
collect export "table.xlsx", replace
collect export "table.tex", replace
collect export "table.docx", replace
collect export "table.html", replace
```

### collect Framework
```stata
* Start a collection
collect clear

* Run models and collect results
collect: regress price mpg, robust
collect: regress price mpg weight, robust

* Customize layout
collect layout (colname) (result)
collect style cell, nformat(%9.3f)
collect preview

* Export
collect export "table.tex", replace
```

---

## putdocx and putpdf

### putdocx (Word Documents)
```stata
putdocx begin

* Title
putdocx paragraph, style(Title)
putdocx text ("Analysis Results")

* Run regression
regress price mpg weight foreign, robust

* Add table from estimation
putdocx table tbl1 = etable

* Add text
putdocx paragraph
putdocx text ("The model explains ")
putdocx text ("`=string(e(r2), "%4.1f")'%")
putdocx text (" of the variation in price.")

* Add graph
graph export "temp_figure.png", replace width(1200)
putdocx paragraph, halign(center)
putdocx image "temp_figure.png", width(5)

putdocx save "report.docx", replace
```

### putpdf (PDF Documents)
```stata
putpdf begin

putpdf paragraph, style(Title)
putpdf text ("Statistical Report")

regress price mpg weight foreign
putpdf table tbl1 = etable

putpdf save "report.pdf", replace
```

---

## Output Formats

### LaTeX Best Practices
```stata
esttab m1 m2 m3 using "table.tex", replace ///
    se star(* 0.10 ** 0.05 *** 0.01) ///
    booktabs ///
    label ///
    fragment ///                        // no \begin{table} wrapper
    alignment(lccc) ///
    title("Main Results") ///
    addnotes("Standard errors in parentheses." ///
             "* p < 0.10, ** p < 0.05, *** p < 0.01")
```

### Word Best Practices
```stata
* Option 1: esttab to RTF
esttab m1 m2 m3 using "table.rtf", replace se label

* Option 2: outreg2 to DOC
outreg2 using "table.doc", replace label dec(3)

* Option 3: putdocx for full reports
putdocx begin
putdocx table tbl = etable
putdocx save "report.docx", replace
```

### CSV for Further Processing
```stata
esttab m1 m2 m3 using "table.csv", replace csv se label
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `no estimates found` | Did not run `eststo` before `esttab` | Run `eststo: regress ...` first |
| `estimates store` fails | Name conflict | Use `eststo clear` at start |
| `booktabs` not recognized | Missing LaTeX package | Add `\usepackage{booktabs}` to LaTeX preamble |
| `outreg2` replaces all | Used `replace` instead of `append` | Use `replace` for first model, `append` for rest |
| `putexcel` wrong cell | Row counter off | Debug with `display "row = `row''"` |
| `table` not recognized | Stata version < 17 | Use `tabstat` or upgrade Stata |
| `fragment` crops table | LaTeX needs wrapper | Add `\begin{table}...\end{table}` manually |
| Stars misaligned in LaTeX | Missing `siunitx` or alignment | Use `alignment(S S S)` with `siunitx` package |
| Variable names instead of labels | Forgot `label` option | Add `label` to `esttab` options |
