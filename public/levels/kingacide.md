# map

```
SSS
WTE
WTE
WFL
```

* S=Sanctum
* T=Throne Room
* W=West Hall
* E=East Hall
* F=Foyer
* L=Library

# rooms

## Sanctum

* exits=West Hall

## West Hall

* exits=Sanctum|Foyer

## Throne Room

* exits=Foyer|East Hall

## East Hall

* exits=Throne Room|Library

## Foyer

* exits=West Hall|Throne Room|Library