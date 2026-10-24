---
version: "2.0"
icon: ant
filesPaths:
  - Colonies
fields:
  - name: id
    type: Input
    options: {}
    id: col_id
    path: ""
  - name: species
    type: Input
    options: {}
    id: col_species
    path: ""
  - name: name
    type: Input
    options: {}
    id: col_name
    path: ""
  - name: founded_on
    type: Date
    options: &a1
      dateFormat: YYYY-MM-DD
      defaultInsertAsLink: false
      linkPath: ""
    id: col_founded_on
    path: ""
  - name: acquired_on
    type: Date
    options: *a1
    id: col_acquired_on
    path: ""
  - name: origin
    type: Input
    options: {}
    id: col_origin
    path: ""
  - name: formicarium
    type: Input
    options: {}
    id: col_formicarium
    path: ""
  - name: initial_workers
    type: Input
    options: {}
    id: col_initial_workers
    path: ""
---

# Colony card

Property types for Colonies/**.
