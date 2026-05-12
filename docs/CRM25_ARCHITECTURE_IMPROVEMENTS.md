# CRM25 Architecture Improvements (Aquakart)

## Goals

- Introduce a **new CRM25 assistant-ready invoice pipeline** that supports manual invoice creation now and Telegram/voice creation later.
- Keep the **existing invoice flow stable** and untouched except at the final confirmed-invoice creation handoff.
- Build a clear separation between legacy invoice endpoints and new CRM25 endpoints.

---

## Proposed Folder Structure

```text
src/
  crm25/
    constants/
      invoiceLifecycle.ts
      sourceChannels.ts
    models/
      InvoiceDraft.ts
      ProductCanonical.ts
      AuditEvent.ts
    types/
      parser.ts
      invoiceDraft.ts
    services/
      parser/
        parser.contract.ts
        parser.validation.ts
        parser.question-builder.ts
      draft/
        draft.service.ts
        draft.mapper.ts
        draft.validation.ts
      confirmation/
        confirm.service.ts
    controllers/
      draft.controller.ts
      parser.controller.ts
      productNormalization.controller.ts
    routes/
      crm25.routes.ts
      draft.routes.ts
      parser.routes.ts
      product.routes.ts
    adapters/
      legacyInvoice.adapter.ts
  services/
    invoice.ts   (existing legacy flow remains primary)
```

> If your backend is in a separate repo, mirror the same structure under that backend `src/` root. Frontend can consume these APIs without legacy changes.

---

## New Domain Models

### 1) Invoice Lifecycle

Add lifecycle status enum for CRM25 flows:

- `draft`
- `confirmed`
- `sent`
- `paid`
- `cancelled`

**Rule:** only `confirmed` drafts can become real invoices.

---

### 2) Source Tracking

Add source channel enum:

- `manual`
- `telegram`
- `voice`
- `ecommerce`
- `admin`

This should be present on both draft and final invoice metadata.

---

### 3) Audit Tracking

Add unified audit metadata:

- `createdBy`
- `updatedBy`
- `source`
- `changeLog[]`
- `timestamps` (`createdAt`, `updatedAt`)

`changeLog[]` event shape:

```ts
{
  at: string;                // ISO timestamp
  actorId: string;           // user/system id
  actorType: 'admin' | 'user' | 'system';
  action: string;            // e.g. DRAFT_CREATED, FIELD_UPDATED, CONFIRMED
  source: 'manual' | 'telegram' | 'voice' | 'ecommerce' | 'admin';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  notes?: string;
}
```

---

### 4) Product Normalization Foundation

Create canonical product reference for multi-brand matching:

```ts
{
  canonicalProductName: string;
  productId?: string;        // internal id
  sku?: string;
  aliases: string[];         // e.g. ['kent grand plus', 'grand+']
  brand: 'Kent' | 'Racold' | string;
  category: 'water_softener' | 'sand_filter' | 'manual_system' | 'automatic_system' | string;
  defaultPrice?: number;
  confidence: number;        // 0..1 matching confidence
  requiresManualReview: boolean;
}
```

---

### 5) Invoice Draft Model

Draft should store partially-known content and unresolved needs:

```ts
{
  id: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  source: 'manual' | 'telegram' | 'voice' | 'ecommerce' | 'admin';
  customer: {
    name?: string;
    phone?: string;
    address?: string;
    gstin?: string;
  };
  items: Array<{
    rawName?: string;
    canonicalProductName?: string;
    productId?: string;
    sku?: string;
    brand?: string;
    category?: string;
    qty?: number;
    unitPrice?: number;
    lineTotal?: number;
    confidence?: number;
    requiresManualReview?: boolean;
  }>;
  gstDetails?: {
    gstType?: 'inclusive' | 'exclusive';
    gstPercent?: number;
  };
  totals?: {
    subtotal?: number;
    gstAmount?: number;
    grandTotal?: number;
  };
  missingFields: string[];    // ['customer.name', 'customer.phone', 'items[0].unitPrice']
  confidenceScore: number;    // aggregate 0..1
  questionsToAsk: string[];   // human follow-up questions
  audit: {
    createdBy: string;
    updatedBy: string;
    source: 'manual' | 'telegram' | 'voice' | 'ecommerce' | 'admin';
    changeLog: Array<Record<string, unknown>>;
    createdAt: string;
    updatedAt: string;
  };
}
```

**Critical behavior:** drafts must **never** auto-create invoices.

---

## Controllers & Responsibilities

### `draft.controller.ts`

- Create draft manually or from parser output.
- Update draft fields.
- Recalculate missing fields + confidence.
- Confirm draft only after admin approval.

### `parser.controller.ts`

- Accept messy text/transcript + source metadata.
- Run parser contract.
- Return structured draft payload + questions.
- Do not write invoice directly.

### `productNormalization.controller.ts`

- Resolve raw product names into canonical products.
- Support alias management for Kent/Racold/multi-brand catalog.

### `confirm.service.ts`

- Final gate:
  1. Validate required fields are complete.
  2. Require admin role/approval.
  3. Transform draft to legacy invoice payload.
  4. Call existing invoice model/service (single integration point).
  5. Mark draft as confirmed and store invoice reference.

---

## Future-Ready Parser Contract

`parser.contract.ts`

### Input

```ts
{
  source: 'manual' | 'telegram' | 'voice' | 'ecommerce' | 'admin';
  rawInput: string;           // text or transcript
  language?: string;
  context?: {
    channelUserId?: string;
    priorCustomerHints?: Record<string, unknown>;
  };
}
```

### Output

