TEST-CRM2

## API modes

- `npm run dev` (development) or `npm run dev -- --mode dev` uses `http://localhost:5300`.
- `npm run dev -- --mode prod` uses the existing production API at `https://api.aquakart.co.in`.
- `npm run build` defaults to production. Use `npm run build -- --mode dev` for a build that targets the local API.

CRM (`/v1/crm`), ecommerce (`/v1/`), and notification (`/v1/notify`) paths are preserved in both modes.

# Features & Components

| Feature                            | Component Name      | Destination                                 |
| :--------------------------------- | :------------------ | :------------------------------------------ |
| **Authentication**                 |                     |                                             |
| Login Page                         | `Login`             | `src/pages/Login.tsx`                       |
| Register Page                      | `Register`          | `src/pages/Register.tsx`                    |
| **Dashboard**                      |                     |                                             |
| Dashboard Layout                   | `Dashboard`         | `src/pages/Dashboard.tsx`                   |
| Dashboard Overview                 | `DashboardOverview` | `src/components/tabs/DashboardOverview.tsx` |
| **Core Features (Tabs)**           |                     |                                             |
| Leads Management                   | `LeadsTab`          | `src/components/tabs/LeadsTab.tsx`          |
| Customers Management               | `CustomersTab`      | `src/components/tabs/CustomersTab.tsx`      |
| Deals & Pipeline                   | `DealsTab`          | `src/components/tabs/DealsTab.tsx`          |
| Invoices & Billing                 | `InvoicesTab`       | `src/components/tabs/InvoicesTab.tsx`       |
| Quotations                         | `quotationsTab`     | `src/components/tabs/quotationsTab.jsx`     |
| Product Catalog                    | `ProductsTab`       | `src/components/tabs/ProductsTab.tsx`       |
| Agents Catalog (mirrors Products)  | `ProductsTab`       | `src/components/tabs/ProductsTab.tsx`       |
| Stock & Inventory                  | `StockTab`          | `src/components/tabs/StockTab.tsx`          |
| Orders Management                  | `OrdersTab`         | `src/components/tabs/OrdersTab.tsx`         |
| Activities & Tasks                 | `ActivitiesTab`     | `src/components/tabs/ActivitiesTab.tsx`     |
| Reports & Analytics                | `ReportsTab`        | `src/components/tabs/ReportsTab.tsx`        |
| Notifications                      | `NotificationsTab`  | `src/components/tabs/NotificationsTab.tsx`  |
| **Public Pages**                   |                     |                                             |
| Invoice View                       | `InvoicePage`       | `src/pages/InvoicePage.tsx`                 |
| Invoice Public Redirect            | `InvoiceRedirect`   | `src/pages/invoiceRedirect.tsx`             |
| **Minor Features / UI Components** |                     |                                             |
| Re-Login / Token Expiry Dialog     | `reLoginScreen`     | `src/components/reLoginScreen.tsx`          |
| Lock Screen Dialog                 | `LockScreen`        | `src/components/LockScreen.tsx`             |
| Glass UI Styling                   | `index.css`         | `src/index.css`                             |
| Toast Notifications                | `AquaToast`         | `src/components/AquaToast.tsx`              |
