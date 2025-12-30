import { api, ecomApi } from "./api";
import {
  mockLeads,
  mockCustomers,
  mockDeals,
  mockActivities,
  mockProducts,
  mockCategories,
  mockSubcategories,
  mockInvoices,
  mockOrders,
  mockNotifications,
  mockUser,
} from "./mockData";

const USE_MOCK_DATA = false;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
};

export const authService = {
  async login(email: string, password: string) {
    let real_time: any = {};
    if (USE_MOCK_DATA) {
      await delay(500);
      if (email && password) {
        localStorage.setItem("auth_token", "mock-token-123");
        localStorage.setItem("user", JSON.stringify(mockUser));
        return {
          data: { user: mockUser, token: "mock-token-123" },
          error: undefined,
        };
      }
      return { error: "Invalid credentials", data: undefined };
    } else if (!USE_MOCK_DATA) {
      if (email && password) {
        real_time = await api.post("/user/login", { email, password });
        console.log("real_time", real_time);
        localStorage.setItem("auth_token", real_time.data.token);
        localStorage.setItem("user", JSON.stringify(real_time.data.user));
        return real_time;
      }
    }
    // return api.post('/user/login', { email, password });
  },

  async register(email: string, password: string, name: string) {
    if (USE_MOCK_DATA) {
      await delay(500);
      const newUser = { ...mockUser, email, name };
      localStorage.setItem("auth_token", "mock-token-123");
      localStorage.setItem("user", JSON.stringify(newUser));
      return {
        data: { user: newUser, token: "mock-token-123" },
        error: undefined,
      };
    }
    return api.post("/auth/register", { email, password, name });
  },

  async logout() {
    if (USE_MOCK_DATA) {
      await delay(300);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      return { data: { success: true }, error: undefined };
    } else if (!USE_MOCK_DATA) {
      const check_data = localStorage.getItem("auth_token");
      if (check_data) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        return { data: { success: true } };
      }
    }
  },

  getCurrentUser() {
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  },
};

export const leadsService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockLeads, error: undefined };
    }
    return api.get("/leads");
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newLead = {
        ...data,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      mockLeads.unshift(newLead);
      return { data: newLead, error: undefined };
    }
    return api.post("/leads", data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockLeads.findIndex((l) => l.id === id);
      if (index !== -1) {
        mockLeads[index] = { ...mockLeads[index], ...data };
        return { data: mockLeads[index] };
      }
      return { error: "Lead not found" };
    }
    return api.put(`/leads/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockLeads.findIndex((l) => l.id === id);
      if (index !== -1) {
        mockLeads.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: "Lead not found" };
    }
    return api.delete(`/leads/${id}`);
  },
};

export const customersService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockCustomers, error: undefined };
    }
    return api.get("/customers");
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newCustomer = {
        ...data,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      mockCustomers.unshift(newCustomer);
      return { data: newCustomer };
    }
    return api.post("/customers", data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockCustomers.findIndex((c) => c.id === id);
      if (index !== -1) {
        mockCustomers[index] = { ...mockCustomers[index], ...data };
        return { data: mockCustomers[index] };
      }
      return { error: "Customer not found" };
    }
    return api.put(`/customers/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockCustomers.findIndex((c) => c.id === id);
      if (index !== -1) {
        mockCustomers.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: "Customer not found" };
    }
    return api.delete(`/customers/${id}`);
  },

  async getOfflineCustomers() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: [] };
    }
    return api.get("/customers/offline");
  },
};

export const dealsService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockDeals, error: undefined };
    }
    return api.get("/deals");
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newDeal = {
        ...data,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      mockDeals.unshift(newDeal);
      return { data: newDeal };
    }
    return api.post("/deals", data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockDeals.findIndex((d) => d.id === id);
      if (index !== -1) {
        mockDeals[index] = { ...mockDeals[index], ...data };
        return { data: mockDeals[index] };
      }
      return { error: "Deal not found" };
    }
    return api.put(`/deals/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockDeals.findIndex((d) => d.id === id);
      if (index !== -1) {
        mockDeals.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: "Deal not found" };
    }
    return api.delete(`/deals/${id}`);
  },
};

export const activitiesService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockActivities, error: undefined };
    }
    return api.get("/activities");
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newActivity = {
        ...data,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      mockActivities.unshift(newActivity);
      return { data: newActivity };
    }
    return api.post("/activities", data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockActivities.findIndex((a) => a.id === id);
      if (index !== -1) {
        mockActivities[index] = { ...mockActivities[index], ...data };
        return { data: mockActivities[index] };
      }
      return { error: "Activity not found" };
    }
    return api.put(`/activities/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockActivities.findIndex((a) => a.id === id);
      if (index !== -1) {
        mockActivities.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: "Activity not found" };
    }
    return api.delete(`/activities/${id}`);
  },
};

export const productsService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockProducts, error: undefined };
    }
    return ecomApi.get<any>("all-products?query=crm");
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newProduct = {
        ...data,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      mockProducts.unshift(newProduct);
      return { data: newProduct };
    }
    return ecomApi.post("product-add", data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockProducts.findIndex((p) => p.id === id);
      if (index !== -1) {
        mockProducts[index] = { ...mockProducts[index], ...data };
        return { data: mockProducts[index] };
      }
      return { error: "Product not found" };
    }
    return ecomApi.put(`product-update/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockProducts.findIndex((p) => p.id === id);
      if (index !== -1) {
        mockProducts.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: "Product not found" };
    }
    return api.delete(`/product-delete/${id}`);
  },
};

export const categoriesService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockCategories, error: undefined };
    }
    return ecomApi.get<any>("allcategories");
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newCategory = { ...data, id: Date.now().toString() };
      mockCategories.unshift(newCategory);
      return { data: newCategory };
    }
    return api.post("/category-add", data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockCategories.findIndex((c) => c.id === id);
      if (index !== -1) {
        mockCategories[index] = { ...mockCategories[index], ...data };
        return { data: mockCategories[index] };
      }
      return { error: "Category not found" };
    }
    return api.put(`/category-update/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockCategories.findIndex((c) => c.id === id);
      if (index !== -1) {
        mockCategories.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: "Category not found" };
    }
    return api.delete(`/category/delete/${id}`);
  },
};

