/*==============================================================================
  Example: Basic OLS Regression with stata-ai-fusion
==============================================================================*/

clear all
set more off

* Load sample data
sysuse auto, clear

* Examine data
describe, short
summarize price mpg weight

* Run regression
regress price mpg weight, robust

* Display results
display "R-squared: " e(r2)
display "N: " e(N)
