# gtools: Fast Data Manipulation

## Installation
```stata
ssc install gtools
ssc install ftools           // recommended dependency

* Verify
gtools, check
```

## Overview

Drop-in replacements for built-in commands using C plugins. Same syntax, 5-20x faster.

| Built-in | gtools | Typical Speedup |
|----------|--------|-----------------|
| `collapse` | `gcollapse` | 8x |
| `egen` | `gegen` | 20x |
| `reshape` | `greshape` | 8x |
| `isid` | `gisid` | 7x |
| `levelsof` | `glevelsof` | 9x |
| `sort` | `hashsort` | 3x |

## gcollapse: Fast Aggregation
```stata
* Identical syntax to collapse
gcollapse (mean) avg_price=price ///
          (median) med_price=price ///
          (sd) sd_price=price ///
          (count) n=price, by(foreign)

* Weighted
gcollapse (mean) price [aw=weight], by(foreign)
```

## gegen: Fast egen
```stata
* Group statistics
gegen mean_price = mean(price), by(foreign)
gegen sd_price = sd(price), by(foreign)

* Percentiles within groups
gegen p25 = pctile(price), p(25) by(foreign)
gegen p50 = pctile(price), p(50) by(foreign)

* Standardize and rank
gegen z_price = std(price), by(foreign)
gegen rank_price = rank(price), by(foreign)

* Tag and group
gegen tag = tag(foreign rep78)
gegen group_id = group(foreign rep78)
```

## greshape: Fast Reshape
```stata
* Wide to long
greshape long score, i(id) j(test)

* Long to wide
greshape wide income, i(id) j(year)
```

## Other Commands
```stata
* Fast uniqueness check
gisid id year

* Unique levels
glevelsof foreign, local(levels)

* Quantile groups
gquantiles price_q = price, nquantiles(4)

* Fast sort
hashsort firm_id year
```

## When to Use gtools

- **Use gtools**: datasets > 100K observations, repeated aggregations, panel data
- **Stick with built-in**: datasets < 10K observations, one-time operations, need egen functions not available in gegen

## Performance Example
```stata
* Built-in: ~45 seconds on 10M obs
timer on 1
collapse (mean) y, by(id)
timer off 1

* gtools: ~5 seconds on 10M obs
timer on 2
gcollapse (mean) y, by(id)
timer off 2

timer list
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `gtools` not found | Not installed | `ssc install gtools` |
| `hash collision` | Extremely rare | Update gtools, report bug |
| `gegen` function missing | Not all egen functions ported | Fall back to `egen` |
| No speedup on small data | Overhead > benefit | Use built-in for small datasets |