export const subcategoriesService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockSubcategories, error: undefined };
    }
    return ecomApi.get<any>("all-subcategories");
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newSubcategory = { ...data, id: Date.now().toString() };
      mockSubcategories.unshift(newSubcategory);
      return { data: newSubcategory };
    }
    return api.post("/subcategories", data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockSubcategories.findIndex((s) => s.id === id);
      if (index !== -1) {
        mockSubcategories[index] = { ...mockSubcategories[index], ...data };
        return { data: mockSubcategories[index] };
      }
      return { error: "Subcategory not found" };
    }
    return api.put(`/subcategories/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockSubcategories.findIndex((s) => s.id === id);
      if (index !== -1) {
        mockSubcategories.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: "Subcategory not found" };
    }
    return api.delete(`/subcategories/${id}`);
  },
};

export const invoicesService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockInvoices, error: undefined };
    }
    return await api.get("/admin/all-invoices");
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newInvoice = {
        ...data,
        id: Date.now().toString(),
        invoice_number: `INV-2025-${String(mockInvoices.length + 1).padStart(3, "0")}`,
        created_at: new Date().toISOString(),
      };

      mockInvoices.unshift(newInvoice);
      return { data: newInvoice, error: undefined };
    }
    return api.post("/create/invoice", data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockInvoices.findIndex((i) => i.id === id);
      if (index !== -1) {
        mockInvoices[index] = { ...mockInvoices[index], ...data };
        return { data: mockInvoices[index], error: undefined };
      }
      return { error: "Invoice not found", data: undefined };
    }
    return api.put(`/update/invoice/${id}`, data);
  },

  async fetchById(id: string) {
    const invoice = await api.get(`/invoice/${id}`);
    return invoice;
  },
  async fetchByPhone(number: number) {
    const invoice = await api.get(`/admin/invoice?phone=${number}`);
    return invoice;
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockInvoices.findIndex((i) => i.id === id);
      if (index !== -1) {
        mockInvoices.splice(index, 1);
        return { data: { success: true }, error: undefined };
      }
      return { error: "Invoice not found", data: undefined };
    }
    return api.delete(`/delete/invoice/${id}`);
  },

  async upsert(data: any) {
    return api.post("/create/invoice", data);
  },
};

export const ordersService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockOrders, error: undefined };
    }
    return ecomApi.get<any>("admin/orders", { headers });
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newOrder = {
        ...data,
        id: Date.now().toString(),
        order_number: `ORD-2025-${String(mockOrders.length + 1).padStart(3, "0")}`,
        created_at: new Date().toISOString(),
      };
      mockOrders.unshift(newOrder);
      return { data: newOrder };
    }

    return ecomApi.post("admin/orders", data);
  },

  async update(id: string, data: unknown) {
    return ecomApi.put(`admin/order/${id}`, data);
  },

  async delete(id: string) {
    return ecomApi.delete(`admin/order/${id}`);
  },
};

export const notificationsService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockNotifications, error: undefined };
    }
    return api.get("/notifications");
  },

  async markAsRead(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockNotifications.findIndex((n) => n.id === id);
      if (index !== -1) {
        mockNotifications[index].is_read = true;
        return { data: mockNotifications[index] };
      }
      return { error: "Notification not found" };
    }
    return api.put(`/notifications/${id}/read`, {});
  },

  async markAllAsRead() {
    if (USE_MOCK_DATA) {
      await delay(300);
      mockNotifications.forEach((n) => (n.is_read = true));
      return { data: { success: true } };
    }
    return api.put("/notifications/read-all", {});
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newNotification = {
        ...data,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      mockNotifications.unshift(newNotification);
      return { data: newNotification, error: undefined };
    }
    return api.post("/notifications", data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockNotifications.findIndex((n) => n.id === id);
      if (index !== -1) {
        mockNotifications.splice(index, 1);
        return { data: { success: true }, error: undefined };
      }
      return { error: "Notification not found", data: undefined };
    }
    return api.delete(`/notifications/${id}`);
  },
};

export const stockService = {
  async getAllStock() {
    return api.get("/all-stock");
  },
  async updateStock(id: string, data: any) {
    return api.put(`/update-stock/${id}`, data);
  },
  async deleteStock(id: string) {
    return api.delete(`/delete-stock/${id}`);
  },
  async addStock(data: any) {
    return api.post("/add-stock", data);
  },
};

export const blogService = {
  async getAllBlogs() {
    return ecomApi.get("all-blogs");
  },
  async updateBlog(id: string, data: any) {
    return ecomApi.put(`/update-blog/${id}`, data);
  },
  async deleteBlog(id: string) {
    return ecomApi.delete(`/delete-blog/${id}`);
  },
  async addBlog(data: any) {
    return ecomApi.post("/add-blog", data);
  },
};

export const customers = {};

export const quotationsService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      // mockQuotation data not strictly defined yet, but handling mock structure for consistency
      return { data: [], error: undefined };
    }
    return api.get("/admin/all-quotations");
  },

  async create(data: any) {
    return api.post("/create/quotation", data);
  },

  async update(id: string, data: any) {
    return api.put(`/update/quotation/${id}`, data);
  },

  async delete(id: string) {
    return api.delete(`/delete/quotation/${id}`);
  },
};
