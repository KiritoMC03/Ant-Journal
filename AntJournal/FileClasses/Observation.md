---
version: "2.0"
icon: ant
filesPaths:
  - Journal
fields:
  - name: date
    type: Date
    options:
      dateFormat: YYYY-MM-DD
      defaultInsertAsLink: false
      linkPath: ""
    id: obs_date
    path: ""
  - name: colony_id
    type: Select
    options:
      sourceType: ValuesListNotePath
      valuesList: {}
      valuesListNotePath: Config/ColonyIds.md
    id: obs_colony_id
    path: ""
  - name: workers
    type: Input
    options: {}
    id: obs_workers
    path: ""
  - name: queens
    type: Input
    options: {}
    id: obs_queens
    path: ""
  - name: eggs
    type: Input
    options: {}
    id: obs_eggs
    path: ""
  - name: larvae
    type: Input
    options: {}
    id: obs_larvae
    path: ""
  - name: pupae
    type: Input
    options: {}
    id: obs_pupae
    path: ""
  - name: worker_deaths
    type: Input
    options: {}
    id: obs_worker_deaths
    path: ""
  - name: feed_syrup
    type: Boolean
    options: {}
    id: obs_feed_syrup
    path: ""
  - name: feed_protein
    type: Boolean
    options: {}
    id: obs_feed_protein
    path: ""
  - name: feed_seeds
    type: Boolean
    options: {}
    id: obs_feed_seeds
    path: ""
  - name: watered
    type: Boolean
    options: {}
    id: obs_watered
    path: ""
  - name: condition
    type: Select
    options:
      sourceType: ValuesList
      valuesList:
        "0": normal
        "1": attention
        "2": critical
    id: obs_condition
    path: ""
  - name: temperature_c
    type: Input
    options: {}
    id: obs_temperature_c
    path: ""
  - name: humidity_pct
    type: Input
    options: {}
    id: obs_humidity_pct
    path: ""
  - name: feed_notes
    type: Input
    options: {}
    id: obs_feed_notes
    path: ""
  - name: water_notes
    type: Input
    options: {}
    id: obs_water_notes
    path: ""
  - name: notes
    type: Input
    options: {}
    id: obs_notes
    path: ""
---

# Observation

Field types for Journal/**. Input controls preserve N / ~N / ?. See [Typed controls](../Docs/Fields.md).
