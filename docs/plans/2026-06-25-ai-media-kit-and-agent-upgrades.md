# AI Media Kit And Agent Upgrades Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the existing AI consultant from a chat/prompt helper into an ERP action assistant, with a high-quality AI Media Kit workflow for product image and video prompts.

**Architecture:** Keep the existing Electron IPC architecture and AIService provider abstraction. Add small, testable services around prompt templates, media-kit persistence, and structured agent actions, then connect them to the current `ai-consultant`, inventory, and POS surfaces.

**Tech Stack:** Electron IPC, React 18, TypeScript, SQLite/better-sqlite3, Vite, Tailwind CSS variables, Vitest.

---

## Current Baseline

The project already has:

- AI consultant page: `src/features/ai-consultant/SmartConsultantPage.tsx`
- Chat UI with image attachments and product-image prompt shortcuts: `src/features/ai-consultant/components/ChatPanel.tsx`
- Manual prompt export: `src/features/ai-consultant/components/ManualModePanel.tsx`
- AI IPC handlers and a basic tool loop: `electron/ipc/ai.ipc.ts`
- AI provider service: `electron/services/ai.service.ts`
- Business context harvesting: `electron/services/data-harvester.service.ts`
- AI invoice OCR and fitment extraction inside purchases/product workflows.

The main gap is not "more prompts". The gap is turning these features into persistent, guided, high-quality workflows with structured outputs, UI states, saved results, and safer execution.

---

## The Five Planned Upgrades

1. ERP Agent Action Center  
   Convert AI answers into actionable cards with confirmations and deep links.

2. Prompt Studio  
   Centralize prompt templates instead of hardcoded prompt strings inside UI components.

3. Domain Skills  
   Add focused internal skills: pricing, reorder, dead-stock clearance, debt collection, invoice review.

4. Reliable Tool Calling  
   Replace fragile markdown tool parsing with structured tool-call JSON and validation.

5. AI Product Media Kit  
   Build a full workflow for best possible image and video outputs per product.

Upgrade 5 is the highest priority and receives the most implementation detail below.

---

## Upgrade 1: ERP Agent Action Center

### Task 1: Define Structured Agent Actions

**Files:**
- Create: `electron/services/ai-actions.service.ts`
- Modify: `electron/ipc/ai.ipc.ts`
- Test: `tests/ai-actions.service.test.ts`

**Step 1: Write the failing tests**

Create tests for parsing and validating action cards:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeAgentActions } from '../electron/services/ai-actions.service';

