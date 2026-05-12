# Agents Tab + Products Domain Documentation

## 1) App documentation

### Dashboard tabs

The dashboard now includes an **Agents** tab that mirrors the Products experience.

- Dashboard tab registry: `src/pages/Dashboard.tsx`
- `agents` tab is persisted in the same `activeTab` localStorage key as other tabs.
- Agents panel rendering currently reuses `ProductsTab`.

### Agents tab behavior

- Navigation label: `Agents`
- UI/component used: `ProductsTab`
- Functional scope inherited from Products:
  - Product list/create/edit/delete
  - Category list/create/edit/delete
  - Subcategory list/create/edit/delete

## 2) API documentation (frontend-to-backend routes)

The app uses two axios clients in `src/services/apiService.ts`:

- `api` → CRM/auth/invoice style endpoints
- `ecomApi` → product/catalog endpoints (Aquakart backend e-commerce domain)

### Products domain routes (used by Products + Agents tab)

#### Products CRUD

- `GET all-products?query=crm`
- `POST product-add`
- `PUT product-update/:id`
- `DELETE product-delete/:id`

#### Categories CRUD

- `GET allcategories`
- `POST category-add`
- `PUT category-update/:id`
- `DELETE category-delete/:id`

#### Subcategories CRUD

- `GET all-subcategories`
- `POST subcategory-add`
- `PUT subcategory-update/:id`
- `DELETE subcategory-delete/:id`

## 3) Category/Subcategory CRUD correctness notes

To keep category/subcategory operations functional and consistent with the Aquakart backend product domain, all category/subcategory write operations now use `ecomApi` and route naming that matches the existing product pattern (`*-add`, `*-update/:id`, `*-delete/:id`).

## 4) Source files

- `src/pages/Dashboard.tsx`
- `src/components/tabs/ProductsTab.tsx`
- `src/services/apiService.ts`