```ts
{
  draftPayload: {
    customer: Record<string, unknown>;
    items: Array<Record<string, unknown>>;
    gstDetails?: Record<string, unknown>;
    totals?: Record<string, unknown>;
  };
  missingFields: string[];
  confidenceScore: number;
  questionsToAsk: string[];
  parserMeta: {
    modelVersion?: string;
    parseWarnings?: string[];
  };
}
```

### Missing-field question behavior

If any of these are missing, return guided questions:

- `customer.name`
- `customer.phone`
- `items[].product`
- `items[].unitPrice`
- `gstDetails` essentials

Example questions:

- "Please share customer full name for this invoice."
- "What is customer phone number?"
- "Which product variant (manual/automatic water softener, sand filter, Kent, Racold, or other)?"
- "Please confirm unit price and quantity."
- "Should GST be inclusive or exclusive, and at what rate?"

---

## API Endpoints (CRM25-isolated)

Base path: `/v1/crm25`

### Draft APIs

- `POST /v1/crm25/drafts`
  - Create draft (manual or parser-generated payload).
- `GET /v1/crm25/drafts/:draftId`
  - Get draft details.
- `PATCH /v1/crm25/drafts/:draftId`
  - Update fields, auto-refresh missingFields/confidence.
- `POST /v1/crm25/drafts/:draftId/confirm`
  - Admin confirmation -> create real invoice through legacy adapter.
- `POST /v1/crm25/drafts/:draftId/cancel`
  - Cancel draft.

### Parser APIs

- `POST /v1/crm25/parser/parse`
  - Parse messy text/voice transcript to structured draft proposal.

### Product normalization APIs

- `POST /v1/crm25/products/normalize`
  - Normalize one or more raw product strings.
- `POST /v1/crm25/products/aliases`
  - Add alias mapping (admin).

---

## Example Request/Response

### 1) Parse transcript -> draft proposal

`POST /v1/crm25/parser/parse`

Request:

```json
{
  "source": "voice",
  "rawInput": "Invoice for Ramesh, phone 98xxxxxx21, one Kent Grand Plus and one manual sand filter, GST extra"
}
```

Response:

```json
{
  "draftPayload": {
    "customer": {
      "name": "Ramesh",
      "phone": "98xxxxxx21"
    },
    "items": [
      {
        "rawName": "Kent Grand Plus",
        "canonicalProductName": "Kent Grand Plus",
        "brand": "Kent",
        "qty": 1,
        "confidence": 0.94,
        "requiresManualReview": false
      },
      {
        "rawName": "manual sand filter",
        "canonicalProductName": "Manual Sand Filter",
        "category": "sand_filter",
        "qty": 1,
        "confidence": 0.78,
        "requiresManualReview": true
      }
    ],
    "gstDetails": {
      "gstType": "exclusive"
    }
  },
  "missingFields": [
    "items[0].unitPrice",
    "items[1].unitPrice",
    "gstDetails.gstPercent"
  ],
  "confidenceScore": 0.82,
  "questionsToAsk": [
    "Please confirm unit price for Kent Grand Plus.",
    "Please confirm unit price for Manual Sand Filter.",
    "What GST percentage should be applied?"
  ],
  "parserMeta": {
    "modelVersion": "crm25-parser-v1"
  }
}
```

### 2) Confirm draft (admin only)

`POST /v1/crm25/drafts/:draftId/confirm`

Request:

```json
{
  "approvedBy": "admin_123",
  "notes": "Validated prices and GST with customer"
}
```

Response:

```json
{
  "draftId": "drf_001",
  "status": "confirmed",
  "invoiceId": "inv_98765",
  "invoiceStatus": "sent",
  "message": "Draft confirmed and invoice created successfully"
}
```

---

## Migration & Backward Compatibility

1. **No legacy route breakage**
   - Keep old invoice routes/controllers unchanged.
   - New behavior is isolated under `/v1/crm25/*`.

2. **Single integration touchpoint**
   - Reuse existing invoice creation logic only inside `confirm.service.ts` via `legacyInvoice.adapter.ts`.

3. **Data migration strategy**
   - Add new tables/collections (`invoice_drafts`, `canonical_products`, `audit_events`) without altering old invoice schema initially.
   - Optional later phase: add non-breaking nullable metadata columns in existing invoice table (`source`, `createdBy`, etc.).

4. **Feature flag rollout**
   - Guard new endpoints with `CRM25_ENABLED=true`.
   - Start with manual source only; enable telegram/voice parser endpoints progressively.

5. **Idempotency & safety**
   - Confirmation endpoint should be idempotent (same draft cannot create multiple invoices).
   - Use transaction/lock around draft->invoice conversion.

---

## Manual Test Checklist

1. **Legacy invoice regression**
   - Create invoice using old flow.
   - Verify no behavior change in existing UI/API.

2. **Draft creation (manual source)**
   - Create minimal draft with missing fields.
   - Verify status remains `draft` and no invoice is created.

3. **Draft update**
   - Patch customer/items/GST fields.
   - Verify `missingFields`, `confidenceScore`, and audit `changeLog` update.

4. **Parser contract**
   - Send messy mixed-language message.
   - Verify structured payload + questions for missing fields.

5. **Admin confirmation gate**
   - Confirm without admin role -> should fail.
   - Confirm with admin role and complete fields -> creates legacy invoice.

6. **Double-confirmation protection**
   - Repeat confirm call on same draft.
   - Verify no duplicate invoice is created.

7. **Cancellation behavior**
   - Cancel draft and attempt confirm.
   - Verify blocked with proper error.

8. **Product normalization**
   - Input aliases for Kent/Racold/manual/automatic systems.
   - Verify canonical mapping and confidence threshold behavior.

9. **Audit trail verification**
   - Ensure create/update/confirm/cancel actions append proper changeLog entries.