describe('normalizeAgentActions', () => {
  it('accepts safe action cards', () => {
    const result = normalizeAgentActions([
      {
        type: 'open_route',
        title: 'راجع الديون',
        route: '/customers',
        severity: 'warning',
        reason: 'ديون العملاء مرتفعة',
      },
    ]);

    expect(result).toEqual([
      {
        type: 'open_route',
        title: 'راجع الديون',
        route: '/customers',
        severity: 'warning',
        reason: 'ديون العملاء مرتفعة',
        requiresConfirmation: false,
      },
    ]);
  });

  it('rejects unknown action types', () => {
    expect(() => normalizeAgentActions([{ type: 'drop_database' } as any])).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- tests/ai-actions.service.test.ts
```

Expected: FAIL because the service does not exist.

**Step 3: Implement minimal action normalization**

Create a small service with allowed action types:

```ts
export type AgentActionType =
  | 'open_route'
  | 'draft_purchase_order'
  | 'draft_customer_message'
  | 'confirm_inventory_change'
  | 'generate_media_kit';

export type AgentActionSeverity = 'info' | 'opportunity' | 'warning' | 'critical';

export interface AgentAction {
  type: AgentActionType;
  title: string;
  reason: string;
  severity: AgentActionSeverity;
  route?: string;
  payload?: Record<string, unknown>;
  requiresConfirmation: boolean;
}

const ALLOWED_TYPES = new Set<AgentActionType>([
  'open_route',
  'draft_purchase_order',
  'draft_customer_message',
  'confirm_inventory_change',
  'generate_media_kit',
]);

export function normalizeAgentActions(input: unknown): AgentAction[] {
  if (!Array.isArray(input)) return [];

  return input.map((raw) => {
    const item = raw as Partial<AgentAction>;
    if (!item.type || !ALLOWED_TYPES.has(item.type)) {
      throw new Error(`Unsupported agent action: ${String(item.type)}`);
    }

    return {
      type: item.type,
      title: String(item.title || 'إجراء مقترح'),
      reason: String(item.reason || ''),
      severity: item.severity || 'info',
      route: item.route,
      payload: item.payload || {},
      requiresConfirmation:
        item.requiresConfirmation ?? item.type.startsWith('confirm_'),
    };
  });
}
```

**Step 4: Wire actions into `ai:analyze` later**

Do not change UI yet. This task only creates the safe model.

**Step 5: Run tests**

```bash
npm run test -- tests/ai-actions.service.test.ts
```

Expected: PASS.

---

## Upgrade 2: Prompt Studio

### Task 2: Move Prompt Templates Out Of Components

**Files:**
- Create: `electron/services/prompt-template.service.ts`
- Modify: `electron/ipc/ai.ipc.ts`
- Modify: `src/features/ai-consultant/components/ChatPanel.tsx`
- Test: `tests/prompt-template.service.test.ts`

**Goal:** Replace duplicated hardcoded prompt strings with reusable named templates.

**Templates to support first:**

- `product_image_prompt`
- `product_video_prompt`
- `product_marketing_post`
- `invoice_ocr`
- `fitment_extract`
- `business_strategy_export`

**Template service shape:**

```ts
export type PromptTemplateKey =
  | 'product_image_prompt'
  | 'product_video_prompt'
  | 'product_marketing_post'
  | 'invoice_ocr'
  | 'fitment_extract'
  | 'business_strategy_export';

export interface PromptTemplateInput {
  productName?: string;
  brandName?: string;
  categoryName?: string;
  language?: 'ar' | 'fr' | 'en';
  extraContext?: string;
}

export function buildPromptTemplate(key: PromptTemplateKey, input: PromptTemplateInput): string {
  switch (key) {
    case 'product_image_prompt':
      return buildProductImagePrompt(input);
    case 'product_video_prompt':
      return buildProductVideoPrompt(input);
    case 'product_marketing_post':
      return buildMarketingPrompt(input);
    case 'invoice_ocr':
      return buildInvoiceOcrPrompt(input);
    case 'fitment_extract':
      return buildFitmentPrompt(input);
    case 'business_strategy_export':
      return buildBusinessStrategyPrompt(input);
    default:
      throw new Error(`Unknown prompt template: ${key satisfies never}`);
  }
}
```

**Implementation notes:**

- Start by moving only the product image/video prompt text.
- Keep the old button behavior in `ChatPanel.tsx`.
- Add IPC later only if the renderer needs dynamic templates.

**Tests:**

- Template includes product name.
- Template includes strict single-shot constraints.
- Template includes video prompt instructions.
- Template forbids split-screen/collage.

---

## Upgrade 3: Domain Skills

### Task 3: Add Internal ERP Skill Prompts

**Files:**
- Create: `electron/services/erp-skill.service.ts`
- Modify: `electron/ipc/ai.ipc.ts`
- Test: `tests/erp-skill.service.test.ts`

**Skills:**

```ts
export type ErpSkillKey =
  | 'pricing_advisor'
  | 'reorder_advisor'
  | 'dead_stock_clearance'
  | 'debt_collection'
  | 'invoice_review';
```

**Value:**

- `pricing_advisor`: catches weak margins and suggests price changes.
- `reorder_advisor`: suggests purchase quantities from low stock plus sales velocity.
- `dead_stock_clearance`: suggests bundles, discounts, and marketing posts.
- `debt_collection`: writes polite Arabic/French WhatsApp collection messages.
- `invoice_review`: flags suspicious OCR results before import.

**First implementation target:**

Build the service only. Then use it in Agent Action Center and Media Kit workflows.

---

## Upgrade 4: Reliable Tool Calling

### Task 4: Replace Markdown Tool Calls With JSON Tool Calls

**Files:**
- Create: `electron/services/ai-tool-call.service.ts`
- Modify: `electron/ipc/ai.ipc.ts`
- Test: `tests/ai-tool-call.service.test.ts`

**Problem today:**

`ai.ipc.ts` detects tools through markdown:

```txt
```tool
search_products(query: "filter")
```
```

This is fragile because models may add text, break formatting, or quote arguments badly.

**New schema:**

```json
{
  "tool_call": {
    "name": "search_products",
    "arguments": {
      "query": "فلتر زيت كليو"
    }
  }
}
```

**Allowed tools:**

- `search_products`
- `get_product_detail`
- `search_parties`
- `get_sales_report`
- `check_zero_stock_products`
- `generate_product_marketing`
- `generate_product_image_prompts`
- `generate_product_media_kit`

**Compatibility rule:**

Keep old markdown parser for one release, but prefer JSON tool calls.

---

# Upgrade 5: AI Product Media Kit

This is the priority upgrade. The goal is to make image/video outputs practical, repeatable, and high quality.

## What The User Should Experience

From a product page or AI consultant product session, the user opens **AI Media Kit** and sees:

1. Product identity panel:
   - Product name
   - Brand
   - Category
   - Stock
   - Price
   - Existing photos

2. Generate controls:
   - Mode: Image prompts, Video prompts, Full media kit
   - Style: Premium dark studio, clean catalog, workshop premium, marketplace
   - Output target: Midjourney, DALL-E, Stable Diffusion, Kling, Runway, Luma, Sora-style
   - Language: Arabic marketing text, French post, English prompt
   - Strict product fidelity toggle

3. Generated result tabs:
   - Product analysis
   - Image prompts
   - Video prompts
   - Negative prompts
   - Social post
   - Copy/export

4. Saved versions:
   - User can regenerate and compare versions.
   - Results are saved per product.
   - Best result can be marked as favorite.

No actual image/video generation is required in the first version. The first win is best-in-class prompts and workflow. Later we can connect real image/video APIs.

---

## Media Kit Data Model

### Task 5.1: Add SQLite Table For Saved Media Kits

**Files:**
- Modify: `database/schema/products.schema.ts` or add appropriate schema file if schema style prefers separation
- Modify: `electron/services/database.service.ts` if migrations/initialization are managed there
- Test: `tests/media-kit.schema.test.ts`

**Table: `product_media_kits`**

Columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `product_id INTEGER NOT NULL REFERENCES products(id)`
- `title TEXT NOT NULL`
- `style TEXT NOT NULL`
- `target_platform TEXT NOT NULL`
- `input_image_count INTEGER NOT NULL DEFAULT 0`
- `result_json TEXT NOT NULL`
- `is_favorite INTEGER NOT NULL DEFAULT 0 CHECK(is_favorite IN (0,1))`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`

**Indexes:**

- `idx_product_media_kits_product_id`
- `idx_product_media_kits_created_at`

**Test expectation:**

Insert a kit for a product and retrieve it ordered by newest first.

---

## Media Kit Result Schema

### Task 5.2: Define Strict TypeScript Types And Validator

**Files:**
- Create: `electron/services/media-kit.types.ts`
- Create: `electron/services/media-kit.validator.ts`
- Test: `tests/media-kit.validator.test.ts`

**Schema:**

```ts
export type MediaKitStyle =
  | 'premium_dark_studio'
  | 'clean_catalog'
  | 'premium_workshop'
  | 'marketplace';

export type MediaKitTarget =
  | 'midjourney'
  | 'dalle'
  | 'stable_diffusion'
  | 'kling'
  | 'runway'
  | 'luma'
  | 'sora_style'
  | 'all';

export interface ProductMediaKitResult {
  product_summary: {
    product_name: string;
    detected_materials: string[];
    geometry_type: string;
    visible_features: string[];
    risk_notes: string[];
  };
  image_prompts: {
    hero_prompt: string;
    catalog_prompt: string;
    detail_prompt: string;
    negative_prompt: string;
    platform_notes: Record<string, string>;
  };
  video_prompts: {
    cinematic_8s: string;
    rotating_360: string;
    macro_detail: string;
    negative_prompt: string;
    camera_motion: string;
  };
  marketing: {
    post_ar: string;
    post_fr: string;
    hashtags: string[];
  };
  quality_checklist: {
    single_product: boolean;
    no_hands: boolean;
    no_split_screen: boolean;
    no_white_background_for_metal: boolean;
    product_fidelity_locked: boolean;
  };
}
```

**Validator behavior:**

- Parse JSON even if wrapped in markdown fences.
- Require `image_prompts.hero_prompt`.
- Require at least one `video_prompts` field.
- Force missing checklist booleans to `false`.
- Return clear Arabic errors to UI.

---

## Media Kit Prompt Quality

### Task 5.3: Build A Strong Media Kit Prompt Generator

**Files:**
- Create: `electron/services/media-kit-prompt.service.ts`
- Modify: `electron/ipc/ai.ipc.ts`
- Test: `tests/media-kit-prompt.service.test.ts`

**Core rules to enforce:**

1. One product only.
2. One angle per image prompt.
3. No split screen, no collage, no before/after.
4. No hands, no people.
5. No chairs, no seats, no furniture, no car interior.
6. For metal/mechanical parts, avoid white backgrounds.
7. Use dark premium surface when appropriate.
8. Mention support solution: acrylic block, chrome stand, magnetic base, natural rest.
9. Preserve geometry and visible details.
10. Include video camera motion.

**Prompt builder signature:**

```ts
export interface BuildMediaKitPromptInput {
  productName: string;
  productNameFr?: string;
  brandName?: string;
  categoryName?: string;
  price?: number;
  stock?: number;
  style: MediaKitStyle;
  target: MediaKitTarget;
  imageCount: number;
  strictFidelity: boolean;
}

export function buildMediaKitPrompt(input: BuildMediaKitPromptInput): string {
  return `...`;
}
```

**The output prompt must ask the model for raw JSON only:**

```txt
Return ONLY valid raw JSON. Do not use markdown fences.
```

**Important improvement over current prompt:**

The existing prompt is very long and mixes many rules. The new builder should compose sections:

- Product identity
- Visual fidelity rules
- Style rules
- Image prompt schema
- Video prompt schema
- Marketing schema
- JSON-only response rule

This makes it easier to test and maintain.

---

## Media Kit Backend IPC

### Task 5.4: Add Media Kit IPC Handlers

**Files:**
- Modify: `electron/ipc/ai.ipc.ts`
- Modify: `electron/preload.ts`
- Test: `tests/media-kit.ipc.test.ts` if IPC test pattern exists, otherwise service-level tests only

**New channels:**

- `ai:mediaKit:generate`
- `ai:mediaKit:list`
- `ai:mediaKit:get`
- `ai:mediaKit:favorite`
- `ai:mediaKit:delete`

**Remember:**

Every new IPC channel must be added to `ALLOWED_INVOKE_CHANNELS` in `electron/preload.ts`.

**Generate payload:**

```ts
{
  productId: number;
  style: MediaKitStyle;
  target: MediaKitTarget;
  strictFidelity: boolean;
  save: boolean;
}
```

**Generate flow:**

1. Load AI config.
2. Validate automatic mode.
3. Load product details.
4. Load all product images.
5. Build media kit prompt.
6. Call `AIService.chat(config, messages, { jsonMode: true })`.
7. Validate result.
8. Save to `product_media_kits` if `save === true`.
9. Return parsed JSON plus saved id.

---

## Media Kit Frontend

### Task 5.5: Create Media Kit Modal

**Files:**
- Create: `src/features/ai-consultant/components/ProductMediaKitModal.tsx`
- Modify: `src/features/ai-consultant/components/ChatPanel.tsx`
- Optional modify: `src/features/inventory/ProductModal.tsx`

**UI layout:**

- Header: product name, image count, close button.
- Left column: product images and generation controls.
- Right column: tabs for result.

**Controls:**

- Segmented control for mode: `Full Kit`, `Images`, `Video`
- Select for style.
- Select for target platform.
- Toggle for strict fidelity.
- Generate button.

**Tabs:**

- Analysis
- Image
- Video
- Marketing
- Saved

**No nested cards.**

Use project theme variables/Tailwind classes and lucide icons.

---

## Media Kit Integration Points

### Task 5.6: Add Entry Points

**Files:**
- Modify: `src/features/ai-consultant/components/ChatPanel.tsx`
- Modify: `src/features/inventory/ProductModal.tsx`
- Optional modify: `src/features/sales/POSPage.tsx`

**Entry points:**

1. In product context banner: button `Media Kit`
2. In product modal: button `AI Media`
3. Later in POS fitment chat: button for product marketing prompt

**First version:**

Only add it to `ChatPanel.tsx` when `selectedProduct` exists.

---

## Copy And Export UX

### Task 5.7: Build Prompt Copy Blocks

**Files:**
- Create: `src/features/ai-consultant/components/MediaKitPromptBlock.tsx`
- Modify: `ProductMediaKitModal.tsx`

**Features:**

- Copy button per prompt.
- Copy all image prompts.
- Copy all video prompts.
- Export JSON file.
- Mark favorite saved result.

**Expected behavior:**

The user never has to select text manually.

---

## Saved Results UX

### Task 5.8: List Saved Media Kits

**Files:**
- Modify: `ProductMediaKitModal.tsx`
- Add IPC use of `ai:mediaKit:list`, `ai:mediaKit:get`, `ai:mediaKit:favorite`, `ai:mediaKit:delete`

**Behavior:**

- Saved tab shows generated versions newest first.
- Clicking a saved kit loads it into result tabs.
- Favorite star pins the best one visually.
- Delete requires confirmation.

---

## Quality Enhancements For Best Results

### Task 5.9: Add Result Quality Scoring

**Files:**
- Create: `electron/services/media-kit-quality.service.ts`
- Test: `tests/media-kit-quality.service.test.ts`

**Score rules:**

Start at 100. Deduct:

- Missing video prompt: -20
- Missing negative prompt: -15
- Mentions split-screen/collage in positive prompt: -25
- Missing "single product" / "single angle" wording: -15
- Metal category with white background: -20
- Missing support solution: -10
- Missing camera motion for video: -10

**Return:**

```ts
{
  score: number;
  warnings: string[];
}
```

Show warnings in UI so the user knows why a prompt may produce weak results.

---

## Optional Future: Real Image/Video Generation

Do not implement in first pass unless explicitly requested.

Future channels:

- `ai:mediaKit:generateImage`
- `ai:mediaKit:generateVideo`

Possible providers:

- OpenAI image model
- Replicate
- RunComfy
- Local ComfyUI
- Kling/Runway/Luma manual export links

First pass should produce excellent prompts and save them. Actual generation can be added after the workflow is stable.

---

## Testing Strategy

### Unit Tests

Run focused tests:

```bash
npm run test -- tests/media-kit-prompt.service.test.ts
npm run test -- tests/media-kit.validator.test.ts
npm run test -- tests/media-kit-quality.service.test.ts
```

### Full Tests

```bash
npm run test
```

### Build

Always run:

```bash
npm run build
```

Expected: TypeScript passes before Vite build.

### Manual QA

1. Start app/dev environment.
2. Open AI consultant.
3. Open a product session with product images.
4. Click Media Kit.
5. Generate full kit.
6. Confirm JSON appears in tabs.
7. Copy image prompt.
8. Copy video prompt.
9. Save result.
10. Reload modal and confirm saved result remains.

---

## Recommended Execution Order

1. Media Kit types and validator.
2. Media Kit prompt builder.
3. Media Kit quality scoring.
4. Media Kit persistence table and handlers.
5. Media Kit modal UI.
6. ChatPanel entry point.
7. Prompt Studio extraction.
8. Agent Action Center.
9. Domain Skills.
10. Reliable JSON tool calling.

This order gives visible value fast while reducing risk.

---

## Commit Plan

Commit 1:

```bash
git add electron/services/media-kit.types.ts electron/services/media-kit.validator.ts tests/media-kit.validator.test.ts
git commit -m "feat(ai): add media kit result validation"
```

Commit 2:

```bash
git add electron/services/media-kit-prompt.service.ts tests/media-kit-prompt.service.test.ts
git commit -m "feat(ai): add product media kit prompt builder"
```

Commit 3:

```bash
git add electron/services/media-kit-quality.service.ts tests/media-kit-quality.service.test.ts
git commit -m "feat(ai): score media kit prompt quality"
```

Commit 4:

```bash
git add database electron tests
git commit -m "feat(ai): persist product media kits"
```

Commit 5:

```bash
git add src/features/ai-consultant electron/preload.ts
git commit -m "feat(ai): add product media kit workflow"
```

---

## Definition Of Done

- Product Media Kit can be opened from the AI consultant product context.
- User can generate a full kit from product data and images.
- Result includes image prompts, video prompts, negative prompts, marketing text, and quality checklist.
- Result can be copied and saved.
- Saved result can be reopened.
- New IPC channels are whitelisted in `electron/preload.ts`.
- Tests pass.
- `npm run build` passes.
