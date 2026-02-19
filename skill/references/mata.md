# Mata Programming in Stata

## Table of Contents
1. [Mata Basics](#mata-basics)
2. [Data Types](#data-types)
3. [Matrix Operations](#matrix-operations)
4. [Interaction with Stata Data](#interaction-with-stata-data)
5. [st_view and st_store](#st_view-and-st_store)
6. [Custom Functions](#custom-functions)
7. [Flow Control in Mata](#flow-control-in-mata)
8. [Structures and Pointers](#structures-and-pointers)
9. [Common Patterns](#common-patterns)
10. [Common Errors](#common-errors)

---

## Mata Basics

### Entering and Exiting Mata
```stata
mata:
    // Mata code here
    2 + 3
end

* Or single-line
mata: st_numscalar("result", 42)
```

### When to Use Mata vs Ado
| Use Mata When | Use Ado When |
|---------------|-------------|
| Matrix algebra needed | Standard Stata commands suffice |
| Performance critical (large loops) | Readability matters most |
| Custom optimization/ML | Working with Stata data directly |
| Complex data structures needed | Simple data manipulation |

---

## Data Types

### Scalar Types
```stata
mata:
    // Numeric (real by default, double precision)
    x = 3.14
    n = 42

    // String
    s = "hello world"

    // Complex
    z = 3 + 4i

    // Void (for functions with no return value)
end
```

### Matrix Types
```stata
mata:
    // Row vector
    r = (1, 2, 3, 4, 5)

    // Column vector
    c = (1 \ 2 \ 3 \ 4 \ 5)

    // Matrix
    A = (1, 2, 3 \ 4, 5, 6 \ 7, 8, 9)

    // String matrix
    S = ("a", "b" \ "c", "d")

    // Identity matrix
    I3 = I(3)

    // Zero matrix
    Z = J(3, 4, 0)

    // Ones matrix
    O = J(5, 1, 1)

    // Diagonal matrix
    D = diag((1, 2, 3))
end
```

### Type Declarations
```stata
mata:
    real scalar x
    real matrix A
    real rowvector r
    real colvector c
    string scalar s
    string matrix S
    complex scalar z
    pointer scalar p
    transmorphic matrix T
end
```

---

## Matrix Operations

### Basic Operations
```stata
mata:
    A = (1, 2 \ 3, 4)
    B = (5, 6 \ 7, 8)

    // Arithmetic
    C = A + B              // element-wise addition
    D = A - B              // subtraction
    E = A * B              // matrix multiplication
    F = A :* B             // element-wise multiplication
    G = A :/ B             // element-wise division
    H = A :^ 2             // element-wise power

    // Transpose
    At = A'

    // Inverse
    Ainv = luinv(A)
    Ainv2 = invsym(A)     // for symmetric matrices (faster)

    // Determinant
    det_A = det(A)

    // Trace
    tr_A = trace(A)

    // Dimensions
    rows(A)                // 2
    cols(A)                // 2
    rows(A), cols(A)       // 2, 2
end
```

### Subscripting and Selection
```stata
mata:
    A = (1, 2, 3 \ 4, 5, 6 \ 7, 8, 9)

    // Single element
    A[1, 2]                // row 1, col 2 = 2

    // Row/column selection
    A[1, .]                // entire row 1
    A[., 2]                // entire column 2
    A[1..2, .]             // rows 1-2
    A[., 2..3]             // columns 2-3

    // Range
    A[|1,1 \ 2,2|]        // submatrix rows 1-2, cols 1-2

    // Logical selection
    x = (1, 5, 3, 8, 2)
    select(x, x :> 3)     // elements > 3: (5, 8)
end
```

### Decompositions
```stata
mata:
    A = (4, 2 \ 2, 3)

    // Cholesky
    L = cholesky(A)        // A = L * L'

    // Eigenvalues/eigenvectors
    eigensystem(A, V, lambda)
    // V = eigenvectors, lambda = eigenvalues

    // SVD
    svd(A, U, s, Vt)
    // A = U * diag(s) * Vt

    // QR decomposition
    qrd(A, Q, R)
    // A = Q * R

    // Solving linear systems: A * x = b
    b = (1 \ 2)
    x = lusolve(A, b)
    // or for symmetric A:
    x = cholsolve(A, b)
end
```

### Statistical Functions
```stata
mata:
    x = (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

    mean(x')               // mean (needs column vector)
    variance(x')           // variance
    quadcross(x', x')     // X'X (numerically stable)
    corr = correlation(X) // correlation matrix

    // OLS by hand: beta = (X'X)^-1 X'y
    // Using Mata for speed
end
```

---

## Interaction with Stata Data

### Reading Stata Data into Mata
```stata
mata:
    // Read all numeric data
    X = st_data(., .)

    // Read specific variables
    X = st_data(., ("price", "mpg", "weight"))

    // Read with condition
    X = st_data(., ("price", "mpg"), "foreign == 1")

    // Read variable names
    varnames = st_varname(1..st_nvar())

    // Read number of observations
    N = st_nobs()

    // Read scalar from Stata
    val = st_numscalar("r(mean)")

    // Read matrix from Stata
    M = st_matrix("e(b)")
    V = st_matrix("e(V)")
end
```

### Writing Results Back to Stata
```stata
mata:
    // Store scalar
    st_numscalar("r_result", 42.5)

    // Store matrix
    st_matrix("my_results", A)
    st_matrixrowstripe("my_results", ("", "row1" \ "", "row2"))
    st_matrixcolstripe("my_results", ("", "col1" \ "", "col2"))

    // Create/modify Stata variables
    idx = st_addvar("double", "new_var")
    st_store(., idx, computed_values)

    // Store string scalar
    st_global("r(method)", "OLS")

    // Store local macro
    st_local("result", "42")
end
```

---

## st_view and st_store

### st_view: Memory-Efficient Data Access
`st_view` creates a **view** (pointer) into Stata's data -- no copy is made. Changes to the view change the actual data.

```stata
mata:
    // Create view of specific variables
    real matrix X
    st_view(X, ., ("price", "mpg", "weight"))

    // X is now a live view -- modifying X modifies the Stata data!
    // Read-only usage is typical:
    means = mean(X)

    // View with sample selection
    real matrix Y
    st_view(Y, ., "price", "touse")     // only where touse==1

    // View of single variable
    real colvector y
    st_view(y, ., "outcome")
end
```

### st_store: Write to Existing Variables
```stata
mata:
    // Read data
    real matrix X
    st_view(X, ., ("x1", "x2"))

    // Compute something
    result = X[., 1] :+ X[., 2]

    // Store result
    idx = st_addvar("double", "sum_x1x2")
    st_store(., idx, result)
end
```

### Performance Comparison
| Method | Speed | Memory | Modifies Data |
|--------|-------|--------|---------------|
| `st_data()` | Fast | Creates copy | No |
| `st_view()` | Fastest | No copy (view) | Yes (if modified) |
| `st_store()` | Fast | N/A | Yes (write) |

**Rule:** Use `st_view` for read-only access to large data. Use `st_data` when you need a modifiable copy.

---

## Custom Functions

### Defining Functions
```stata
mata:
    // Simple function
    real scalar mymean(real colvector x) {
        return(sum(x) / rows(x))
    }

    // Function with multiple returns (via arguments)
    void mystats(real colvector x, real scalar m, real scalar s) {
        m = mean(x)
        s = sqrt(variance(x))
    }

    // Matrix function
    real matrix demean(real matrix X) {
        real rowvector mu
        mu = mean(X)
        return(X :- mu)
    }

    // String function
    string scalar greet(string scalar name) {
        return("Hello, " + name + "!")
    }
end
```

### Using Custom Functions
```stata
mata:
    x = (1 \ 2 \ 3 \ 4 \ 5)
    result = mymean(x)        // 3

    real scalar m, s
    mystats(x, m, s)
    m                         // 3
    s                         // ~1.58
end
```

### Saving and Loading Mata Functions
```stata
* Save compiled functions to a .mo file
mata: mata mosave mymean(), dir(PERSONAL) replace
mata: mata mosave mystats(), dir(PERSONAL) replace

* Functions auto-load when called if in adopath
* Or load explicitly:
mata: mata mlib index
```

---

## Flow Control in Mata

### Conditionals
```stata
mata:
    x = 5
    if (x > 0) {
        printf("positive\n")
    }
    else if (x < 0) {
        printf("negative\n")
    }
    else {
        printf("zero\n")
    }

    // Ternary-like: no native ternary, but use:
    result = (x > 0 ? "pos" : "neg")   // NOT valid in Mata
    result = (x > 0) * x + (x <= 0) * (-x)  // workaround for abs
end
```

### Loops
```stata
mata:
    // for loop
    for (i = 1; i <= 10; i++) {
        printf("i = %g\n", i)
    }

    // while loop
    i = 1
    while (i <= 10) {
        printf("i = %g\n", i)
        i++
    }

    // do-while
    i = 1
    do {
        printf("i = %g\n", i)
        i++
    } while (i <= 5)

    // Loop over matrix rows
    X = (1, 2 \ 3, 4 \ 5, 6)
    for (i = 1; i <= rows(X); i++) {
        printf("Row %g sum = %g\n", i, sum(X[i, .]))
    }
end
```

---

## Structures and Pointers

### Structures
```stata
mata:
    struct model_results {
        string scalar name
        real scalar n
        real colvector beta
        real matrix vcov
        real scalar r2
    }

    // Create and use
    struct model_results scalar fit_ols(real colvector y, real matrix X) {
        struct model_results scalar res
        real matrix XX, Xy
        XX = cross(X, X)
        Xy = cross(X, y)
        res.beta = invsym(XX) * Xy
        res.n = rows(y)
        res.r2 = 1 - variance(y - X * res.beta) / variance(y)
        res.vcov = invsym(XX) * variance(y - X * res.beta) * rows(y)
        return(res)
    }
end
```

### Pointers
```stata
mata:
    // Pointer to scalar
    x = 42
    p = &x
    *p                         // 42 (dereference)

    // Pointer to function
    real scalar apply(pointer(real scalar function) scalar f, real scalar x) {
        return((*f)(x))
    }
    result = apply(&sqrt(), 9) // 3
end
```

---

## Common Patterns

### OLS Estimation in Mata
```stata
mata:
    // Fast OLS: beta = (X'X)^-1 X'y
    real colvector y
    real matrix X
    st_view(y, ., "outcome")
    st_view(X, ., ("x1", "x2", "x3"))

    // Add constant
    X_const = X, J(rows(X), 1, 1)

    // Estimate
    XX = quadcross(X_const, X_const)
    Xy = quadcross(X_const, y)
    beta = invsym(XX) * Xy

    // Residuals and SE
    resid = y - X_const * beta
    s2 = quadcross(resid, resid) / (rows(y) - cols(X_const))
    V = s2 * invsym(XX)
    se = sqrt(diagonal(V))

    // Display
    beta, se
end
```

### Bootstrap in Mata
```stata
mata:
    real colvector boot_means(real colvector x, real scalar B) {
        real colvector results
        real scalar n, i
        real colvector idx
        n = rows(x)
        results = J(B, 1, .)
        for (i = 1; i <= B; i++) {
            idx = ceil(runiform(n, 1) :* n)
            results[i] = mean(x[idx])
        }
        return(results)
    }
end
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `type mismatch` | Mixing real and string operations | Check variable types |
| `conformability error` | Matrix dimensions don't match | Check `rows()` and `cols()` |
| `st_view` changes data | View is live reference | Use `st_data()` for a safe copy |
| Function not found | Not compiled or not in path | Run `mata: mata mlib index` |
| `real matrix X; X = ...` fails | Declaration and assignment on same line | Declare first, assign second |
| Slow Mata code | Using loops instead of vectorized ops | Use `:*`, `:+`, `cross()`, etc. |
| Memory error in `st_data()` | Copying entire large dataset | Use `st_view()` instead |
| Missing values not handled | Mata does not auto-skip missing | Filter with `select()` or `st_view(., ., ., "touse")` |
