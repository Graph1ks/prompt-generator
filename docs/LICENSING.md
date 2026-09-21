# Licensing and Contributor Strategy

This document is an engineering decision framework, not legal advice. For high-stakes commercial licensing or unusual rights questions, use authoritative license sources and obtain qualified legal review when warranted.

## 1. Separate the licensing axes

Do **not** treat "commercial", "proprietary", and "open-source" as synonyms or opposites.

A project can be:

- open-source and commercially used;
- open-source and commercially sold;
- proprietary and free-of-charge;
- proprietary and commercial;
- internal only;
- source-available without being open-source.

Before recommending a license, determine four independent axes:

1. **Source model** — open-source, proprietary, source-available, mixed, internal.
2. **Commercial model** — commercial use intended, non-commercial only, internal only.
3. **Deployment/distribution** — distributed binaries/source, SaaS/network service, local-only, internal, mixed.
4. **Copyleft posture** — permissive preferred, weak copyleft acceptable, strong copyleft acceptable, case-by-case.

Then recommend the strongest-fitting project license/terms and explain the obligations that matter for the actual model.

## 2. Code, data, models, assets, and docs are separate

A project's code license does not automatically license everything else in the repository/product.

Review separately when relevant:

- source code;
- datasets and corpora;
- model weights;
- fonts;
- icons/images/audio/video;
- documentation;
- generated SDKs;
- embedded binaries/firmware;
- third-party templates/themes.

Record the applicable rights in `PROJECT.md`.

"Publicly accessible" is not a license.

## 3. Common code-license options

### MIT

Often suitable when simplicity and broad reuse with minimal conditions are priorities.

Typical fit:

- small libraries;
- open developer tools;
- projects where proprietary/commercial downstream reuse is acceptable.

### Apache License 2.0

Permissive with explicit patent language and NOTICE-related obligations where applicable.

Typical fit:

- larger libraries/frameworks;
- infrastructure;
- projects where patent language matters.

### BSD-2-Clause / BSD-3-Clause / ISC

Established permissive alternatives with relatively simple obligations.

### MPL-2.0

File-level copyleft. Useful when modifications to covered files should remain open while allowing combination with differently licensed code.

Review distribution mechanics before adoption.

### LGPL-family

Library-focused copyleft with conditions that depend on how the library is linked/distributed and on the exact license version.

Review explicitly for proprietary distribution.

### GPL-family

Strong copyleft for covered distributed derivative works. Commercial use/sale is not inherently prohibited; the important question is whether the source/distribution obligations fit the product model.

Do not use merely because a project is "commercial" or reject merely because commercial activity exists. Review the actual distribution obligations.

### AGPL-family

Adds network-use obligations beyond ordinary GPL distribution triggers. Use only when that outcome is intentional.

Treat as a high-attention dependency/license for closed-source network products.

### Proprietary terms / EULA

Appropriate when the project's own code is closed and distribution/use rights are controlled contractually.

Third-party dependencies/assets still require individual review.

## 4. Dependency preference by product model

This is a conservative engineering preference, not a substitute for reading the actual license/version.

### Closed-source/proprietary distributed product

Usually lowest-friction when technically suitable:

- MIT
- ISC
- BSD-family
- Apache-2.0

Review explicitly:

- MPL-2.0
- LGPL-family
- EPL-family
- licenses with NOTICE/attribution requirements
- custom/source-available licenses

Default to **not approved yet** until deliberately reviewed:

- GPL/AGPL-family components whose obligations may conflict with the intended closed-source distribution/deployment;
- non-commercial licenses;
- research-only licenses;
- field-of-use restrictions;
- missing/unclear licenses.

### Open-source product

Check compatibility with the project's chosen license and desired downstream obligations. Do not assume all open-source licenses combine cleanly.

## 5. Zero-cost and license review are separate hard gates

A component can be:

- free but license-incompatible;
- open-source but operationally costly;
- permissively licensed but tied to a paid hosted service;
- free for non-commercial use but paid for the intended commercial use.

It must pass **both** gates.

## 6. Dependency and shipped-component inventory

Every meaningful third-party component should have enough provenance to answer:

- what is it;
- what version is shipped/used;
- what license/terms apply;
- does it cost money in the intended path;
- is intended commercial use allowed;
- what attribution/NOTICE/source obligations exist;
- are relevant transitive/redistributed components accounted for.

For non-trivial dependencies use `docs/DEPENDENCY_REVIEW.md`.

Before release, the **shipped** dependency/component inventory must be reviewable even when individual dependencies did not warrant a long-form review document.

Create `THIRD_PARTY_NOTICES.md` or another notice bundle only when actual obligations require it.

## 7. Choosing the project's own code license

Ask:

1. Should downstream commercial use be allowed?
2. Should closed-source derivatives be allowed?
3. Should modifications remain open?
4. Should network use trigger source-sharing obligations?
5. Is an explicit patent grant important?
6. Is dual licensing or future relicensing plausible?
7. Will outside contributors retain copyright?

The answers narrow the choice.

## 8. CLA, DCO, or neither

### No contributor agreement

Often enough when contributions are limited, relicensing is unlikely, and centralized additional rights are unnecessary.

### DCO

A Developer Certificate of Origin workflow is lower-friction and focuses on contributor provenance/certification.

Consider it when provenance assurance is useful but broad relicensing rights are not required.

### CLA

Consider a Contributor License Agreement when there is a concrete reason, such as:

- planned dual licensing;
- likely future relicensing;
- centralized commercial licensing rights;
- explicit additional contributor representations/permissions.

Do not add a CLA merely because large projects use one.

If a CLA is selected, use an established form appropriate to the actual project/jurisdiction and review it rather than casually inventing bespoke legal terms.

### Copyright assignment

Stronger than a typical CLA. Use only when centralized copyright ownership is an intentional strategy.

## 9. License-change warning

Changing project licensing later can be difficult when external contributors retain copyright.

If future relicensing or dual licensing is realistic, decide the contributor-rights strategy early.

## 10. Release licensing gate

Before a public or commercial release:

- code license/terms are correct;
- data/model/assets/documentation rights are separately understood where applicable;
- shipped dependency inventory is reviewable;
- required attribution/NOTICE material is included;
- no non-commercial/research-only/field-of-use restricted material conflicts with intended use;
- no paid production dependency was introduced unintentionally;
- contributor-rights requirements are satisfied;
- binary redistribution/source-offer obligations are checked where applicable.

## 11. When uncertain

Unknown or ambiguous licensing is **not approved yet**.

Do not resolve ambiguity by assumption. Replace the component, obtain authoritative clarification, or seek qualified legal review if the component is important enough.
