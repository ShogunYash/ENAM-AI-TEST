# Preliminary ChatGPT checks

Source: the first five BSE records in `backend/data/raw/a0/bse_RELIANCE.json`. These are manual checks on exchange listing text. The page-numbered filing test is pending.

## classify_batch

Mapped NEWSID, HEADLINE and SUBCATNAME to the three input fields in file order. Output:

```json
{"items":[
  {"id":"2fbab300-f5f6-4422-a266-3d6545f8918e","category":"investor_meetings","confidence":0.95},
  {"id":"8849035d-e28e-4bc2-bd85-329e2b9d065f","category":"credit_rating","confidence":0.95},
  {"id":"e415860f-9a80-4f00-aef6-d2399ad9e1e7","category":"earnings_call","confidence":0.95},
  {"id":"bd9ee49e-a779-4042-8196-bdd7d2768d85","category":"earnings_call","confidence":0.95},
  {"id":"009ca8ed-52dc-481d-92f1-291961ea16e0","category":"results","confidence":0.95}
]}
```

The fourth record describes a recording of a results discussion even though BSE gives it the broader investor-meeting subcategory.

## so_what

Input: first record's headline, with no body pages. Output:

```json
{"so_what":"Executives to attend CLSA India Forum in Mumbai on 16 Nov"}
```

## results_extract

The fifth record announces a presentation covering both bases and multiple periods. It supplies no figures or table pages. It cannot validate numerical extraction. On the supplied results table, check period alignment, printed units, one-based page references and reported versus derived EBITDA.
